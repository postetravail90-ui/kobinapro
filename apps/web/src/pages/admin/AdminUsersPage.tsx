import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Search, Shield, Ban, Trash2, KeyRound, Mail, Store, Clock, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  account_suspended?: boolean | null;
}

interface UserProfile {
  nom: string;
  commune: string | null;
  country_code: string | null;
  is_verified: boolean | null;
  photo_url: string | null;
}

interface UserDetail {
  user: UserRow;
  profile: UserProfile | null;
  role: string | null;
  commerces: { id: string; nom: string; type: string; statut: string }[];
  subscription: { plan_type: string; status: string; montant: number } | null;
  lastPresence: string | null;
}

type AdminActionResult = {
  ok?: boolean;
  error?: string;
  recovery_link?: string | null;
  email_masked?: string;
  suspended?: boolean;
  email_sent?: boolean;
  email_error?: string | null;
  resend_configured?: boolean;
};

async function invokeAdminAction(body: Record<string, unknown>): Promise<AdminActionResult> {
  const { data, error } = await supabase.functions.invoke('admin-user-actions', { body });
  if (error) {
    try {
      const ctx = error.context && (await error.context.json());
      return { error: (ctx as { error?: string })?.error || error.message };
    } catch {
      return { error: error.message };
    }
  }
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: string }).error === 'string') {
    return { error: (data as { error: string }).error };
  }
  return (data ?? {}) as AdminActionResult;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [recoveryMeta, setRecoveryMeta] = useState<string | null>(null);
  const [recoveryDelivery, setRecoveryDelivery] = useState<{
    email_sent: boolean;
    email_error: string | null;
    resend_configured: boolean;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Impossible de charger les utilisateurs');
    }
    setUsers((data as UserRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.phone?.includes(q)
      );
    }
    if (filterRole !== 'all') {
      list = list.filter((u) => (u.role || 'proprietaire') === filterRole);
    }
    return list;
  }, [users, search, filterRole]);

  const openUserDetail = async (row: UserRow) => {
    setDetailLoading(true);
    setDetailOpen(true);

    const [profileRes, roleRes, commercesRes, subRes, presenceRes, userRes] = await Promise.all([
      supabase.from('profiles').select('nom, commune, country_code, is_verified, photo_url').eq('id', row.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', row.id).maybeSingle(),
      supabase.from('commerces').select('id, nom, type, statut').eq('proprietaire_id', row.id),
      supabase
        .from('subscriptions')
        .select('plan_type, status, montant')
        .eq('proprietaire_id', row.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('user_presence').select('last_seen').eq('user_id', row.id).maybeSingle(),
      supabase.from('users').select('*').eq('id', row.id).maybeSingle(),
    ]);

    const fresh = userRes.data as UserRow | null;

    setSelectedUser({
      user: fresh || row,
      profile: profileRes.data,
      role: roleRes.data?.role || row.role || 'proprietaire',
      commerces: commercesRes.data || [],
      subscription: subRes.data,
      lastPresence: presenceRes.data?.last_seen || null,
    });
    setDetailLoading(false);
  };

  const refreshDetailUserRow = async () => {
    if (!selectedUser) return;
    const { data } = await supabase.from('users').select('*').eq('id', selectedUser.user.id).maybeSingle();
    if (data) {
      setSelectedUser((prev) => (prev ? { ...prev, user: data as UserRow } : null));
    }
    await load();
  };

  const targetId = selectedUser?.user.id;
  const isSelf = !!(currentUser && targetId && currentUser.id === targetId);
  const isTargetSuper = selectedUser?.role === 'super_admin';

  const sendRecovery = async () => {
    if (!targetId || isSelf) return;
    setActionLoading(true);
    const res = await invokeAdminAction({ action: 'send_password_recovery', target_user_id: targetId });
    setActionLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRecoveryLink(res.recovery_link ?? null);
    setRecoveryMeta(res.email_masked ?? null);
    setRecoveryDelivery({
      email_sent: !!res.email_sent,
      email_error: res.email_error ?? null,
      resend_configured: !!res.resend_configured,
    });
    setRecoveryOpen(true);

    if (res.email_sent) {
      toast.success('E-mail de réinitialisation envoyé.');
    } else if (res.resend_configured && res.email_error) {
      toast.warning(`L’e-mail n’a pas pu être envoyé : ${res.email_error}`);
    } else if (!res.resend_configured) {
      toast.info(
        'Envoi automatique non configuré (RESEND_API_KEY). Utilisez le lien dans la fenêtre pour le transmettre à l’utilisateur.'
      );
    } else {
      toast.success('Lien généré.');
    }
  };

  const toggleSuspend = async (next: boolean) => {
      if (!targetId || isSelf) return;
    if (isTargetSuper) {
      toast.error('Impossible de suspendre un super-administrateur');
      return;
    }
    setActionLoading(true);
    const res = await invokeAdminAction({ action: 'set_suspended', target_user_id: targetId, suspended: next });
    setActionLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? 'Compte suspendu' : 'Suspension levée');
    await refreshDetailUserRow();
  };

  const confirmDelete = async () => {
    if (!targetId || isSelf) return;
    setActionLoading(true);
    const res = await invokeAdminAction({ action: 'delete_user', target_user_id: targetId });
    setActionLoading(false);
    setDeleteConfirmOpen(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Compte supprimé');
    setDetailOpen(false);
    setSelectedUser(null);
    await load();
  };

  if (loading) return <div className="p-4"><SkeletonList count={6} /></div>;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s) au total</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="proprietaire">Propriétaire</SelectItem>
            <SelectItem value="gerant">Gérant</SelectItem>
            <SelectItem value="admin_staff">Admin délégué</SelectItem>
            <SelectItem value="super_admin">Super-admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur" description="Les utilisateurs apparaîtront ici" />
      ) : (
        <div className="space-y-2">
          {filtered.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-card rounded-xl p-4 border border-border cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => void openUserDetail(u)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || 'Sans nom'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.phone && <p className="text-[10px] text-muted-foreground">{u.phone}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {u.account_suspended && (
                    <span className="block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                      Suspendu
                    </span>
                  )}
                  <span className="block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {u.role || 'proprietaire'}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={detailOpen} onOpenChange={(v) => { if (!v) setDetailOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détails utilisateur</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            selectedUser && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {(selectedUser.profile?.nom || selectedUser.user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {selectedUser.profile?.nom || selectedUser.user.full_name || 'Sans nom'}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedUser.user.email}</p>
                  {selectedUser.user.phone && <p className="text-xs text-muted-foreground">{selectedUser.user.phone}</p>}
                </div>
              </div>

              <div className="bg-muted rounded-xl p-4 space-y-3">
                <InfoRow icon={Shield} label="Rôle" value={selectedUser.role || 'proprietaire'} />
                {selectedUser.user.account_suspended && (
                  <p className="text-xs text-destructive font-medium">Compte suspendu — connexion bloquée</p>
                )}
                <InfoRow icon={Mail} label="Email" value={selectedUser.user.email || '-'} />
                <InfoRow
                  icon={Clock}
                  label="Inscription"
                  value={selectedUser.user.created_at ? new Date(selectedUser.user.created_at).toLocaleDateString('fr-FR') : '-'}
                />
                <InfoRow
                  icon={Clock}
                  label="Dernière activité"
                  value={selectedUser.lastPresence ? new Date(selectedUser.lastPresence).toLocaleString('fr-FR') : '—'}
                />
                {selectedUser.profile?.commune && <InfoRow icon={Store} label="Commune" value={selectedUser.profile.commune} />}
                {selectedUser.profile?.country_code && <InfoRow icon={Store} label="Pays" value={selectedUser.profile.country_code} />}
              </div>

              {selectedUser.subscription && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Abonnement</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedUser.subscription.plan_type}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.subscription.status}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      {Number(selectedUser.subscription.montant).toLocaleString()} F
                    </p>
                  </div>
                </div>
              )}

              {selectedUser.commerces.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    Commerces ({selectedUser.commerces.length})
                  </p>
                  <div className="space-y-2">
                    {selectedUser.commerces.map((c) => (
                      <div key={c.id} className="bg-muted rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.type} · {c.statut}
                          </p>
                        </div>
                        <Store size={16} className="text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase">Actions administrateur</p>
                <p className="text-[11px] text-muted-foreground">
                  La suspension bloque la connexion immédiatement (session existante expirera au prochain chargement).
                </p>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-start gap-3"
                  disabled={actionLoading || isSelf}
                  onClick={() => void sendRecovery()}
                >
                  <KeyRound size={16} /> Envoyer l’e-mail de réinitialisation
                </Button>
                {selectedUser.user.account_suspended ? (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-3 text-primary"
                    disabled={actionLoading || isSelf || isTargetSuper}
                    onClick={() => void toggleSuspend(false)}
                  >
                    <CheckCircle2 size={16} /> Lever la suspension
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-3 text-warning"
                    disabled={actionLoading || isSelf || isTargetSuper}
                    onClick={() => void toggleSuspend(true)}
                  >
                    <Ban size={16} /> Suspendre le compte
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-11 justify-start gap-3 text-destructive"
                  disabled={actionLoading || isSelf || isTargetSuper}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 size={16} /> Supprimer le compte (auth + données liées)
                </Button>
              </div>
            </div>
            )
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={recoveryOpen}
        onOpenChange={(open) => {
          setRecoveryOpen(open);
          if (!open) setRecoveryDelivery(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialisation du mot de passe</DialogTitle>
          </DialogHeader>
          {recoveryMeta ? (
            <p className="text-sm text-muted-foreground">Compte : {recoveryMeta}</p>
          ) : null}
          {recoveryDelivery ? (
            <div className="space-y-2">
              {recoveryDelivery.email_sent ? (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
                >
                  Un e-mail contenant le lien a été envoyé à cette adresse. Le lien ci-dessous reste disponible en secours
                  (expiration rapide).
                </div>
              ) : recoveryDelivery.resend_configured && recoveryDelivery.email_error ? (
                <div
                  role="status"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                >
                  L’envoi automatique a échoué ({recoveryDelivery.email_error}). Copiez le lien ci-dessous et transmettez-le
                  par un canal sécurisé.
                </div>
              ) : !recoveryDelivery.resend_configured ? (
                <div
                  role="status"
                  className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
                >
                  Aucun service d’e-mail configuré côté serveur (secret RESEND_API_KEY). Copiez le lien ci-dessous et
                  transmettez-le à l’utilisateur ; il expire rapidement.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Copiez le lien et transmettez-le à l’utilisateur par un canal sécurisé (il expire rapidement).
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Copiez le lien et transmettez-le à l’utilisateur par un canal sécurisé (il expire rapidement).
            </p>
          )}
          {recoveryLink ? (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs break-all font-mono">{recoveryLink}</div>
          ) : (
            <p className="text-sm text-amber-600">Aucun lien retourné — vérifiez les logs de la fonction Edge.</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              onClick={() => {
                if (recoveryLink) {
                  void navigator.clipboard.writeText(recoveryLink);
                  toast.success('Lien copié');
                }
              }}
              disabled={!recoveryLink}
              className="gap-2"
            >
              <Copy size={16} /> Copier
            </Button>
            <Button onClick={() => setRecoveryOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action utilise l’API administrateur Supabase : la session et l’identité seront supprimées. Les enregistrements liés en base peuvent être supprimés selon les contraintes ON DELETE.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={actionLoading}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
