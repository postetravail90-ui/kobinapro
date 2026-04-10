import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import kobinaLogo from '@/assets/kobina-logo.jpg';
import { motion } from 'framer-motion';
import { ensureOnlineOrThrow, toAuthUiError } from '@/lib/auth-errors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Entrez votre email'); return; }
    setLoading(true);
    try {
      await ensureOnlineOrThrow();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(toAuthUiError(error, 'Erreur lors de lenvoi du lien'));
      } else {
        setSent(true);
        toast.success('Lien envoye !');
      }
    } catch (err: unknown) {
      toast.error(toAuthUiError(err, 'Erreur lors de lenvoi du lien'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={kobinaLogo} alt="Yivano" className="h-14 w-14 rounded-2xl mx-auto mb-4 object-cover" />
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground mt-1">Recevez un lien de réinitialisation</p>
        </div>

        {sent ? (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center text-sm text-foreground">
            Un lien a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading && <Loader2 className="animate-spin mr-2" size={20} />}
              Envoyer le lien
            </Button>
          </form>
        )}

        <Link to="/auth/login" className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
          <ArrowLeft size={16} /> Retour à la connexion
        </Link>
      </motion.div>
    </div>
  );
}
