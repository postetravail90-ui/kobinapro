import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Headphones, Search, Filter, ChevronRight, Clock, AlertTriangle,
  CheckCircle2, MessageSquare, User, Send, ArrowLeft, TrendingUp,
  Zap, BarChart3, X
} from 'lucide-react';

type Priority = Database['public']['Enums']['ticket_priority'];
type Status = Database['public']['Enums']['ticket_status'];
type Category = Database['public']['Enums']['ticket_category'];
type Ticket = Database['public']['Tables']['support_tickets']['Row'];
type TicketMessage = Database['public']['Tables']['ticket_messages']['Row'];
type TicketUpdate = Database['public']['Tables']['support_tickets']['Update'];

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critique', color: 'text-destructive', bg: 'bg-destructive/10' },
  high: { label: 'Haute', color: 'text-warning', bg: 'bg-warning/10' },
  normal: { label: 'Normale', color: 'text-info', bg: 'bg-info/10' },
  low: { label: 'Basse', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const statusConfig: Record<Status, { label: string; color: string; bg: string }> = {
  open: { label: 'Ouvert', color: 'text-destructive', bg: 'bg-destructive/10' },
  pending: { label: 'En attente', color: 'text-warning', bg: 'bg-warning/10' },
  in_progress: { label: 'En cours', color: 'text-info', bg: 'bg-info/10' },
  resolved: { label: 'Résolu', color: 'text-primary', bg: 'bg-primary/10' },
  closed: { label: 'Fermé', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const categoryLabels: Record<Category, string> = {
  technical_issue: 'Technique',
  payment_issue: 'Paiement',
  account_problem: 'Compte',
  bug_report: 'Bug',
  general_question: 'Général',
};

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setTickets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoadingMessages(false);
  };

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    setSending(true);
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: replyText.trim(),
      is_agent: true,
    });
    if (!error) {
      // Update ticket status to in_progress if open
      if (selectedTicket.status === 'open') {
        await supabase.from('support_tickets')
          .update({ status: 'in_progress', assigned_agent: user.id })
          .eq('id', selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: 'in_progress', assigned_agent: user.id });
      }
      setReplyText('');
      loadMessages(selectedTicket.id);
      toast.success('Réponse envoyée');
    } else {
      toast.error('Erreur lors de l\'envoi');
    }
    setSending(false);
  };

  const updateTicketStatus = async (status: Status) => {
    if (!selectedTicket) return;
    const updates: TicketUpdate = { status };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    await supabase.from('support_tickets').update(updates).eq('id', selectedTicket.id);
    setSelectedTicket({ ...selectedTicket, ...updates });
    loadTickets();
    toast.success(`Ticket marqué comme ${statusConfig[status].label}`);
  };

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.subject.toLowerCase().includes(q) || t.message.toLowerCase().includes(q) || t.id.includes(q);
      }
      return true;
    });
  }, [tickets, filterStatus, filterPriority, search]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
      critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length,
      today: tickets.filter(t => t.created_at.startsWith(today)).length,
    };
  }, [tickets]);

  if (loading) return <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>;

  // Detail view
  if (selectedTicket) {
    const p = priorityConfig[selectedTicket.priority];
    const s = statusConfig[selectedTicket.status];
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour aux tickets
        </button>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">{selectedTicket.subject}</h2>
              <p className="text-xs text-muted-foreground mt-1 font-mono">#{selectedTicket.id.slice(0, 8)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{selectedTicket.message}</p>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">{categoryLabels[selectedTicket.category]}</span>
            <span className="bg-muted px-2 py-1 rounded">{new Date(selectedTicket.created_at).toLocaleString('fr-FR')}</span>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex flex-wrap gap-2">
          {(['in_progress', 'resolved', 'closed'] as Status[]).map(st => (
            <button key={st} onClick={() => updateTicketStatus(st)} disabled={selectedTicket.status === st}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${selectedTicket.status === st ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}
            >
              {statusConfig[st].label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            <span className="font-semibold text-sm text-foreground">Conversation</span>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {loadingMessages ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune réponse encore</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_agent ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.is_agent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    <p>{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${msg.is_agent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Reply input */}
          {selectedTicket.status !== 'closed' && (
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                placeholder="Écrire une réponse…"
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
              <button onClick={sendReply} disabled={sending || !replyText.trim()}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-opacity">
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground">Gestion des tickets de support</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total tickets', value: stats.total, icon: Headphones, color: 'bg-primary/10 text-primary' },
          { label: 'Ouverts', value: stats.open, icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
          { label: 'Résolus', value: stats.resolved, icon: CheckCircle2, color: 'bg-primary/10 text-primary' },
          { label: 'Critiques', value: stats.critical, icon: Zap, color: 'bg-warning/10 text-warning' },
          { label: "Aujourd'hui", value: stats.today, icon: TrendingUp, color: 'bg-info/10 text-info' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un ticket…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | 'all')}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
          <option value="all">Tous statuts</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
          <option value="all">Toutes priorités</option>
          {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Ticket list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Headphones size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun ticket trouvé</p>
          </div>
        ) : (
          filtered.map((ticket, i) => {
            const p = priorityConfig[ticket.priority];
            const s = statusConfig[ticket.status];
            return (
              <motion.button key={ticket.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => openTicket(ticket)}
                className="w-full bg-card rounded-xl border border-border p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ticket.priority === 'critical' ? 'bg-destructive animate-pulse' : ticket.priority === 'high' ? 'bg-warning' : 'bg-muted-foreground/30'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.bg} ${p.color} shrink-0`}>{p.label}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${s.bg} ${s.color} shrink-0`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">{categoryLabels[ticket.category]}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                      <span className="font-mono">#{ticket.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
