import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import kobinaLogo from '@/assets/kobina-logo.jpg';
import { motion } from 'framer-motion';
import PhoneInput from '@/components/auth/PhoneInput';
import { normalizePhone } from '@/lib/phone';
import { fetchUserRole } from '@/lib/auth-role';
import { useAuth } from '@/contexts/AuthContext';
import { ensureOnlineOrThrow, toAuthUiError } from '@/lib/auth-errors';
import { withUiTimeout } from '@/lib/async-timeout';
import { REGISTER_FLOW_MAX_MS } from '@/lib/network-timeouts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function waitForRole(userId: string, attempts = 12, delayMs = 400) {
  const deadline = Date.now() + 12_000;
  for (let i = 0; i < attempts && Date.now() < deadline; i++) {
    const r = await fetchUserRole(userId);
    if (r) return r;
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return null;
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    nom: '',
    commune: '',
    numero: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const submitLock = useRef(false);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const passwordChecks = [
    { label: '6 caractères minimum', valid: form.password.length >= 6 },
    {
      label: 'Confirmation identique',
      valid: form.password === form.confirm && form.confirm.length > 0,
    },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || loading) return;

    const email = form.email.trim();
    if (!form.nom.trim() || !email || !form.password) {
      toast.error('Remplissez les champs obligatoires');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast.error('Adresse e-mail invalide');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      await withUiTimeout(
        (async () => {
          await ensureOnlineOrThrow();
          const phone = normalizePhone(form.numero);
          const origin = typeof window !== 'undefined' ? window.location.origin : '';

          const { data, error } = await supabase.auth.signUp({
            email,
            password: form.password,
            options: {
              emailRedirectTo: origin ? `${origin}/auth/login` : undefined,
              data: {
                nom: form.nom.trim(),
                commune: form.commune.trim(),
                numero: phone,
              },
            },
          });

          if (error) {
            toast.error(toAuthUiError(error, "Erreur lors de l'inscription"));
            return;
          }

          if (!data.user) {
            toast.error('Inscription impossible pour le moment');
            return;
          }

          if (data.session) {
            const uid = data.user.id;
            const { error: pErr } = await supabase.from('profiles').upsert(
              {
                id: uid,
                nom: form.nom.trim(),
                commune: form.commune.trim() || null,
                numero: phone || null,
              },
              { onConflict: 'id' }
            );

            if (pErr) {
              console.error('[Register] profiles:', pErr);
              toast.error('Compte créé mais profil incomplet. Complétez-le dans Paramètres.');
            }

            const role = await waitForRole(uid);
            await refreshRole();

            if (!role) {
              toast.error(
                'Rôle non attribué encore. Vérifiez les triggers SQL (profil → user_roles) ou reconnectez-vous.'
              );
              navigate('/auth/login', { replace: true });
              return;
            }

            toast.success('Inscription réussie ! Bienvenue sur Kobina PRO.');
            navigate('/app', { replace: true });
            return;
          }

          toast.info('Vérifiez votre boîte mail', {
            description:
              'Si aucun mail n’arrive : désactivez « Confirm email » dans Supabase → Authentication → Providers → Email.',
          });
          navigate('/auth/login', { replace: true });
        })(),
        REGISTER_FLOW_MAX_MS,
        'Inscription'
      );
    } catch (err: unknown) {
      toast.error(toAuthUiError(err, "Erreur lors de l'inscription"));
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <motion.img
            src={kobinaLogo}
            alt="Kobina"
            className="h-20 w-20 rounded-2xl mx-auto mb-4 object-cover"
            animate={{
              boxShadow: [
                '0 0 0px hsl(145 63% 42% / 0)',
                '0 0 30px hsl(145 63% 42% / 0.3)',
                '0 0 0px hsl(145 63% 42% / 0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mt-1">14 jours d&apos;essai gratuit inclus — compte propriétaire</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom complet *</Label>
            <Input
              placeholder="Amadou Diallo"
              value={form.nom}
              onChange={(e) => update('nom', e.target.value)}
              className="h-12"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Commune</Label>
            <Input
              placeholder="Cocody"
              value={form.commune}
              onChange={(e) => update('commune', e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <PhoneInput value={form.numero} onChange={(v) => update('numero', v)} />
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="h-12"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Mot de passe *</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 caractères"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="h-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirmer le mot de passe *</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              className="h-12"
              autoComplete="new-password"
            />
          </div>

          {form.password.length > 0 && (
            <div className="space-y-1">
              {passwordChecks.map((c) => (
                <div
                  key={c.label}
                  className={`flex items-center gap-2 text-xs ${
                    c.valid ? 'text-success' : 'text-muted-foreground'
                  }`}
                >
                  <Check size={12} /> {c.label}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            S&apos;inscrire gratuitement
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link to="/auth/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
