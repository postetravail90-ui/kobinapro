import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendPushToUser, showInAppNotification } from '@/lib/push-notifications';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  commerce_id: string;
  message: string;
  type: 'text' | 'image' | 'voice';
  media_url: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface ChatContact {
  user_id: string;
  name: string;
  is_online: boolean;
  last_seen: string | null;
  commerce_name: string;
  commerce_id: string;
}

export function useMessages(commerceIds: string[]) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load contacts (gerants for owner, owner for gerant)
  const loadContacts = useCallback(async () => {
    if (!user || commerceIds.length === 0) { setLoading(false); return; }

    try {
      // Get gerants for these commerces
      const { data: gerants } = await supabase
        .from('gerants')
        .select('user_id, commerce_id, actif')
        .in('commerce_id', commerceIds)
        .eq('actif', true);

      // Get commerce owners
      const { data: commerces } = await supabase
        .from('commerces')
        .select('id, nom, proprietaire_id')
        .in('id', commerceIds);

      if (!gerants || !commerces) { setLoading(false); return; }

      const userIds = new Set<string>();
      const contactMap = new Map<string, { commerce_id: string; commerce_name: string }>();

      // For each gerant, add them as contact (if not self)
      for (const g of gerants) {
        if (g.user_id !== user.id) {
          userIds.add(g.user_id);
          const c = commerces.find(c => c.id === g.commerce_id);
          contactMap.set(g.user_id, { commerce_id: g.commerce_id, commerce_name: c?.nom || '' });
        }
      }

      // For each commerce, add owner as contact (if not self)
      for (const c of commerces) {
        if (c.proprietaire_id !== user.id) {
          userIds.add(c.proprietaire_id);
          contactMap.set(c.proprietaire_id, { commerce_id: c.id, commerce_name: c.nom });
        }
      }

      if (userIds.size === 0) { setContacts([]); setLoading(false); return; }

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom')
        .in('id', Array.from(userIds));

      // Get presence
      const { data: presences } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen')
        .in('user_id', Array.from(userIds));

      const presenceMap = new Map(presences?.map(p => [p.user_id, p]) || []);

      const contactsList: ChatContact[] = Array.from(userIds).map(uid => {
        const profile = profiles?.find(p => p.id === uid);
        const presence = presenceMap.get(uid);
        const info = contactMap.get(uid)!;
        return {
          user_id: uid,
          name: profile?.nom || 'Utilisateur',
          is_online: presence?.is_online || false,
          last_seen: presence?.last_seen || null,
          commerce_name: info.commerce_name,
          commerce_id: info.commerce_id,
        };
      });

      setContacts(contactsList);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [user, commerceIds.join(',')]);

  // Load messages for selected contact
  const loadMessages = useCallback(async () => {
    if (!user || !selectedContact) { setMessages([]); return; }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.user_id}),and(sender_id.eq.${selectedContact.user_id},receiver_id.eq.${user.id})`)
      .eq('commerce_id', selectedContact.commerce_id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) setMessages(data as ChatMessage[]);

    // Mark received messages as read
    if (data?.length) {
      const unreadIds = data
        .filter(m => m.receiver_id === user.id && m.status !== 'read')
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ status: 'read' })
          .in('id', unreadIds);
      }
    }
  }, [user, selectedContact]);

  // Count unread
  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .neq('status', 'read');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  }, [user]);

  // Send message
  const sendMessage = useCallback(async (text: string, type: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string) => {
    if (!user || !selectedContact) return;

    const newMsg = {
      sender_id: user.id,
      receiver_id: selectedContact.user_id,
      commerce_id: selectedContact.commerce_id,
      message: text,
      type,
      media_url: mediaUrl || null,
      status: 'sent',
    };

    const { data, error } = await supabase.from('messages').insert(newMsg).select().single();
    if (error) throw error;
    if (data) {
      setMessages(prev => [...prev, data as ChatMessage]);
      // Send push notification to receiver
      sendPushToUser(
        selectedContact.user_id,
        'Nouveau message',
        text.substring(0, 100),
        { type: 'message', commerce_id: selectedContact.commerce_id }
      ).catch(() => {});
    }
  }, [user, selectedContact]);

  // Update presence
  const updatePresence = useCallback(async () => {
    if (!user) return;
    await supabase.from('user_presence').upsert({
      user_id: user.id,
      is_online: true,
      last_seen: new Date().toISOString(),
    });
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (selectedContact && msg.sender_id === selectedContact.user_id) {
          setMessages(prev => [...prev, msg]);
          // Mark as read immediately
          supabase.from('messages').update({ status: 'read' }).eq('id', msg.id).then();
        } else {
          // Show in-app notification for messages from non-selected contacts
          showInAppNotification('Nouveau message', msg.message.substring(0, 80));
        }
        loadUnreadCounts();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContact]);

  // Presence heartbeat
  useEffect(() => {
    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    const handleBeforeUnload = () => {
      if (user) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`,
          JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (user) {
        supabase.from('user_presence').upsert({
          user_id: user.id,
          is_online: false,
          last_seen: new Date().toISOString(),
        }).then();
      }
    };
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { loadUnreadCounts(); }, [loadUnreadCounts]);

  return {
    contacts,
    messages,
    selectedContact,
    setSelectedContact,
    sendMessage,
    loading,
    unreadCounts,
  };
}
