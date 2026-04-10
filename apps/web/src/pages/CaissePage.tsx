import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export default function CaissePage() {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, checkout } = useStore();
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);

  const handleCheckout = (type: 'full' | 'half' | 'credit') => {
    if (cart.length === 0) return;
    checkout(type, 'Amadou');
    setShowPayment(false);
    toast.success('Vente enregistrée !', { description: `${total.toLocaleString()} FCFA - ${type === 'full' ? 'Payé' : type === 'half' ? 'Moitié' : 'Crédit'}` });
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Products panel */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full h-11 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(product => (
            <motion.button
              key={product.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (product.stock <= 0) {
                  toast.error('Stock épuisé !');
                  return;
                }
                addToCart(product);
              }}
              className="bg-card card-float rounded-xl p-3 text-left touch-target flex flex-col gap-1 border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center text-lg">
                📦
              </div>
              <p className="text-sm font-semibold text-card-foreground truncate">{product.name}</p>
              <p className="text-xs text-primary font-bold">{product.price.toLocaleString()} F</p>
              <p className={`text-[10px] font-medium ${product.stock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                Stock: {product.stock}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      <div className="lg:w-80 xl:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-card-foreground">Panier ({cart.length})</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-medium">Vider</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-muted rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.product.price.toLocaleString()} F</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt size={40} className="mb-2 opacity-30" />
              <p className="text-sm">Panier vide</p>
              <p className="text-xs">Ajoutez des produits</p>
            </div>
          )}
        </div>

        {/* Total + pay */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">{total.toLocaleString()} F</span>
          </div>

          {!showPayment ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => cart.length > 0 && setShowPayment(true)}
              disabled={cart.length === 0}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base touch-target disabled:opacity-40 transition-opacity"
            >
              Payer
            </motion.button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <button
                onClick={() => handleCheckout('full')}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 touch-target"
              >
                <Banknote size={18} /> Paiement complet
              </button>
              <button
                onClick={() => handleCheckout('half')}
                className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 touch-target"
              >
                <CreditCard size={18} /> Moitié paiement
              </button>
              <button
                onClick={() => handleCheckout('credit')}
                className="w-full h-11 rounded-xl bg-warning text-warning-foreground font-semibold text-sm flex items-center justify-center gap-2 touch-target"
              >
                <Receipt size={18} /> Crédit
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
