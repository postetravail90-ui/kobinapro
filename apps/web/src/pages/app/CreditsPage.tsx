import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { getCredits } from '@/lib/data/credits';
import { getProfileDisplayName } from '@/lib/data/profile';
import { payCredit, queueOfflineCreditPayment } from '@/services/sales';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { CreditCard, AlertCircle, User, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/BackButton';
import { toUiErrorMessage } from '@/lib/ui-errors';

interface Credit {
  id: string;
  montant_restant: number;
  total_amount: number;
  total_paid: number;
  client_name: string;
  created_by_name: string;
  promise_date: string | null;
  statut: string;
  date_echeance: string | null;
  created_at: string;
  sync_status?: string;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { commerceIds } = useCommerceIds();
  const isOnline = useOnlineStatus();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadCredits = async () => {
    if (!user) return;
    try {
      if (commerceIds.length === 0) {
        setCredits([]);
        return;
      }
      const data = await getCredits(commerceIds);
      setCredits(data as Credit[]);
    } catch (err: unknown) {
      toast.error(toUiErrorMessage(err, 'Impossible de charger les credits'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCredits(); }, [user, commerceIds.join(',')]);

  const handlePayCredit = async (creditId: string) => {
    const amount = parseInt(payAmount) || 0;
    const credit = credits.find(c => c.id === creditId);
    if (!credit) return;

    if (amount <= 0) { toast.error('Montant invalide'); return; }
    if (amount > Number(credit.montant_restant)) {
      toast.error('Le montant payé ne peut pas dépasser le solde restant.');
      return;
    }

    setProcessing(true);
    try {
      let userName = user?.email || 'unknown';
      if (isOnline) {
        const nom = await getProfileDisplayName(user!.id);
        if (nom) userName = nom;
      }

      if (!isOnline) {
        await queueOfflineCreditPayment({
          creditId,
          amount,
          userId: user!.id,
          userName,
        });
        toast.success('Paiement enregistré hors ligne', {
          description: 'En attente de synchronisation — il sera envoyé au serveur au retour du réseau.',
        });
      } else {
        await payCredit({ creditId, amount, userId: user!.id, userName });
        const isFullyPaid = amount >= Number(credit.montant_restant);
        toast.success(isFullyPaid ? 'Crédit soldé avec succès !' : 'Paiement du crédit enregistré avec succès.');
      }
      setPayingId(null);
      setPayAmount('');
      if (isOnline) await loadCredits();
    } catch (err: unknown) {
      toast.error(toUiErrorMessage(err, 'Erreur lors du paiement du credit'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  const activeCredits = credits.filter(c => c.statut !== 'paye');
  const paidCredits = credits.filter(c => c.statut === 'paye');

  const CreditList = ({ items }: { items: Credit[] }) => (
    items.length === 0 ? (
      <EmptyState icon={CreditCard} title="Aucun crédit" description="Les crédits clients apparaîtront ici" />
    ) : (
      <div className="space-y-3">
        {items.map((c, i) => {
          const remaining = Number(c.montant_restant);
          const totalAmt = Number(c.total_amount);
          const paid = Number(c.total_paid);
          const isOverdue = c.date_echeance && new Date(c.date_echeance) < new Date() && c.statut !== 'paye';
          const createdDate = new Date(c.created_at);

          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-card rounded-xl p-4 border ${isOverdue ? 'border-destructive/30' : 'border-border'}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    c.statut === 'paye' ? 'bg-success/10 text-success' : isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  }`}>
                    {c.statut === 'paye' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-muted-foreground" />
                      <p className="font-bold text-foreground text-sm">{c.client_name || 'Client inconnu'}</p>
                      {c.sync_status === 'pending' && (
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 shrink-0" title="Sync en attente" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total: {totalAmt.toLocaleString()} F
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  c.statut === 'paye' ? 'bg-success/15 text-success' :
                  isOverdue ? 'bg-destructive/15 text-destructive' :
                  paid > 0 ? 'bg-warning/15 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {c.statut === 'paye' ? 'Payé' : paid > 0 ? 'Partiel' : 'Non payé'}
                </span>
              </div>

              {/* Amounts */}
              {c.statut !== 'paye' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-muted rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Déjà payé</p>
                    <p className="text-sm font-bold text-success">{paid.toLocaleString()} F</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Solde restant</p>
                    <p className="text-sm font-bold text-destructive">{remaining.toLocaleString()} F</p>
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-2">
                {c.promise_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> Promesse: {new Date(c.promise_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {createdDate.toLocaleDateString('fr-FR')} à {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Signature */}
              <p className="text-[10px] text-muted-foreground border-t border-border pt-2 mt-2">
                Réalisé par : <span className="font-semibold text-foreground">{c.created_by_name || '—'}</span>
                {' · '}{createdDate.toLocaleDateString('fr-FR')} · {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Pay button */}
              {c.statut !== 'paye' && (
                <div className="mt-3">
                  <AnimatePresence>
                    {payingId === c.id ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Input
                          type="number"
                          placeholder={`Montant (max ${remaining.toLocaleString()} F)`}
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          className="h-11"
                          autoFocus
                        />
                        {payAmount && parseInt(payAmount) > remaining && (
                          <p className="text-xs text-destructive">Le montant ne peut pas dépasser le solde restant.</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setPayingId(null); setPayAmount(''); }}
                            className="flex-1"
                          >
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePayCredit(c.id)}
                            disabled={processing || !payAmount || parseInt(payAmount) <= 0}
                            className="flex-1"
                          >
                            {processing ? 'En cours...' : 'Confirmer'}
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPayingId(c.id); setPayAmount(''); }}
                        className="w-full"
                      >
                        💰 Enregistrer un paiement
                      </Button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    )
  );

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <div>
        <h1 className="text-xl font-bold text-foreground">Crédits</h1>
        <p className="text-sm text-muted-foreground">{activeCredits.length} crédit{activeCredits.length > 1 ? 's' : ''} en cours</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">En cours ({activeCredits.length})</TabsTrigger>
          <TabsTrigger value="paid">Payés ({paidCredits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active"><CreditList items={activeCredits} /></TabsContent>
        <TabsContent value="paid"><CreditList items={paidCredits} /></TabsContent>
      </Tabs>
    </div>
  );
}
