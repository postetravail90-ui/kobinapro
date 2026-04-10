import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProductSalesHistory } from '@/lib/data/sales';
import { adjustStock } from '@/lib/data/stock';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Pencil, Trash2, History, Loader2, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { CachedProduct } from '@/hooks/useProducts';

interface SaleRecord {
  id: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
  created_at: string;
}

interface SalesStats {
  totalVendu: number;
  ventesAujourdhui: number;
  ventesSemaine: number;
  ventesMois: number;
  records: SaleRecord[];
}

interface Props {
  product: CachedProduct | null;
  open: boolean;
  onClose: () => void;
  onEdit: (p: CachedProduct) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function ProductDetailSheet({ product, open, onClose, onEdit, onDelete, onRefresh }: Props) {
  const { role } = useAuth();
  const isOwner = role === 'proprietaire' || role === 'super_admin';
  const [showHistory, setShowHistory] = useState(false);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stockAdd, setStockAdd] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowHistory(false);
      setSalesStats(null);
      setStockAdd('');
    }
  }, [open]);

  const loadSalesHistory = async () => {
    if (!product) return;
    setLoadingHistory(true);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const records = await getProductSalesHistory(product.id);
    const totalVendu = records.reduce((s, r) => s + (r.quantite || 0), 0);
    const ventesAujourdhui = records.filter(r => r.created_at >= todayStart).reduce((s, r) => s + (r.quantite || 0), 0);
    const ventesSemaine = records.filter(r => r.created_at >= weekStart).reduce((s, r) => s + (r.quantite || 0), 0);
    const ventesMois = records.filter(r => r.created_at >= monthStart).reduce((s, r) => s + (r.quantite || 0), 0);

    setSalesStats({ totalVendu, ventesAujourdhui, ventesSemaine, ventesMois, records });
    setShowHistory(true);
    setLoadingHistory(false);
  };

  const handleAddStock = async () => {
    if (!product || !stockAdd) return;
    setSavingStock(true);
    const delta = Number(stockAdd);
    try {
      await adjustStock(product.id, delta, 'fiche_produit');
      toast.success(`Stock mis à jour: ${product.stock + delta}`);
      setStockAdd('');
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSavingStock(false);
    }
  };

  if (!product) return null;

  const beneficeUnitaire = product.prix - product.prix_achat;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl overflow-y-auto pb-32">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Package size={24} className="text-accent-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{product.nom}</p>
                <p className="text-xs text-muted-foreground">{product.categorie || 'Sans catégorie'}</p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Product Info */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <InfoRow label="Prix de vente" value={`${Number(product.prix).toLocaleString()} FCFA`} highlight />
              {isOwner && (
                <>
                  <InfoRow label="Prix d'achat" value={`${Number(product.prix_achat).toLocaleString()} FCFA`} />
                  <InfoRow label="Bénéfice unitaire" value={`${beneficeUnitaire.toLocaleString()} FCFA`} highlight={beneficeUnitaire > 0} danger={beneficeUnitaire < 0} />
                </>
              )}
              <InfoRow label="Stock actuel" value={`${product.stock} ${product.unite || 'pièce(s)'}`} danger={product.stock <= 5} />
              <InfoRow label="Catégorie" value={product.categorie || '-'} />
              {product.code_barre && <InfoRow label="Code barre" value={product.code_barre} />}
              <InfoRow label="Unité" value={product.unite || 'pièce'} />
            </div>

            {/* Quick stock add */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Ajouter du stock</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Quantité à ajouter"
                  value={stockAdd}
                  onChange={e => setStockAdd(e.target.value)}
                  className="h-11"
                />
                <Button onClick={handleAddStock} disabled={savingStock || !stockAdd} className="h-11 px-6">
                  {savingStock ? <Loader2 size={16} className="animate-spin" /> : '+'}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={loadSalesHistory} disabled={loadingHistory}>
                {loadingHistory ? <Loader2 size={16} className="animate-spin" /> : <History size={16} />}
                Voir historique des ventes
              </Button>

              {isOwner && (
                <>
                  <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={() => { onClose(); onEdit(product); }}>
                    <Pencil size={16} /> Modifier le produit
                  </Button>
                  <Button variant="outline" className="w-full h-12 justify-start gap-3 text-destructive hover:text-destructive" onClick={() => { onClose(); onDelete(product.id); }}>
                    <Trash2 size={16} /> Supprimer le produit
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sales History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Historique ventes — {product.nom}
            </DialogTitle>
          </DialogHeader>

          {salesStats && (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Total vendu" value={salesStats.totalVendu} />
                <StatBox label="Aujourd'hui" value={salesStats.ventesAujourdhui} />
                <StatBox label="Cette semaine" value={salesStats.ventesSemaine} />
                <StatBox label="Ce mois" value={salesStats.ventesMois} />
              </div>

              {/* Sales list */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Dernières ventes</p>
                {salesStats.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune vente enregistrée</p>
                ) : (
                  salesStats.records.slice(0, 20).map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="flex items-center justify-between bg-muted rounded-lg px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(r.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">×{r.quantite}</p>
                        <p className="text-xs text-primary font-bold">{(r.prix_unitaire * r.quantite).toLocaleString()} F</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${danger ? 'text-destructive' : highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted rounded-lg p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
