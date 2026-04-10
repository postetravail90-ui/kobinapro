import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { ShieldPlus, Trash2, UserCog, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ScopesRow = Database['public']['Tables']['admin_staff_scopes']['Row'];

const SCOPE_FIELDS: { key: keyof Pick<
  ScopesRow,
  | 'scope_dashboard'
  | 'scope_users'
  | 'scope_commerces'
  | 'scope_billing'
  | 'scope_analytics'
  | 'scope_fraude'
  | 'scope_security'
  | 'scope_support'
  | 'scope_logs'
  | 'scope_settings'
  | 'scope_monitoring'
>; label: string }[] = [
  { key: 'scope_dashboard', label: 'Tableau de bord' },
  { key: 'scope_users', label: 'Utilisateurs' },
  { key: 'scope_commerces', label: 'Commerces & catalogue' },
  { key: 'scope_billing', label: 'Abonnements & facturation' },
  { key: 'scope_analytics', label: 'Analytics' },
  { key: 'scope_fraude', label: 'Fraude' },
  { key: 'scope_security', label: 'Sécurité' },
  { key: 'scope_support', label: 'Support' },
  { key: 'scope_logs', label: 'Logs & audit' },
  { key: 'scope_settings', label: 'Paramètres plateforme' },
  { key: 'scope_monitoring', label: 'Monitoring' },
];

export default function AdminTeamPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<(ScopesRow & { email?: string | null; full_name?: string | null })[]>([]);
  const [candidates, setCandidates] = useState<{ id: string; email: string | null; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUserId, setNewUserId] = useState<string>('');
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SCOPE_FIELDS.map((s) => [s.key, s.key === 'scope_dashboard']))
  );

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: rows } = await supabase.from('admin_staff_scopes').select('*').order('updated_at', { ascending: false });

    const withEmail = await Promise.all(
      (rows || []).map(async (r) => {
        const { data: u } = await supabase.from('users').select('email, full_name').eq('id', r.user_id).maybeSingle();
        return { ...r, email: u?.email, full_name: u?.full_name } as ScopesRow & { email?: string | null; full_name?: string | null };
      })
    );
    setMembers(withEmail);

    const { data: allUsers } = await supabase.from('users').select('id, email, full_name').order('created_at', { ascending: false }).limit(500);

    const staffIds = new Set((rows || []).map((r) => r.user_id));
    staffIds.add(user.id);

    setCandidates((allUsers || []).filter((u) => !staffIds.has(u.id)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (role !== 'super_admin') return;
    void load();
  }, [role, load]);

  if (role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  const toggleFlag = (key: string) => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
  };

  const addMember = async () => {
    if (!newUserId) {
      toast.error('Choisissez un utilisateur');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_upsert_staff_member', {
      _user_id: newUserId,
      _scope_dashboard: !!flags.scope_dashboard,
      _scope_users: !!flags.scope_users,
      _scope_commerces: !!flags.scope_commerces,
      _scope_billing: !!flags.scope_billing,
      _scope_analytics: !!flags.scope_analytics,
      _scope_fraude: !!flags.scope_fraude,
      _scope_security: !!flags.scope_security,
      _scope_support: !!flags.scope_support,
      _scope_logs: !!flags.scope_logs,
      _scope_settings: !!flags.scope_settings,
      _scope_monitoring: !!flags.scope_monitoring,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Administrateur délégué enregistré');
    setNewUserId('');
    await load();
  };

  const removeMember = async (uid: string) => {
    if (!confirm('Retirer cet administrateur de l’équipe ? Le compte n’aura plus de rôle applicatif jusqu’à réattribution.')) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_remove_staff_member', { _user_id: uid });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Membre retiré');
    await load();
  };

  if (loading) return <div className="p-4"><SkeletonList count={4} /></div>;

  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UserCog className="w-6 h-6" />
          Équipe d’administration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Déléguez des accès précis au tableau de bord. Seul le super-admin peut gérer cette page. Les comptes délégués ne voient que les sections autorisées.
        </p>
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <ShieldPlus size={16} />
          Ajouter un administrateur délégué
        </h2>
        <p className="text-xs text-muted-foreground">
          L’utilisateur doit déjà exister. Son ancien rôle (ex. propriétaire) sera remplacé par « administrateur délégué » — utilisez de préférence des comptes dédiés.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Utilisateur</Label>
            <Select value={newUserId || undefined} onValueChange={setNewUserId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCOPE_FIELDS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={!!flags[s.key]} onCheckedChange={() => toggleFlag(s.key)} />
              {s.label}
            </label>
          ))}
        </div>
        <Button onClick={() => void addMember()} disabled={saving || !newUserId} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold">Membres actuels</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun délégué pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
                <div>
                  <p className="text-sm font-medium">{m.email || m.user_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {SCOPE_FIELDS.filter((s) => m[s.key]).map((s) => s.label).join(' · ') || 'Aucun périmètre'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive gap-1"
                  disabled={saving}
                  onClick={() => void removeMember(m.user_id)}
                >
                  <Trash2 size={14} /> Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
