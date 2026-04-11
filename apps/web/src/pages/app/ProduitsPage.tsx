import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useProducts, type CachedProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Loader2, Search, ScanBarcode, Camera, Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ProductDetailSheet from '@/components/products/ProductDetailSheet';
import BackButton from '@/components/BackButton';
import { parsePrixInput } from '@/lib/prix-input';
import { createProduct, updateProduct } from '@/lib/data/products';
import type { Html5Qrcode } from 'html5-qrcode';

export default function ProduitsPage() {
  const { user, role } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCommerceIds();
  const isOwner = role === 'proprietaire' || role === 'super_admin';
  const { products, loading: productsLoading, refresh } = useProducts(commerceIds, { hideCosting: !isOwner });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', prix: '', prix_achat: '', stock: '', categorie: '', code_barre: '', unite: 'piece' });
  const [editId, setEditId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CachedProduct | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // USB barcode scanner
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleBarcodeScanned = useCallback((code: string) => {
    // Normalize barcode
    const normalized = code.trim().replace(/[^\w-]/g, '');
    console.debug('[Stock Scan] code:', normalized);

    const existing = products.find(p => {
      if (!p.code_barre) return false;
      return p.code_barre.trim().replace(/[^\w-]/g, '') === normalized;
    });

    if (existing) {
      setEditId(existing.id);
      setForm({
        nom: existing.nom,
        prix: String(existing.prix),
        prix_achat: String(existing.prix_achat || 0),
        stock: String(existing.stock),
        categorie: existing.categorie || '',
        code_barre: existing.code_barre || '',
        unite: existing.unite || 'piece',
      });
      setOpen(true);
      toast.info(`Produit trouvé: ${existing.nom}`);
    } else {
      setEditId(null);
      setForm({ nom: '', prix: '', prix_achat: '', stock: '', categorie: '', code_barre: normalized, unite: 'piece' });
      setOpen(true);
      toast.info(`Nouveau code barre: ${normalized}`);
    }
  }, [products]);

  // Listen for USB scanner keypresses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        handleBarcodeScanned(barcodeBuffer.current);
        barcodeBuffer.current = '';
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScanned]);

  const startCameraScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          handleBarcodeScanned(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const handleSave = async () => {
    if (commerceLoading) {
      toast.info('Chargement de votre espace…');
      return;
    }
    if (commerceIds.length === 0) {
      toast.error('Connexion requise pour synchroniser votre commerce, ou patientez quelques secondes.');
      return;
    }
    const nom = form.nom.trim();
    const prixParsed = parsePrixInput(form.prix);
    if (!nom) {
      toast.error('Le nom du produit est requis.');
      return;
    }
    if (prixParsed === null) {
      toast.error('Indiquez un prix de vente valide (nombre, ex. 1500 ou 1500,50).');
      return;
    }
    setSaving(true);

    const payload = {
      nom,
      prix: prixParsed,
      prix_achat: parsePrixInput(form.prix_achat) ?? 0,
      stock: Number(form.stock) || 0,
      categorie: form.categorie || null,
      code_barre: form.code_barre || null,
      unite: form.unite || 'piece',
    };

    if (editId) {
      try {
        if (!isOwner) {
          await updateProduct(editId, { stock: Number(form.stock) });
        } else {
          await updateProduct(editId, payload);
        }
        toast.success(!isOwner ? 'Stock mis à jour ✓' : 'Produit modifié ✓');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(msg.includes('limité') ? 'Plan gratuit limité à 10 produits !' : msg);
      }
    } else {
      try {
        await createProduct({
          commerceServerId: commerceIds[0],
          nom: payload.nom,
          prix: payload.prix,
          prix_achat: payload.prix_achat,
          stock: payload.stock,
          categorie: payload.categorie,
          code_barre: payload.code_barre,
          unite: payload.unite || 'piece'
        });
        toast.success('Produit ajouté ✓');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(msg.includes('limité') ? 'Plan gratuit limité à 10 produits !' : msg);
      }
    }
    setSaving(false);
    setOpen(false);
    setEditId(null);
    setForm({ nom: '', prix: '', prix_achat: '', stock: '', categorie: '', code_barre: '', unite: 'piece' });
    refresh();
  };

  const toggleFavori = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    try {
      await updateProduct(id, { favori: !current });
      toast.success(current ? 'Retiré des favoris' : 'Ajouté aux favoris ⭐');
      refresh();
    } catch {
      toast.error('Impossible de mettre à jour le favori');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) { toast.error('Seul le propriétaire peut supprimer'); return; }
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await updateProduct(id, { actif: false });
      toast.success('Supprimé');
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const openEdit = (p: CachedProduct) => {
    setEditId(p.id);
    setForm({ nom: p.nom, prix: String(p.prix), prix_achat: String(p.prix_achat || 0), stock: String(p.stock), categorie: p.categorie || '', code_barre: p.code_barre || '', unite: p.unite || 'piece' });
    setOpen(true);
  };

  const openDetail = (p: CachedProduct) => {
    setSelectedProduct(p);
    setDetailOpen(true);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return p.nom.toLowerCase().includes(q) ||
      p.code_barre?.toLowerCase().includes(q) ||
      p.categorie?.toLowerCase().includes(q);
  });

  if (productsLoading || commerceLoading) return <div className="p-4"><SkeletonList /></div>;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Produits</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={startCameraScanner}>
            <Camera size={16} className="mr-1" /> Scanner
          </Button>
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ nom: '', prix: '', prix_achat: '', stock: '', categorie: '', code_barre: '', unite: 'piece' }); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-1" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? (isOwner ? 'Modifier' : 'Ajouter stock') : 'Nouveau'} produit</DialogTitle>
                <DialogDescription>{editId ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit à votre commerce'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Code barre</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Scanner ou saisir" value={form.code_barre} onChange={e => setForm(f => ({ ...f, code_barre: e.target.value }))} />
                    <Button type="button" size="sm" variant="outline" onClick={startCameraScanner}>
                      <ScanBarcode size={16} />
                    </Button>
                  </div>
                </div>

                {(!editId || isOwner) && (
                  <>
                    <div className="space-y-1.5"><Label>Nom produit *</Label><Input autoComplete="off" name="produit-nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Prix vente (FCFA) *</Label><Input inputMode="decimal" autoComplete="off" name="produit-prix" placeholder="ex. 1500" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} /></div>
                      {isOwner && <div className="space-y-1.5"><Label>Prix achat (FCFA)</Label><Input inputMode="decimal" autoComplete="off" placeholder="Coût réel — confidentiel" value={form.prix_achat} onChange={e => setForm(f => ({ ...f, prix_achat: e.target.value }))} /></div>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Unité</Label>
                        <Select value={form.unite} onValueChange={v => setForm(f => ({ ...f, unite: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">Pièce</SelectItem>
                            <SelectItem value="kg">Kilogramme</SelectItem>
                            <SelectItem value="gramme">Gramme</SelectItem>
                            <SelectItem value="metre">Mètre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label>{editId ? 'Quantité en stock' : 'Quantité initiale'}</Label>
                  <Input inputMode="numeric" autoComplete="off" name="produit-stock" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>

                {(!editId || isOwner) && (
                  <div className="space-y-1.5"><Label>Catégorie</Label><Input value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} /></div>
                )}

                <Button onClick={handleSave} className="w-full h-12" disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                  {editId ? (isOwner ? 'Enregistrer' : 'Mettre à jour stock') : 'Ajouter le produit'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Camera scanner overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
          <div id="barcode-reader" className="w-full max-w-sm rounded-xl overflow-hidden" />
          <Button variant="outline" className="mt-4" onClick={() => { scannerRef.current?.stop().catch(() => {}); setScanning(false); }}>Annuler</Button>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un produit..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" description="Ajoutez vos produits pour commencer" actionLabel="Ajouter" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => openDetail(p)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Package size={18} className="text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{p.nom}</p>
                    {p.sync_status === "pending" && (
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground/50 shrink-0"
                        title="Sync en attente"
                      />
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="text-primary font-bold">{Number(p.prix).toLocaleString()} F</span>
                    <span className={p.stock <= 5 ? 'text-destructive font-medium' : ''}>Stock: {p.stock} {p.unite || 'pièce(s)'}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {p.categorie && <span>{p.categorie}</span>}
                    {p.code_barre && <span>Code: {p.code_barre}</span>}
                  </div>
                </div>
                <button onClick={(e) => toggleFavori(e, p.id, p.favori)} className={`p-2 ${p.favori ? 'text-warning' : 'text-muted-foreground hover:text-warning'}`}>
                  <Star size={16} fill={p.favori ? 'currentColor' : 'none'} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
        onDelete={handleDelete}
        onRefresh={refresh}
      />
    </div>
  );
}
