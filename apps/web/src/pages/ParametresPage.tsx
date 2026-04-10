import { motion } from 'framer-motion';
import { Copy, Gift, Star, Trophy, Target, User, Store, Bell, Shield, CreditCard, MessageSquare, Users, TrendingDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import kobinaLogo from '@/assets/kobina-logo.jpg';

export default function ParametresPage() {
  const { referralCode, userLevel, userPoints, badges } = useStore();

  const sections = [
    { label: 'Profil', icon: User, to: '#' },
    { label: 'Commerce', icon: Store, to: '#' },
    { label: 'Gérants', icon: Users, to: '/gerants' },
    { label: 'Dépenses', icon: TrendingDown, to: '/depenses' },
    { label: 'Messagerie', icon: MessageSquare, to: '/messages' },
    { label: 'Notifications', icon: Bell, to: '/app/notifications/settings' },
    { label: 'Sécurité', icon: Shield, to: '#' },
    { label: 'Abonnement', icon: CreditCard, to: '#' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://kobina.app/ref/${referralCode}`);
    toast.success('Lien copié !');
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>

      {/* Profile card */}
      <div className="bg-card card-float rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">K</div>
        <div>
          <p className="font-bold text-card-foreground">Kobina Commerce</p>
          <p className="text-sm text-muted-foreground">Propriétaire</p>
        </div>
      </div>

      {/* Gamification */}
      <div className="bg-card card-float rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-card-foreground flex items-center gap-2"><Star size={18} className="text-secondary" /> Progression</h2>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">Niv. {userLevel}</p>
            <p className="text-[10px] text-muted-foreground">Niveau</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">{userPoints}</p>
            <p className="text-[10px] text-muted-foreground">Points</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {badges.map(badge => (
            <span key={badge} className="bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
              <Trophy size={12} /> {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Referral */}
      <div className="bg-card card-float rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-card-foreground flex items-center gap-2"><Gift size={18} className="text-primary" /> Parrainage</h2>
        <div className="bg-muted rounded-xl p-3 flex items-center justify-between">
          <code className="text-sm font-bold text-foreground">{referralCode}</code>
          <button onClick={handleCopy} className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center touch-target">
            <Copy size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">kobina.app/ref/{referralCode}</p>
      </div>

      {/* Nav sections */}
      <div className="space-y-1">
        {sections.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <NavLink to={s.to} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors touch-target">
              <s.icon size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{s.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </div>

      {/* Footer logo */}
      <div className="flex justify-center pt-4 pb-8">
        <img src={kobinaLogo} alt="Kobina" className="h-10 opacity-40" />
      </div>
    </div>
  );
}
