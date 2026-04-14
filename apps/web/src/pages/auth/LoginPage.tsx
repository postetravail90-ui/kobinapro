import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import kobinaLogo from '@/assets/kobina-logo.jpg';
import { motion } from 'framer-motion';
import PhoneInput from '@/components/auth/PhoneInput';
import { normalizePhone } from '@/lib/phone';
import { fetchUserRole } from '@/lib/auth-role';
import { isAccountSuspended } from '@/lib/account-suspended';
import { ensureOnlineOrThrow, toAuthUiError } from '@/lib/auth-errors';
import { withUiTimeout } from '@/lib/async-timeout';
import { LOGIN_FLOW_MAX_MS, SIGN_IN_MAX_MS, ROLE_RESOLVE_MAX_MS } from '@/lib/network-timeouts';
import { writeLocalUserProfile } from '@/lib/auth/localUserProfileCache';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const navigate = useNavigate();
  const submitLock = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || loading) return;

    if (!identifier || !password) {
      toast.error('Remplissez tous les champs');
      return;
    }

    submitLock.current = true;
    setLoading(true);

    try {
      await withUiTimeout(
        (async () => {
          await ensureOnlineOrThrow();
          let email = identifier.trim();

          if (!usePhone && !EMAIL_RE.test(email)) {
            toast.error('Adresse e-mail invalide');
            return;
          }

          if (!email.includes('@')) {
            const phone = normalizePhone(identifier);

            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email, phone')
              .eq('phone', phone)
              .limit(1)
              .maybeSingle();

            if (userError) throw userError;

            if (!userData?.email) {
              toast.error('Numéro non trouvé');
              return;
            }

            email = userData.email;
          }

          email = email.trim().toLowerCase();

          const { data, error } = await withUiTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            SIGN_IN_MAX_MS,
            'Authentification'
          );

          if (error) {
            console.error('[Auth] signInWithPassword:', error.message);
            toast.error(toAuthUiError(error, 'Erreur lors de la connexion'));
            return;
          }

          if (!data.user) return;
          writeLocalUserProfile(data.user);

          const suspended = await withUiTimeout(
            isAccountSuspended(data.user.id),
            Math.min(25_000, ROLE_RESOLVE_MAX_MS),
            'Verification du compte'
          ).catch(() => false);

          if (suspended) {
            await supabase.auth.signOut();
            toast.error('Ce compte est suspendu. Contactez le support.');
            return;
          }

          let resolvedRole: Awaited<ReturnType<typeof fetchUserRole>>;
          try {
            resolvedRole = await withUiTimeout(
              fetchUserRole(data.user.id),
              ROLE_RESOLVE_MAX_MS,
              'Chargement du profil'
            );
          } catch {
            toast.error(
              'Le profil met trop longtemps a charger (reseau lent ou serveur occupe). Reessayez dans un instant ou en Wi-Fi.'
            );
            await supabase.auth.signOut();
            return;
          }

          if (!resolvedRole) {
            toast.error('Compte sans rôle assigné. Contactez le support.');
            await supabase.auth.signOut();
            return;
          }

          toast.success('Connexion réussie ! 🎉');

          if (resolvedRole === 'super_admin' || resolvedRole === 'admin_staff') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/app', { replace: true });
          }
        })(),
        LOGIN_FLOW_MAX_MS,
        'Connexion'
      );
    } catch (err: unknown) {
      toast.error(toAuthUiError(err, 'Erreur lors de la connexion'));
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
        className="w-full max-w-sm space-y-8"
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
          <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accédez à votre espace Kobina
          </p>
        </div>

        <div className="flex bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setUsePhone(false);
              setIdentifier('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              !usePhone
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setUsePhone(true);
              setIdentifier('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              usePhone
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Téléphone
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">
              {usePhone ? 'Numéro de téléphone' : 'Email'}
            </Label>
            {usePhone ? (
              <PhoneInput value={identifier} onChange={setIdentifier} />
            ) : (
              <Input
                id="identifier"
                type="email"
                placeholder="votre@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
                className="h-12"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12"
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

          <div className="text-right">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary font-medium hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to="/auth/register" className="text-primary font-medium hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </motion.div>
    </div>
  );
}