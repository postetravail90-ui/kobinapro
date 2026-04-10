import { receiptNumber, paymentLabel, type ReceiptData } from '@/lib/receipt-utils';
import { Separator } from '@/components/ui/separator';
import kobinaLogo from '@/assets/kobina-pro-logo.png';

interface BrandingData {
  logo_url?: string | null;
  display_name?: string | null;
  phone?: string | null;
  address?: string | null;
  footer_message?: string | null;
}

interface Props {
  data: ReceiptData;
  branding?: BrandingData | null;
  isFreePlan?: boolean;
  className?: string;
}

export default function BrandedReceiptCard({ data, branding, isFreePlan = false, className = '' }: Props) {
  const recNo = receiptNumber(data.id, data.date);
  const d = new Date(data.date);
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // Determine display values based on subscription
  const showCustomBranding = !isFreePlan && branding;
  const displayName = showCustomBranding && branding?.display_name ? branding.display_name : data.commerceName;
  const displayPhone = showCustomBranding && branding?.phone ? branding.phone : data.commercePhone;
  const displayAddress = showCustomBranding && branding?.address ? branding.address : data.commerceAddress;
  const footerMessage = showCustomBranding && branding?.footer_message ? branding.footer_message : 'Merci pour votre confiance 🙏';
  const logoUrl = showCustomBranding && branding?.logo_url ? branding.logo_url : null;

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 text-center">
        {logoUrl && (
          <img src={logoUrl} alt={displayName} className="h-12 mx-auto mb-2 object-contain rounded-lg" />
        )}
        <h3 className="text-lg font-extrabold text-foreground">{displayName}</h3>
        {displayPhone && <p className="text-xs text-muted-foreground">{displayPhone}</p>}
        {displayAddress && <p className="text-[10px] text-muted-foreground">{displayAddress}</p>}
      </div>

      <Separator />

      {/* Info */}
      <div className="px-5 py-3 grid grid-cols-2 gap-y-1.5 text-xs">
        <div>
          <span className="text-muted-foreground">Reçu</span>
          <p className="font-semibold text-foreground">{recNo}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Date</span>
          <p className="font-semibold text-foreground">{dateStr} · {timeStr}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Vendeur</span>
          <p className="font-medium text-foreground">{data.vendeur}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Paiement</span>
          <p className="font-semibold text-foreground">{paymentLabel(data.type)}</p>
        </div>
      </div>

      <Separator />

      {/* Items */}
      <div className="px-5 py-3">
        <div className="flex text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <span className="flex-1">Produit</span>
          <span className="w-10 text-center">Qté</span>
          <span className="w-16 text-right">P.U.</span>
          <span className="w-20 text-right">Total</span>
        </div>
        {data.items.map((item, i) => (
          <div key={i} className="flex items-center py-1.5 text-sm">
            <span className="flex-1 truncate text-foreground">{item.nom}</span>
            <span className="w-10 text-center text-muted-foreground">{item.quantite}</span>
            <span className="w-16 text-right text-muted-foreground">{item.prixUnitaire.toLocaleString()}</span>
            <span className="w-20 text-right font-semibold text-foreground">{item.totalLigne.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Totals */}
      <div className="px-5 py-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span className="text-foreground">{data.sousTotal.toLocaleString()} F</span>
        </div>
        {data.remise != null && data.remise > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remise</span>
            <span className="text-destructive">-{data.remise.toLocaleString()} F</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-extrabold">
          <span className="text-foreground">TOTAL</span>
          <span className="text-foreground">{data.totalFinal.toLocaleString()} FCFA</span>
        </div>
        {data.montantPaye != null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payé</span>
            <span className="text-foreground">{data.montantPaye.toLocaleString()} F</span>
          </div>
        )}
        {data.reste != null && data.reste > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-warning">Reste</span>
            <span className="text-warning font-semibold">{data.reste.toLocaleString()} F</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="px-5 py-4 text-center">
        <p className="text-sm text-muted-foreground">{footerMessage}</p>
        {isFreePlan && (
          <div className="flex items-center justify-center gap-1.5 mt-2 opacity-50">
            <img src={kobinaLogo} alt="KOBINA PRO" className="h-4 object-contain" />
            <span className="text-[10px] text-muted-foreground">Propulsé par KOBINA PRO</span>
          </div>
        )}
      </div>
    </div>
  );
}
