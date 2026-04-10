import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ensureOnlineOrThrow, toAuthUiError } from '@/lib/auth-errors';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/auth/login');
    }
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Min. 6 caractères'); return; }
    if (password !== confirm) { toast.error('Mots de passe différents'); return; }
    setLoading(true);
    try {
      await ensureOnlineOrThrow();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(toAuthUiError(error, 'Erreur lors de la mise a jour'));
      } else {
        toast.success('Mot de passe mis a jour');
        navigate('/app');
      }
    } catch (err: unknown) {
      toast.error(toAuthUiError(err, 'Erreur lors de la mise a jour'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
        </div>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 caractères" />
          </div>
          <div className="space-y-2">
            <Label>Confirmer</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2" size={20} />}
            Mettre à jour
          </Button>
        </form>
      </div>
    </div>
  );
}
