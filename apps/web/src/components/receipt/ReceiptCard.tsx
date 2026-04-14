import { receiptNumber, paymentLabel, type ReceiptData } from '@/lib/receipt-utils';
import { Separator } from '@/components/ui/separator';
import kobinaLogo from '@/assets/kobina-pro-logo.png';

interface Props {
  data: ReceiptData;
  className?: string;
}

export default function ReceiptCard({ data, className = '' }: Props) {
  const recNo = receiptNumber(data.id, data.date);
  const d = new Date(data.date);
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 text-center">
        <h3 className="text-lg font-extrabold text-foreground">{data.commerceName}</h3>
        {data.commercePhone && (
          <p className="text-xs text-muted-foreground">{data.commercePhone}</p>
        )}
        {data.commerceAddress && (
          <p className="text-[10px] text-muted-foreground">{data.commerceAddress}</p>
        )}
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
        <p className="text-sm text-muted-foreground">Merci pour votre confiance 🙏</p>
        {data.isFree && (
          <div className="flex items-center justify-center gap-1.5 mt-2 opacity-50">
            <img src={kobinaLogo} alt="KOBINA PRO" className="h-4 object-contain" loading="lazy" decoding="async" />
            <span className="text-[10px] text-muted-foreground">Propulsé par KOBINA PRO</span>
          </div>
        )}
      </div>
    </div>
  );
}
