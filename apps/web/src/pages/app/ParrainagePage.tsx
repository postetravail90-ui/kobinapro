import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referral_code: string;
  statut: string;
  bonus_montant: number;
  paye: boolean;
}

export default function ParrainagePage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('referrals').select('*').eq('parrain_id', user.id).then(({ data }) => {
      setReferrals(data || []);
      setLoading(false);
    });
  }, [user]);

  const myCode = referrals[0]?.referral_code || 'N/A';
  const totalBonus = referrals.reduce((s, r) => s + Number(r.bonus_montant), 0);
  const bonusPaye = referrals.filter(r => r.paye).reduce((s, r) => s + Number(r.bonus_montant), 0);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://yivano.app/ref/${myCode}`);
    toast.success('Lien copié !');
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=Rejoins%20Yivano%20avec%20mon%20code%20${myCode}%20!%20https://yivano.app/ref/${myCode}`, '_blank');
  };

  if (loading) return <div className="p-4"><SkeletonList count={2} /></div>;

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-foreground">Parrainage</h1>

      {/* Code card */}
      <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
        <Gift size={32} className="text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Ton code de parrainage</p>
        <p className="text-3xl font-bold text-foreground tracking-wider">{myCode}</p>
        <div className="flex gap-3 justify-center">
          <Button size="sm" variant="outline" onClick={copyLink}><Copy size={14} className="mr-1" /> Copier</Button>
          <Button size="sm" onClick={shareWhatsApp}><Share2 size={14} className="mr-1" /> WhatsApp</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Filleuls" value={referrals.length} icon={Gift} color="bg-primary/10 text-primary" />
        <StatCard label="Bonus total" value={`${totalBonus} F`} icon={Gift} color="bg-warning/10 text-warning" />
        <StatCard label="Bonus payé" value={`${bonusPaye} F`} icon={Gift} color="bg-success/10 text-success" />
      </div>
    </div>
  );
}
