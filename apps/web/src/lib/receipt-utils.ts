/**
 * Receipt utility functions: print, PDF download, share
 */

export interface ReceiptData {
  id: string;
  commerceName: string;
  commercePhone?: string;
  commerceAddress?: string;
  date: string;
  vendeur: string;
  type: 'cash' | 'mobile_money' | 'credit' | string;
  items: { nom: string; quantite: number; prixUnitaire: number; totalLigne: number }[];
  sousTotal: number;
  remise?: number;
  totalFinal: number;
  montantPaye?: number;
  reste?: number;
  isFree?: boolean;
}

/** Escape HTML to prevent XSS injection */
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'/]/g, (c) => map[c]);
}

/** Generate a receipt number from id + date */
export function receiptNumber(id: string, date: string): string {
  const d = new Date(date);
  const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `REC-${prefix}-${id.slice(0, 6).toUpperCase()}`;
}

/** Format payment type label */
export function paymentLabel(type: string): string {
  switch (type) {
    case 'cash': return 'Cash';
    case 'mobile_money': return 'Mobile Money';
    case 'credit': return 'Crédit';
    case 'full': return 'Payé';
    case 'half': return 'Moitié';
    default: return escapeHtml(type);
  }
}

/** Safe number formatting */
function safeNumber(n: number): string {
  return Number(n).toLocaleString();
}

/** Build the print-ready HTML for a receipt — all user data is escaped */
function buildReceiptHTML(data: ReceiptData): string {
  const recNo = escapeHtml(receiptNumber(data.id, data.date));
  const d = new Date(data.date);
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const commerceName = escapeHtml(data.commerceName);
  const commercePhone = data.commercePhone ? escapeHtml(data.commercePhone) : '';
  const commerceAddress = data.commerceAddress ? escapeHtml(data.commerceAddress) : '';
  const vendeur = escapeHtml(data.vendeur);
  const payType = paymentLabel(data.type);

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:4px 0;font-size:12px;text-align:left">${escapeHtml(item.nom)}</td>
      <td style="padding:4px 0;font-size:12px;text-align:center">${safeNumber(item.quantite)}</td>
      <td style="padding:4px 0;font-size:12px;text-align:right">${safeNumber(item.prixUnitaire)}</td>
      <td style="padding:4px 0;font-size:12px;text-align:right;font-weight:600">${safeNumber(item.totalLigne)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu ${recNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',-apple-system,system-ui,sans-serif;width:80mm;margin:0 auto;padding:8mm 4mm;color:#111;background:#fff}
  .sep{border-top:1px dashed #ccc;margin:8px 0}
  .center{text-align:center}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;text-transform:uppercase;color:#888;padding:4px 0;border-bottom:1px solid #eee}
  .total-row td{font-weight:700;padding-top:6px;font-size:13px}
  .footer{font-size:10px;color:#888;text-align:center;margin-top:12px}
  @media print{body{width:auto;padding:0 2mm}@page{margin:0;size:80mm auto}}
</style></head><body>
<div class="center">
  <h2 style="font-size:16px;font-weight:800;margin-bottom:2px">${commerceName}</h2>
  ${commercePhone ? `<p style="font-size:11px;color:#666">${commercePhone}</p>` : ''}
  ${commerceAddress ? `<p style="font-size:10px;color:#888">${commerceAddress}</p>` : ''}
</div>
<div class="sep"></div>
<table><tr>
  <td style="font-size:11px"><strong>Reçu:</strong> ${recNo}</td>
  <td style="font-size:11px;text-align:right">${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</td>
</tr><tr>
  <td style="font-size:11px"><strong>Vendeur:</strong> ${vendeur}</td>
  <td style="font-size:11px;text-align:right"><strong>${payType}</strong></td>
</tr></table>
<div class="sep"></div>
<table>
  <thead><tr><th style="text-align:left">Produit</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="sep"></div>
<table>
  <tr><td style="font-size:12px">Sous-total</td><td style="font-size:12px;text-align:right">${safeNumber(data.sousTotal)} F</td></tr>
  ${data.remise ? `<tr><td style="font-size:12px">Remise</td><td style="font-size:12px;text-align:right;color:#e53e3e">-${safeNumber(data.remise)} F</td></tr>` : ''}
  <tr class="total-row"><td style="font-size:15px">TOTAL</td><td style="font-size:15px;text-align:right">${safeNumber(data.totalFinal)} FCFA</td></tr>
  ${data.montantPaye != null ? `<tr><td style="font-size:12px">Payé</td><td style="font-size:12px;text-align:right">${safeNumber(data.montantPaye)} F</td></tr>` : ''}
  ${data.reste ? `<tr><td style="font-size:12px;color:#d69e2e">Reste</td><td style="font-size:12px;text-align:right;color:#d69e2e">${safeNumber(data.reste)} F</td></tr>` : ''}
</table>
<div class="sep"></div>
<p class="footer" style="font-size:11px;margin-bottom:4px">Merci pour votre confiance 🙏</p>
${data.isFree ? '<p class="footer" style="font-size:9px;opacity:0.6">Propulsé par KOBINA PRO</p>' : ''}
</body></html>`;
}

/** Print receipt via a new window */
export function printReceipt(data: ReceiptData) {
  const html = buildReceiptHTML(data);
  const w = window.open('', '_blank', 'width=350,height=600');
  if (!w) {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => {
      w.print();
      w.onafterprint = () => w.close();
    }, 200);
  };
}

/** Download receipt as PDF (via print to PDF) */
export function downloadReceiptPDF(data: ReceiptData) {
  printReceipt(data);
}

/** Share receipt via Web Share API or fallback */
export async function shareReceipt(data: ReceiptData) {
  const recNo = receiptNumber(data.id, data.date);
  const text = `Reçu ${recNo}\n${data.commerceName}\n\nTotal: ${data.totalFinal.toLocaleString()} FCFA\nDate: ${new Date(data.date).toLocaleDateString('fr-FR')}\nPaiement: ${paymentLabel(data.type)}\n\nMerci pour votre confiance !`;

  if (navigator.share) {
    await navigator.share({ title: `Reçu ${recNo}`, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}
