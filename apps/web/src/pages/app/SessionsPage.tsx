import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentBusiness } from '@/hooks/useCurrentBusiness';
import { useProducts, type CachedProduct } from '@/hooks/useProducts';
import { useSyncStore } from '@/store/syncStore';
import { useSubscription } from '@/hooks/useSubscription';
import { processSale } from '@/services/sales';
import { getOfflineSales } from '@/lib/offline-db';
import { Input } from '@/components/ui/input';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Banknote,
  CreditCard,
  WifiOff,
  Loader2,
  Receipt,
  X,
  ScanBarcode,
  Zap,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  ArrowLeft,
  Crown,
} from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import SaleSuccessModal from '@/components/receipt/SaleSuccessModal';
import ReceiptSheet from '@/components/receipt/ReceiptSheet';
import type { ReceiptData } from '@/lib/receipt-utils';
import { toUiErrorMessage } from '@/lib/ui-errors';
import { parsePrixInput } from '@/lib/prix-input';
import { createProduct } from '@/lib/data/products';
import type { AppRole } from '@/lib/auth-role';
import { readCachedAppRole, readCachedAppRoleStale } from '@/lib/auth/roleCache';
import { resolveCommerceServerIdForSession } from '@/lib/auth/ensureDefaultCommerce';
import type { ProductCacheRow } from '@/lib/local/local-types';

interface CartItem {
  produit: CachedProduct;
  quantity: number;
}

type PaymentMode = 'cash' | 'mobile_money' | 'credit';

let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx && typeof window !== 'undefined') {
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || w.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

function playSound(type: 'pop' | 'bip' | 'cha-ching' | 'error') {
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'pop':
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        break;

      case 'bip':
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;

      case 'cha-ching':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1600, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;

      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        break;
    }
  } catch {
    // ignore audio failures
  }
}

function haptic(pattern: number[] = [10]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

const CART_VIRT_THRESHOLD = 24;
const DESKTOP_CART_ROW_EST = 132;
const MOBILE_CART_ROW_EST = 76;
const RUSH_CART_ROW_EST = 60;

type UpdateQtyFn = (produitId: string, qty: number) => void;

const DesktopCartRow = memo(function DesktopCartRow({
  item,
  updateQty,
}: {
  item: CartItem;
  updateQty: UpdateQtyFn;
}) {
  return (
    <div className="bg-muted rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.produit.nom}</p>
          <p className="text-xs text-muted-foreground">
            {Number(item.produit.prix).toLocaleString()} F × {item.quantity}
          </p>
        </div>

        <p className="text-sm font-bold text-foreground shrink-0">
          {(item.produit.prix * item.quantity).toLocaleString()} F
        </p>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateQty(item.produit.id, item.quantity - 1)}
            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Minus size={14} />
          </button>

          <span className="w-8 text-center text-sm font-bold text-foreground">{item.quantity}</span>

          <button
            type="button"
            onClick={() => updateQty(item.produit.id, item.quantity + 1)}
            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => updateQty(item.produit.id, 0)}
          className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});

function DesktopCartSmallList({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
      <AnimatePresence>
        {cart.map((item) => (
          <motion.div
            key={item.produit.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DesktopCartRow item={item} updateQty={updateQty} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DesktopCartVirtualList({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: cart.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => DESKTOP_CART_ROW_EST,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const item = cart[vi.index];
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0 top-0 pb-2"
              style={{
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <DesktopCartRow item={item} updateQty={updateQty} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopCartContents({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  if (cart.length <= CART_VIRT_THRESHOLD) {
    return <DesktopCartSmallList cart={cart} updateQty={updateQty} />;
  }
  return <DesktopCartVirtualList cart={cart} updateQty={updateQty} />;
}

const MobileCartRow = memo(function MobileCartRow({
  item,
  updateQty,
}: {
  item: CartItem;
  updateQty: UpdateQtyFn;
}) {
  return (
    <div className="flex items-center gap-3 bg-muted rounded-xl p-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.produit.nom}</p>
        <p className="text-xs text-muted-foreground">{Number(item.produit.prix).toLocaleString()} F</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateQty(item.produit.id, item.quantity - 1)}
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
        >
          <Minus size={14} />
        </button>

        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>

        <button
          type="button"
          onClick={() => updateQty(item.produit.id, item.quantity + 1)}
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => updateQty(item.produit.id, 0)}
        className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
      >
        <Trash2 size={14} />
      </button>

      <p className="text-sm font-bold text-foreground w-16 text-right">
        {(item.produit.prix * item.quantity).toLocaleString()} F
      </p>
    </div>
  );
});

function MobileExpandedCartSmall({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  return (
    <div className="overflow-y-auto max-h-[40vh] p-3 space-y-2">
      {cart.map((item) => (
        <motion.div key={item.produit.id} layout>
          <MobileCartRow item={item} updateQty={updateQty} />
        </motion.div>
      ))}
    </div>
  );
}

function MobileExpandedCartVirtual({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: cart.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => MOBILE_CART_ROW_EST,
    overscan: 8,
  });

  return (
    <div ref={scrollRef} className="overflow-y-auto max-h-[40vh] p-3 min-h-0">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const item = cart[vi.index];
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0 top-0 px-0 pb-2"
              style={{
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <MobileCartRow item={item} updateQty={updateQty} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileExpandedCartList({ cart, updateQty }: { cart: CartItem[]; updateQty: UpdateQtyFn }) {
  if (cart.length <= CART_VIRT_THRESHOLD) {
    return <MobileExpandedCartSmall cart={cart} updateQty={updateQty} />;
  }
  return <MobileExpandedCartVirtual cart={cart} updateQty={updateQty} />;
}

function RushCartVirtualList({ cart }: { cart: CartItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: cart.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => RUSH_CART_ROW_EST,
    overscan: 10,
  });

  return (
    <div ref={scrollRef} className="h-full min-h-[120px] max-h-[min(55vh,420px)] w-full overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const item = cart[vi.index];
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0 top-0 pb-3"
              style={{
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border/50">
                <span className="text-sm font-semibold truncate pr-2">{item.produit.nom}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-primary">×{item.quantity}</span>
                  <span className="text-sm font-bold">
                    {(item.produit.prix * item.quantity).toLocaleString()} F
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { commerceIds, commerces, gerantId, loading: commerceLoading } = useCurrentBusiness();
  const { products, loading: productsLoading, refresh: refreshProducts } = useProducts(commerceIds);
  const isOnline = useSyncStore((s) => s.isOnline);
  const sub = useSubscription();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleAmount, setLastSaleAmount] = useState(0);
  const [lastReceiptData, setLastReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const [halfPayAmount, setHalfPayAmount] = useState('');
  const [halfClientName, setHalfClientName] = useState('');
  const [halfPromiseDate, setHalfPromiseDate] = useState('');
  const [showHalfPay, setShowHalfPay] = useState(false);
  const [creditClientName, setCreditClientName] = useState('');
  const [creditPromiseDate, setCreditPromiseDate] = useState('');
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [offlineSalesCount, setOfflineSalesCount] = useState(0);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [rushMode, setRushMode] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    nom: '',
    prix: '',
    stock: '',
    categorie: '',
  });
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isOwner = role === 'proprietaire' || role === 'super_admin';

  useEffect(() => {
    void getOfflineSales().then((sales) => setOfflineSalesCount(sales.length));
  }, [cart]);

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.categorie || 'Divers'));
    return ['Tous', ...Array.from(cats)];
  }, [products]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => p.favori && p.stock > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;

    if (activeCategory !== 'Tous') {
      list = list.filter((p) => (p.categorie || 'Divers') === activeCategory);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          p.code_barre?.toLowerCase().includes(q) ||
          p.categorie?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, activeCategory, debouncedSearch]);

  const cartByProductId = useMemo(
    () => new Map(cart.map((c) => [c.produit.id, c] as const)),
    [cart]
  );

  const productScrollRef = useRef<HTMLDivElement>(null);
  const productVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => productScrollRef.current,
    estimateSize: () => 84,
    overscan: 10,
  });

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.produit.prix * c.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const addToCart = useCallback((produit: CachedProduct) => {
    if (produit.stock <= 0) {
      playSound('error');
      haptic([50]);
      toast.error('Produit trouvé mais stock insuffisant', {
        description: `${produit.nom} — stock épuisé`,
      });
      return;
    }

    playSound('pop');
    haptic([10]);

    setCart((prev) => {
      const existing = prev.find((c) => c.produit.id === produit.id);

      if (existing) {
        if (existing.quantity >= produit.stock) {
          toast.error('Stock insuffisant', {
            description: `${produit.nom} — max: ${produit.stock}`,
          });
          return prev;
        }

        return prev.map((c) =>
          c.produit.id === produit.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }

      return [...prev, { produit, quantity: 1 }];
    });
  }, []);

  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const normalized = code.trim().replace(/[^\w-]/g, '');
      console.debug('[POS Scan] code:', normalized, 'commerce:', commerceIds, 'products count:', products.length);

      const produit = products.find((p) => {
        if (!p.code_barre) return false;
        const pCode = p.code_barre.trim().replace(/[^\w-]/g, '');
        return pCode === normalized;
      });

      if (produit) {
        if (produit.stock <= 0) {
          playSound('error');
          haptic([50]);
          toast.error('Produit trouvé mais stock insuffisant', {
            description: `${produit.nom} — stock: ${produit.stock}`,
          });
          console.debug('[POS Scan] Product found but out of stock:', produit.nom);
          return;
        }

        addToCart(produit);
        playSound('bip');
        haptic([30, 20, 30]);
        toast.success('Produit ajouté au panier', { description: produit.nom });
        console.debug('[POS Scan] Product found and added:', produit.nom);
      } else {
        playSound('error');
        haptic([50, 30, 50]);
        setUnknownBarcode(normalized);
        setNewProductForm({ nom: '', prix: '', stock: '10', categorie: '' });
        toast.info('Produit inconnu', {
          description: `Code: ${normalized}`,
          action: { label: 'Ajouter au stock', onClick: () => {} },
        });
        console.debug('[POS Scan] Product not found for code:', normalized);
      }
    },
    [products, commerceIds, addToCart]
  );

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
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScanned]);

  const startCameraScanner = () => setScanning(true);
  const stopScanner = () => setScanning(false);

  const handleQuickAddProduct = async () => {
    if (!user) {
      toast.error('Vous devez être connecté.');
      return;
    }

    const effectiveRole =
      (role ?? readCachedAppRole(user.id) ?? readCachedAppRoleStale(user.id)) as AppRole | null;

    let commerceServerId = await resolveCommerceServerIdForSession(
      user,
      effectiveRole,
      commerceIds
    );
    if (commerceServerId) {
      window.dispatchEvent(new Event('kobina:refetch-commerce-ids'));
    }
    if (!commerceServerId) {
      toast.error(
        'Aucun commerce n’est chargé pour votre compte. Ouvrez la page Commerces, vérifiez votre connexion, ou attendez la fin du chargement puis réessayez.'
      );
      return;
    }
    const nomQ = newProductForm.nom.trim();
    const prixQ = parsePrixInput(newProductForm.prix);
    if (!nomQ) {
      toast.error('Le nom du produit est requis.');
      return;
    }
    if (prixQ === null) {
      toast.error('Indiquez un prix de vente valide (ex. 1500 ou 1500,50).');
      return;
    }

    setSavingNewProduct(true);

    try {
      const payload = {
        nom: nomQ,
        prix: prixQ,
        prix_achat: 0,
        stock: Number(newProductForm.stock) || 10,
        code_barre: unknownBarcode,
        categorie: newProductForm.categorie.trim() || null,
        commerce_id: commerceServerId,
      };

      if (isOnline) {
        const created = await createProduct({
          commerceServerId,
          nom: payload.nom,
          prix: payload.prix,
          prix_achat: payload.prix_achat,
          stock: payload.stock,
          categorie: payload.categorie,
          code_barre: payload.code_barre,
          unite: 'piece'
        });
        addToCart(created as CachedProduct);
        await refreshProducts();
      } else {
        const localProduct: CachedProduct = {
          id: crypto.randomUUID(),
          ...payload,
          unite: 'piece',
          favori: false,
        };

        const { addToSyncQueue, cacheProducts, getCachedProducts } = await import('@/lib/offline-db');
        const cached = await getCachedProducts();

        await cacheProducts([localProduct as unknown as ProductCacheRow, ...cached]);
        await addToSyncQueue({
          table: 'produits',
          action: 'insert',
          payload,
          priority: 'high',
        });

        addToCart(localProduct);
      }

      playSound('bip');
      haptic([20, 10, 20]);
      toast.success(`${newProductForm.nom} créé et ajouté au panier ✓`);
      setUnknownBarcode(null);
      setNewProductForm({ nom: '', prix: '', stock: '', categorie: '' });
    } catch (err: unknown) {
      toast.error('Erreur lors de la création du produit', {
        description: toUiErrorMessage(err, 'Reessayez'),
      });
    } finally {
      setSavingNewProduct(false);
    }
  };

  const updateQty = useCallback((produitId: string, qty: number) => {
    haptic([5]);

    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.produit.id !== produitId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.produit.id === produitId ? { ...c, quantity: qty } : c))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setShowPayment(false);
    setShowHalfPay(false);
    setShowCreditForm(false);
    setHalfPayAmount('');
    setHalfClientName('');
    setHalfPromiseDate('');
    setCreditClientName('');
    setCreditPromiseDate('');
  }, []);

  const handleCheckout = async (
    mode: PaymentMode,
    partialAmount?: number,
    clientName?: string,
    promiseDate?: string
  ) => {
    if (cart.length === 0 || !user) return;

    setProcessing(true);

    try {
      let gId = gerantId;
      const commerceId = cart[0].produit.commerce_id;

      if (!gId && isOnline) {
        const { data, error } = await supabase
          .from('gerants')
          .select('id')
          .eq('commerce_id', commerceId)
          .eq('actif', true)
          .limit(1);

        if (error) throw error;
        gId = data?.[0]?.id;
      }

      if (!gId && isOwner && isOnline) {
        const { data: mine, error: eMine } = await supabase
          .from('gerants')
          .select('id')
          .eq('commerce_id', commerceId)
          .eq('user_id', user.id)
          .eq('actif', true)
          .maybeSingle();
        if (eMine) throw eMine;
        gId = mine?.id ?? null;
      }

      if (!gId) {
        toast.error(
          isOnline
            ? 'Aucun vendeur associé à ce commerce. Réessayez dans un instant ou vérifiez votre connexion.'
            : 'Aucun vendeur en cache pour ce commerce. Ouvrez l’app une fois en ligne pour synchroniser, ou vérifiez les gérants.'
        );
        return;
      }

      let userName = user.email || 'unknown';

      if (isOnline) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('nom')
            .eq('id', user.id)
            .single();

          if (!profileError && profile?.nom) {
            userName = profile.nom;
          }
        } catch {
          /* garde userName depuis l’email */
        }
      }

      const saleTotal = cartTotal;
      const isFullyPaid =
        mode === 'cash' ||
        mode === 'mobile_money' ||
        (mode === 'credit' && partialAmount !== undefined && partialAmount >= saleTotal);

      const isTotalCredit =
        mode === 'credit' && (partialAmount === undefined || partialAmount === 0);

      const isPartialPayment =
        mode === 'credit' &&
        partialAmount !== undefined &&
        partialAmount > 0 &&
        partialAmount < saleTotal;

      const saleItems = cart.map((c) => ({
        nom: c.produit.nom,
        quantite: c.quantity,
        prixUnitaire: Number(c.produit.prix),
        totalLigne: Number(c.produit.prix) * c.quantity,
      }));

      const saleCommerceName = commerces.find((c) => c.id === commerceId)?.nom || 'Commerce';

      const factureId = await processSale({
        cart,
        mode,
        userId: user.id,
        userName,
        gerantId: gId,
        commerceId,
        isOnline,
        partialAmount,
        clientName,
        promiseDate,
      });

      const paidAmount = isFullyPaid ? saleTotal : partialAmount || 0;

      const receiptData: ReceiptData = {
        id: factureId,
        commerceName: saleCommerceName,
        date: new Date().toISOString(),
        vendeur: userName,
        type: isFullyPaid ? 'cash' : 'credit',
        items: saleItems,
        sousTotal: saleTotal,
        totalFinal: saleTotal,
        montantPaye: paidAmount,
        reste: saleTotal - paidAmount,
      };

      playSound('cha-ching');
      haptic([50, 30, 50]);

      setCart([]);
      setShowPayment(false);
      setShowHalfPay(false);
      setShowCreditForm(false);
      setHalfPayAmount('');
      setHalfClientName('');
      setHalfPromiseDate('');
      setCreditClientName('');
      setCreditPromiseDate('');
      setLastSaleAmount(saleTotal);
      setLastReceiptData(receiptData);
      setShowSuccess(true);
      setCartExpanded(false);

      await refreshProducts();

      void getOfflineSales().then((sales) => setOfflineSalesCount(sales.length));

      const modeLabel = isFullyPaid
        ? 'Achat complet'
        : isPartialPayment
        ? 'Paiement partiel'
        : 'Crédit';

      const successMsg = isTotalCredit
        ? 'Crédit enregistré avec succès'
        : isPartialPayment
        ? 'Paiement partiel enregistré. Le solde a été ajouté au crédit.'
        : 'Vente enregistrée avec succès';

      toast.success(isOnline ? successMsg : 'Vente enregistrée hors ligne', {
        description: isOnline
          ? `${saleTotal.toLocaleString()} F — ${modeLabel}${clientName ? ` · ${clientName}` : ''}`
          : `${saleTotal.toLocaleString()} F — ${modeLabel}${clientName ? ` · ${clientName}` : ''} — en attente de synchronisation`,
      });
    } catch (err: unknown) {
      playSound('error');
      toast.error('Erreur', {
        description: toUiErrorMessage(err, 'Reessayez'),
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleHalfPay = () => {
    const amount = parseInt(halfPayAmount) || 0;

    if (!halfClientName.trim()) {
      toast.error('Le nom du client est obligatoire');
      return;
    }

    if (amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > cartTotal) {
      toast.error('Le montant payé ne peut pas dépasser le montant dû.');
      return;
    }

    if (amount === cartTotal) {
      void handleCheckout('cash');
      return;
    }

    void handleCheckout('credit', amount, halfClientName.trim(), halfPromiseDate || undefined);
  };

  const handleCreditSubmit = () => {
    if (!creditClientName.trim()) {
      toast.error('Le nom du client est obligatoire');
      return;
    }

    void handleCheckout('credit', 0, creditClientName.trim(), creditPromiseDate || undefined);
  };

  if (commerceLoading || (productsLoading && products.length === 0)) {
    return (
      <div className="p-4">
        <SkeletonList />
      </div>
    );
  }

  const MobileCartBar = () => {
    if (cart.length === 0) return null;

    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <AnimatePresence>
          {cartExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-card border-t border-border overflow-hidden max-h-[50vh]"
            >
              <MobileExpandedCartList cart={cart} updateQty={updateQty} />

              <div className="px-3 pb-2">
                <button
                  onClick={clearCart}
                  className="text-xs text-destructive font-medium"
                >
                  🗑 Vider le panier
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPayment && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card border-t border-border p-3 space-y-2"
            >
              <p className="text-xs font-semibold text-muted-foreground text-center mb-1">
                Mode de paiement
              </p>

              <button
                onClick={() => void handleCheckout('cash')}
                disabled={processing}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Banknote size={20} />
                )}
                Achat — Paiement complet
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!sub.canUseFeature('credit_module')) {
                      toast.error('Fonctionnalité réservée aux formules payantes.', {
                        action: {
                          label: 'Mettre à niveau',
                          onClick: () => navigate('/app/abonnements'),
                        },
                      });
                      return;
                    }
                    setShowPayment(false);
                    setShowHalfPay(true);
                  }}
                  disabled={processing}
                  className={`h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50 ${
                    sub.canUseFeature('credit_module')
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {sub.canUseFeature('credit_module') ? (
                    <CreditCard size={16} />
                  ) : (
                    <Crown size={14} />
                  )}
                  Moitié
                </button>

                <button
                  onClick={() => {
                    if (!sub.canUseFeature('credit_module')) {
                      toast.error('Fonctionnalité réservée aux formules payantes.', {
                        action: {
                          label: 'Mettre à niveau',
                          onClick: () => navigate('/app/abonnements'),
                        },
                      });
                      return;
                    }
                    setShowPayment(false);
                    setShowCreditForm(true);
                  }}
                  disabled={processing}
                  className={`h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50 border ${
                    sub.canUseFeature('credit_module')
                      ? 'bg-warning/20 text-warning-foreground border-warning/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {sub.canUseFeature('credit_module') ? (
                    <Receipt size={16} />
                  ) : (
                    <Crown size={14} />
                  )}
                  Crédit
                </button>
              </div>

              <button
                onClick={() => setShowPayment(false)}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Annuler
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHalfPay && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card border-t border-border p-3 space-y-2 max-h-[60vh] overflow-y-auto"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Paiement partiel — {cartTotal.toLocaleString()} F dû
              </p>

              <Input
                type="number"
                placeholder="Montant payé *"
                value={halfPayAmount}
                onChange={(e) => setHalfPayAmount(e.target.value)}
                className="h-11 text-lg font-bold"
                autoFocus
              />

              <Input
                placeholder="Nom du client *"
                value={halfClientName}
                onChange={(e) => setHalfClientName(e.target.value)}
                className="h-11"
              />

              <Input
                type="date"
                placeholder="Date de promesse (facultatif)"
                value={halfPromiseDate}
                onChange={(e) => setHalfPromiseDate(e.target.value)}
                className="h-11"
              />

              {halfPayAmount &&
                parseInt(halfPayAmount) > 0 &&
                parseInt(halfPayAmount) < cartTotal && (
                  <div className="flex justify-between text-sm px-1">
                    <span className="text-muted-foreground">Reste (crédit) :</span>
                    <span className="font-bold text-warning">
                      {(cartTotal - (parseInt(halfPayAmount) || 0)).toLocaleString()} F
                    </span>
                  </div>
                )}

              {halfPayAmount && parseInt(halfPayAmount) > cartTotal && (
                <p className="text-xs text-destructive font-medium px-1">
                  Le montant payé ne peut pas dépasser le montant dû.
                </p>
              )}

              <button
                onClick={handleHalfPay}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirmer
              </button>

              <button
                onClick={() => {
                  setShowHalfPay(false);
                  setShowPayment(true);
                  setHalfPayAmount('');
                  setHalfClientName('');
                  setHalfPromiseDate('');
                }}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Retour
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCreditForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card border-t border-border p-3 space-y-2"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Crédit total — {cartTotal.toLocaleString()} F
              </p>

              <p className="text-[10px] text-muted-foreground">
                Ce montant ne sera pas comptabilisé en recette du jour.
              </p>

              <Input
                placeholder="Nom du client *"
                value={creditClientName}
                onChange={(e) => setCreditClientName(e.target.value)}
                className="h-11"
                autoFocus
              />

              <Input
                type="date"
                placeholder="Date de promesse (facultatif)"
                value={creditPromiseDate}
                onChange={(e) => setCreditPromiseDate(e.target.value)}
                className="h-11"
              />

              <button
                onClick={handleCreditSubmit}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-warning text-warning-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Receipt size={16} />
                )}
                Enregistrer le crédit
              </button>

              <button
                onClick={() => {
                  setShowCreditForm(false);
                  setShowPayment(true);
                  setCreditClientName('');
                  setCreditPromiseDate('');
                }}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Retour
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPayment && !showHalfPay && !showCreditForm && (
          <div className="bg-card border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => setCartExpanded(!cartExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingCart size={18} className="text-primary" />
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  {cart.length} article{cart.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {cartTotal.toLocaleString()} F
                </span>
                {cartExpanded ? (
                  <ChevronDown size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronUp size={16} className="text-muted-foreground" />
                )}
              </div>
            </button>

            <div className="px-3 pb-3 pt-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPayment(true)}
                disabled={processing}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2.5 shadow-[0_4px_14px_-2px_hsl(142_64%_36%_/_0.4)] active:shadow-none transition-all disabled:opacity-50"
              >
                💰 VALIDER LA VENTE
              </motion.button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row relative">
      <SaleSuccessModal
        show={showSuccess}
        receiptData={lastReceiptData}
        onClose={() => setShowSuccess(false)}
        onOpenReceipt={() => setShowReceiptSheet(true)}
      />

      <ReceiptSheet
        open={showReceiptSheet}
        onClose={() => setShowReceiptSheet(false)}
        data={lastReceiptData}
      />

      {scanning && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={stopScanner}
          continuous
        />
      )}

      <AnimatePresence>
        {unknownBarcode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end lg:items-center justify-center"
            onClick={() => setUnknownBarcode(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-2xl lg:rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
            >
              <div>
                <h2 className="text-lg font-bold text-foreground">Nouveau produit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Code-barre :{' '}
                  <span className="font-mono font-bold text-primary">{unknownBarcode}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Nom du produit *
                  </label>
                  <Input
                    autoFocus
                    placeholder="Ex: Coca-Cola 1L"
                    value={newProductForm.nom}
                    onChange={(e) =>
                      setNewProductForm((f) => ({ ...f, nom: e.target.value }))
                    }
                    className="h-12 mt-1 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Prix (FCFA) *
                    </label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={newProductForm.prix}
                      onChange={(e) =>
                        setNewProductForm((f) => ({ ...f, prix: e.target.value }))
                      }
                      className="h-11 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Stock initial
                    </label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={newProductForm.stock}
                      onChange={(e) =>
                        setNewProductForm((f) => ({ ...f, stock: e.target.value }))
                      }
                      className="h-11 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Catégorie
                  </label>
                  <Input
                    placeholder="Boissons, Nourriture..."
                    value={newProductForm.categorie}
                    onChange={(e) =>
                      setNewProductForm((f) => ({ ...f, categorie: e.target.value }))
                    }
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUnknownBarcode(null)}
                  className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
                >
                  Annuler
                </button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void handleQuickAddProduct()}
                  disabled={savingNewProduct || !newProductForm.nom || !newProductForm.prix}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingNewProduct ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Créer & Ajouter
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-3 space-y-2.5 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-muted text-foreground flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Retour"
              >
                <ArrowLeft size={18} />
              </button>

              <h1 className="text-sm font-bold text-foreground">Caisse</h1>

              {!isOnline && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning bg-warning/10 rounded-full px-2.5 py-1 font-semibold">
                  <WifiOff size={12} /> Hors-ligne
                  {offlineSalesCount > 0 && (
                    <span className="bg-warning/20 rounded-full px-1.5">
                      {offlineSalesCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setRushMode(!rushMode)}
              className={`flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1.5 transition-all ${
                rushMode
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Zap size={12} /> {rushMode ? 'MODE RAPIDE ⚡' : 'Mode rapide'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher ou scanner..."
                className="pl-9 h-12 text-base rounded-xl bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startCameraScanner}
              className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md active:shadow-none transition-shadow"
            >
              <ScanBarcode size={22} />
            </motion.button>
          </div>

          {!rushMode && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {favoriteProducts.length > 0 && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              ⭐ Vente rapide
            </p>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {favoriteProducts.map((p) => {
                const inCart = cartByProductId.get(p.id);

                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => addToCart(p)}
                    className={`shrink-0 rounded-2xl px-4 py-3 text-left min-w-[100px] transition-all active:shadow-none ${
                      inCart
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-primary/8 border border-primary/15 hover:bg-primary/12'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold truncate ${
                        inCart ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {p.nom}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 ${
                        inCart ? 'text-primary-foreground/80' : 'text-primary'
                      }`}
                    >
                      {Number(p.prix).toLocaleString()} F
                    </p>
                    {inCart && (
                      <span className="text-[10px] font-bold text-primary-foreground/90 mt-0.5 block">
                        ×{inCart.quantity}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {!rushMode && (
          <div ref={productScrollRef} className="flex-1 overflow-y-auto p-3 pb-32 lg:pb-3">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucun produit trouvé</p>
                <p className="text-xs">Modifiez votre recherche</p>
              </div>
            ) : (
              <div
                className="relative w-full"
                style={{ height: productVirtualizer.getTotalSize() }}
              >
                {productVirtualizer.getVirtualItems().map((vi) => {
                  const product = filteredProducts[vi.index];
                  const inCart = cartByProductId.get(product.id);
                  const outOfStock = product.stock <= 0;
                  const lowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <div
                      key={vi.key}
                      data-index={vi.index}
                      ref={productVirtualizer.measureElement}
                      className="absolute left-0 right-0 top-0 pb-1.5"
                      style={{
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                        className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-[background-color,border-color,opacity,transform] duration-150 active:bg-accent ${
                          inCart
                            ? 'bg-primary/5 border border-primary/20'
                            : 'bg-card border border-border/40 hover:border-border'
                        } ${outOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            inCart ? 'bg-primary/10' : 'bg-muted'
                          }`}
                        >
                          📦
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {product.nom}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-primary">
                              {Number(product.prix).toLocaleString()} F
                            </span>

                            {lowStock && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-warning">
                                <AlertTriangle size={10} /> {product.stock}
                              </span>
                            )}

                            {outOfStock && (
                              <span className="text-[10px] font-bold text-destructive">
                                Rupture
                              </span>
                            )}
                          </div>
                        </div>

                        {inCart ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(product.id, inCart.quantity - 1);
                              }}
                              className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Minus size={14} />
                            </button>

                            <span className="w-7 text-center text-sm font-bold text-primary">
                              {inCart.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(product.id, inCart.quantity + 1);
                              }}
                              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Plus size={20} />
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {rushMode && (
          <div className="flex-1 flex flex-col min-h-0 p-4 pb-32 lg:pb-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
                <Zap size={48} className="mx-auto mb-3 text-primary opacity-50" />
                <p className="text-sm font-medium">Mode rapide activé</p>
                <p className="text-xs">Utilisez les favoris ou le scanner</p>
              </div>
            ) : cart.length <= CART_VIRT_THRESHOLD ? (
              <div className="w-full space-y-3 max-w-lg mx-auto">
                {cart.map((item) => (
                  <div
                    key={item.produit.id}
                    className="flex items-center justify-between bg-card rounded-xl p-3 border border-border/50"
                  >
                    <span className="text-sm font-semibold">{item.produit.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">×{item.quantity}</span>
                      <span className="text-sm font-bold">
                        {(item.produit.prix * item.quantity).toLocaleString()} F
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full max-w-lg mx-auto flex-1 min-h-0 flex flex-col">
                <RushCartVirtualList cart={cart} />
              </div>
            )}
          </div>
        )}
      </div>

      <MobileCartBar />

      <div className="hidden lg:flex lg:w-80 xl:w-96 bg-card border-l border-border flex-col shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Panier
            {cartCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </h2>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-destructive font-medium hover:underline"
            >
              Vider
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground p-3">
              <Receipt size={40} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Panier vide</p>
              <p className="text-xs">Cliquez sur un produit</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-3 pt-3">
              <DesktopCartContents cart={cart} updateQty={updateQty} />
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              {cartTotal.toLocaleString()} F
            </span>
          </div>

          {!showPayment && !showHalfPay && !showCreditForm ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => cart.length > 0 && setShowPayment(true)}
              disabled={cart.length === 0 || processing}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-[0_4px_14px_-2px_hsl(142_64%_36%_/_0.4)] disabled:opacity-40 disabled:shadow-none transition-all"
            >
              💰 VALIDER LA VENTE
            </motion.button>
          ) : showCreditForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="bg-muted rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Crédit total — {cartTotal.toLocaleString()} F
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Non comptabilisé en recette du jour.
                </p>

                <Input
                  placeholder="Nom du client *"
                  value={creditClientName}
                  onChange={(e) => setCreditClientName(e.target.value)}
                  className="h-11"
                  autoFocus
                />

                <Input
                  type="date"
                  placeholder="Date de promesse"
                  value={creditPromiseDate}
                  onChange={(e) => setCreditPromiseDate(e.target.value)}
                  className="h-11"
                />
              </div>

              <button
                onClick={handleCreditSubmit}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-warning text-warning-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Receipt size={16} />
                )}
                Enregistrer le crédit
              </button>

              <button
                onClick={() => {
                  setShowCreditForm(false);
                  setShowPayment(true);
                  setCreditClientName('');
                  setCreditPromiseDate('');
                }}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Retour
              </button>
            </motion.div>
          ) : showHalfPay ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="bg-muted rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Paiement partiel — {cartTotal.toLocaleString()} F dû
                </p>

                <Input
                  type="number"
                  placeholder="Montant payé *"
                  value={halfPayAmount}
                  onChange={(e) => setHalfPayAmount(e.target.value)}
                  className="h-11 text-lg font-bold"
                  autoFocus
                />

                <Input
                  placeholder="Nom du client *"
                  value={halfClientName}
                  onChange={(e) => setHalfClientName(e.target.value)}
                  className="h-11"
                />

                <Input
                  type="date"
                  placeholder="Date de promesse"
                  value={halfPromiseDate}
                  onChange={(e) => setHalfPromiseDate(e.target.value)}
                  className="h-11"
                />

                {halfPayAmount &&
                  parseInt(halfPayAmount) > 0 &&
                  parseInt(halfPayAmount) < cartTotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reste :</span>
                      <span className="font-bold text-warning">
                        {(cartTotal - (parseInt(halfPayAmount) || 0)).toLocaleString()} F
                      </span>
                    </div>
                  )}

                {halfPayAmount && parseInt(halfPayAmount) > cartTotal && (
                  <p className="text-xs text-destructive font-medium">
                    Le montant payé ne peut pas dépasser le montant dû.
                  </p>
                )}
              </div>

              <button
                onClick={handleHalfPay}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirmer
              </button>

              <button
                onClick={() => {
                  setShowHalfPay(false);
                  setShowPayment(true);
                  setHalfPayAmount('');
                  setHalfClientName('');
                  setHalfPromiseDate('');
                }}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Retour
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <button
                onClick={() => void handleCheckout('cash')}
                disabled={processing}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {processing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Banknote size={18} />
                )}
                Achat — Paiement complet
              </button>

              <button
                onClick={() => {
                  setShowPayment(false);
                  setShowHalfPay(true);
                }}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard size={18} /> Moitié paiement
              </button>

              <button
                onClick={() => {
                  setShowPayment(false);
                  setShowCreditForm(true);
                }}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-warning/20 text-warning-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 border border-warning/30"
              >
                <Receipt size={18} /> Crédit client
              </button>

              <button
                onClick={() => setShowPayment(false)}
                className="w-full h-9 text-sm text-muted-foreground font-medium"
              >
                Annuler
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}