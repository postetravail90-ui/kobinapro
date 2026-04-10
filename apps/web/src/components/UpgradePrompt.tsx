import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  message: string;
  compact?: boolean;
}

export default function UpgradePrompt({ message, compact }: UpgradePromptProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        onClick={() => navigate('/app/abonnements')}
        className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2 text-sm text-foreground w-full"
      >
        <Crown size={14} className="text-warning shrink-0" />
        <span className="flex-1 text-left text-xs">{message}</span>
        <ArrowRight size={14} className="text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
          <Crown size={20} className="text-warning" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Passez à une formule supérieure pour continuer.</p>
        </div>
      </div>
      <Button size="sm" onClick={() => navigate('/app/abonnements')} className="w-full">
        <Crown size={14} className="mr-2" /> Voir les formules
      </Button>
    </div>
  );
}
