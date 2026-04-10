import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, Send, ArrowLeft, Smile, Image as ImageIcon,
  Mic, MicOff, Check, CheckCheck, Circle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useMessages, type ChatContact, type ChatMessage } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Lazy emoji picker
let EmojiPicker: any = null;
let emojiData: any = null;

export default function MessagesPage() {
  const { user } = useAuth();
  const { commerceIds } = useCommerceIds();
  const {
    contacts, messages, selectedContact, setSelectedContact,
    sendMessage, loading, unreadCounts
  } = useMessages(commerceIds);

  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load emoji picker lazily
  const loadEmojiPicker = useCallback(async () => {
    if (!EmojiPicker) {
      const [pickerModule, dataModule] = await Promise.all([
        import('@emoji-mart/react'),
        import('@emoji-mart/data'),
      ]);
      EmojiPicker = pickerModule.default;
      emojiData = dataModule.default;
    }
    setShowEmoji(prev => !prev);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input.trim());
      setInput('');
      setShowEmoji(false);
    } catch {
      toast.error('Erreur envoi message');
    } finally {
      setSending(false);
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setSending(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
      await sendMessage('📷 Image', 'image', urlData.publicUrl);
    } catch {
      toast.error("Erreur upload image");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 100) return;

        setSending(true);
        try {
          const path = `${user!.id}/voice_${Date.now()}.webm`;
          const { error } = await supabase.storage.from('chat-media').upload(path, blob);
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
          await sendMessage('🎤 Message vocal', 'voice', urlData.publicUrl);
        } catch {
          toast.error("Erreur envoi vocal");
        } finally {
          setSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      toast.error("Impossible d'accéder au micro");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'read') return <CheckCheck size={14} className="text-sky-500" />;
    if (status === 'delivered') return <CheckCheck size={14} className="text-muted-foreground" />;
    return <Check size={14} className="text-muted-foreground" />;
  };

  const formatMsgTime = (date: string) =>
    new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // ====== CONTACT LIST VIEW ======
  if (!selectedContact) {
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">💬 Messages</h1>
          <p className="text-sm text-muted-foreground">Conversations propriétaire ↔ gérants</p>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : contacts.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageCircle}
                title="Aucun contact"
                description="Ajoutez des gérants à vos commerces pour commencer à discuter."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map(contact => (
                <motion.button
                  key={contact.user_id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedContact(contact)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    {contact.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground truncate">{contact.name}</p>
                      {unreadCounts[contact.user_id] > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                          {unreadCounts[contact.user_id]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.commerce_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {contact.is_online
                        ? '🟢 En ligne'
                        : contact.last_seen
                          ? `Vu ${new Date(contact.last_seen).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}`
                          : 'Hors ligne'
                      }
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // ====== CHAT VIEW ======
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      {/* Chat header */}
      <div className="p-3 border-b border-border flex items-center gap-3 bg-card">
        <button onClick={() => setSelectedContact(null)} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {selectedContact.name.charAt(0).toUpperCase()}
          </div>
          {selectedContact.is_online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{selectedContact.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {selectedContact.is_online
              ? 'En ligne'
              : selectedContact.last_seen
                ? `Vu à ${new Date(selectedContact.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Hors ligne'
            }
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {/* Image */}
                  {msg.type === 'image' && msg.media_url && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      <img
                        src={msg.media_url}
                        alt="Image"
                        className="rounded-lg max-w-full max-h-48 object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}

                  {/* Voice */}
                  {msg.type === 'voice' && msg.media_url && (
                    <audio controls src={msg.media_url} className="max-w-full h-8" preload="none" />
                  )}

                  {/* Text (skip default media labels) */}
                  {(msg.type === 'text' || (msg.message !== '📷 Image' && msg.message !== '🎤 Message vocal')) && msg.type === 'text' && (
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  )}

                  {/* Time + status */}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {formatMsgTime(msg.created_at)}
                    </span>
                    {isMine && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && EmojiPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <EmojiPicker
              data={emojiData}
              onEmojiSelect={(emoji: any) => setInput(prev => prev + emoji.native)}
              locale="fr"
              theme="auto"
              previewPosition="none"
              skinTonePosition="none"
              set="native"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="p-3 border-t border-border bg-card">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {recording ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-xl px-4 py-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Enregistrement {formatTime(recordingTime)}</span>
            </div>
            <Button size="icon" variant="destructive" className="h-11 w-11 rounded-xl shrink-0" onClick={stopRecording}>
              <MicOff size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadEmojiPicker}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Smile size={20} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ImageIcon size={20} />
            </button>
            <Input
              placeholder="Écrire un message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 h-11 rounded-xl"
              disabled={sending}
            />
            {input.trim() ? (
              <Button
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={handleSend}
                disabled={sending}
              >
                <Send size={18} />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="secondary"
                className="h-11 w-11 rounded-xl shrink-0"
                onPointerDown={startRecording}
              >
                <Mic size={18} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
