import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Printer, Download, Share2, X } from 'lucide-react';
import { printReceipt, downloadReceiptPDF, shareReceipt, type ReceiptData } from '@/lib/receipt-utils';
import BrandedReceiptCard from './BrandedReceiptCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export default function ReceiptSheet({ open, onClose, data }: Props) {
  const { user } = useAuth();
  const sub = useSubscription();
  const [branding, setBranding] = useState<any>(null);

  // Load branding when sheet opens
  useEffect(() => {
    if (!open || !user) return;
    const loadBranding = async () => {
      const { data: comms } = await supabase.from('commerces').select('id').eq('proprietaire_id', user.id).limit(1);
      const commerceId = comms?.[0]?.id;
      if (!commerceId) {
        // Try as gerant
        const { data: gerantData } = await supabase.from('gerants').select('commerce_id').eq('user_id', user.id).eq('actif', true).limit(1);
        const gCommId = gerantData?.[0]?.commerce_id;
        if (gCommId) {
          const { data: b } = await supabase.from('commerce_branding' as any).select('*').eq('commerce_id', gCommId).maybeSingle() as any;
          setBranding(b);
        }
        return;
      }
      const { data: b } = await supabase.from('commerce_branding' as any).select('*').eq('commerce_id', commerceId).maybeSingle() as any;
      setBranding(b);
    };
    loadBranding();
  }, [open, user]);

  if (!data) return null;

  const handlePrint = () => {
    try {
      // Inject branding into receipt data for printing if paid plan
      const printData = !sub.isFreePlan && branding ? {
        ...data,
        commerceName: branding.display_name || data.commerceName,
        commercePhone: branding.phone || data.commercePhone,
        commerceAddress: branding.address || data.commerceAddress,
        isFree: false,
      } : { ...data, isFree: sub.isFreePlan };
      printReceipt(printData);
    } catch {
      toast.error('Impossible d\'imprimer pour le moment');
    }
  };

  const handleDownload = () => {
    try {
      const printData = !sub.isFreePlan && branding ? {
        ...data,
        commerceName: branding.display_name || data.commerceName,
        commercePhone: branding.phone || data.commercePhone,
        commerceAddress: branding.address || data.commerceAddress,
        isFree: false,
      } : { ...data, isFree: sub.isFreePlan };
      downloadReceiptPDF(printData);
    } catch {
      toast.error('Impossible de générer le PDF');
    }
  };

  const handleShare = async () => {
    try {
      const shareData = !sub.isFreePlan && branding ? {
        ...data,
        commerceName: branding.display_name || data.commerceName,
      } : data;
      await shareReceipt(shareData);
      toast.success(navigator.share ? 'Partagé !' : 'Copié dans le presse-papier !');
    } catch {
      toast.error('Partage impossible');
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90dvh] rounded-t-3xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-2 flex-row items-center justify-between">
          <SheetTitle className="text-lg font-bold">Reçu</SheetTitle>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <BrandedReceiptCard
            data={data}
            branding={branding}
            isFreePlan={sub.isFreePlan}
            className="shadow-lg"
          />
        </div>

        <div className="p-4 border-t border-border grid grid-cols-3 gap-2 safe-area-bottom">
          <button
            onClick={handlePrint}
            className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Printer size={18} /> Imprimer
          </button>
          <button
            onClick={handleDownload}
            className="h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Download size={18} /> PDF
          </button>
          <button
            onClick={handleShare}
            className="h-12 rounded-xl bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform border border-border"
          >
            <Share2 size={18} /> Partager
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
