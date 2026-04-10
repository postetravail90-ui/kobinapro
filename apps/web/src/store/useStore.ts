import { create } from 'zustand';

// ============ TYPES ============
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  category?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  products: { name: string; quantity: number; price: number }[];
  total: number;
  paymentType: 'full' | 'half' | 'credit';
  manager: string;
  date: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  manager: string;
  date: string;
}

export interface Manager {
  id: string;
  name: string;
  phone: string;
  commerce: string;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  date: string;
}

export interface Notification {
  id: string;
  type: 'stock' | 'credit' | 'sale' | 'manager';
  message: string;
  date: string;
  read: boolean;
}

// ============ STORE ============
interface AppState {
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  expenses: Expense[];
  managers: Manager[];
  messages: ChatMessage[];
  notifications: Notification[];
  isOnline: boolean;
  referralCode: string;
  userLevel: number;
  userPoints: number;
  badges: string[];

  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  checkout: (paymentType: 'full' | 'half' | 'credit', manager: string) => void;
  addExpense: (e: Omit<Expense, 'id' | 'date'>) => void;
  addManager: (m: Omit<Manager, 'id'>) => void;
  toggleManager: (id: string) => void;
  deleteManager: (id: string) => void;
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'date'>) => void;
  markNotificationRead: (id: string) => void;
  setOnline: (v: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Riz 25kg', price: 15000, stock: 24, category: 'Alimentation' },
  { id: '2', name: 'Huile 5L', price: 6500, stock: 18, category: 'Alimentation' },
  { id: '3', name: 'Sucre 1kg', price: 1200, stock: 45, category: 'Alimentation' },
  { id: '4', name: 'Savon Lot x6', price: 3000, stock: 30, category: 'Hygiène' },
  { id: '5', name: 'Lait concentré', price: 800, stock: 60, category: 'Alimentation' },
  { id: '6', name: 'Pâtes 500g', price: 900, stock: 35, category: 'Alimentation' },
  { id: '7', name: 'Café 250g', price: 2500, stock: 15, category: 'Boissons' },
  { id: '8', name: 'Eau 1.5L x6', price: 2000, stock: 40, category: 'Boissons' },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', products: [{ name: 'Riz 25kg', quantity: 2, price: 15000 }], total: 30000, paymentType: 'full', manager: 'Amadou', date: new Date(Date.now() - 3600000).toISOString() },
  { id: 't2', products: [{ name: 'Huile 5L', quantity: 1, price: 6500 }], total: 6500, paymentType: 'credit', manager: 'Fatou', date: new Date(Date.now() - 7200000).toISOString() },
  { id: 't3', products: [{ name: 'Sucre 1kg', quantity: 3, price: 1200 }], total: 3600, paymentType: 'full', manager: 'Amadou', date: new Date(Date.now() - 10800000).toISOString() },
];

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'stock', message: 'Stock faible: Café 250g (15 restants)', date: now(), read: false },
  { id: 'n2', type: 'credit', message: 'Crédit impayé: Client Diallo - 12,000 FCFA', date: now(), read: false },
  { id: 'n3', type: 'sale', message: 'Vente réalisée: 30,000 FCFA par Amadou', date: now(), read: true },
];

export const useStore = create<AppState>((set, get) => ({
  products: DEMO_PRODUCTS,
  cart: [],
  transactions: DEMO_TRANSACTIONS,
  expenses: [
    { id: 'e1', title: 'Loyer boutique', amount: 50000, description: 'Loyer mensuel', manager: 'Amadou', date: now() },
    { id: 'e2', title: 'Électricité', amount: 15000, description: 'Facture électricité', manager: 'Fatou', date: now() },
  ],
  managers: [
    { id: 'm1', name: 'Amadou Diallo', phone: '+225 07 00 00 01', commerce: 'Boutique Centre', active: true },
    { id: 'm2', name: 'Fatou Koné', phone: '+225 07 00 00 02', commerce: 'Boutique Marché', active: true },
  ],
  messages: [
    { id: 'msg1', from: 'Amadou', to: 'Propriétaire', text: 'Stock de riz bientôt épuisé', date: new Date(Date.now() - 1800000).toISOString() },
    { id: 'msg2', from: 'Propriétaire', to: 'Amadou', text: 'OK, je commande demain', date: new Date(Date.now() - 900000).toISOString() },
  ],
  notifications: DEMO_NOTIFICATIONS,
  isOnline: true,
  referralCode: 'KOBINA-4587',
  userLevel: 3,
  userPoints: 1250,
  badges: ['Vendeur Actif', 'Champion Ventes'],

  addProduct: (p) => set(s => ({ products: [...s.products, { ...p, id: uid() }] })),
  updateProduct: (id, p) => set(s => ({ products: s.products.map(x => x.id === id ? { ...x, ...p } : x) })),
  deleteProduct: (id) => set(s => ({ products: s.products.filter(x => x.id !== id) })),

  addToCart: (product) => set(s => {
    const existing = s.cart.find(c => c.product.id === product.id);
    if (existing) {
      return { cart: s.cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c) };
    }
    return { cart: [...s.cart, { product, quantity: 1 }] };
  }),
  removeFromCart: (productId) => set(s => ({ cart: s.cart.filter(c => c.product.id !== productId) })),
  updateCartQuantity: (productId, quantity) => set(s => {
    if (quantity <= 0) return { cart: s.cart.filter(c => c.product.id !== productId) };
    return { cart: s.cart.map(c => c.product.id === productId ? { ...c, quantity } : c) };
  }),
  clearCart: () => set({ cart: [] }),

  checkout: (paymentType, manager) => {
    const { cart, transactions, products } = get();
    if (cart.length === 0) return;
    const total = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
    const tx: Transaction = {
      id: uid(),
      products: cart.map(c => ({ name: c.product.name, quantity: c.quantity, price: c.product.price })),
      total,
      paymentType,
      manager,
      date: now(),
    };
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(c => c.product.id === p.id);
      if (cartItem) return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      return p;
    });
    set({
      transactions: [tx, ...transactions],
      cart: [],
      products: updatedProducts,
      notifications: [
        { id: uid(), type: 'sale', message: `Vente: ${total.toLocaleString()} FCFA par ${manager}`, date: now(), read: false },
        ...get().notifications,
      ],
    });
  },

  addExpense: (e) => set(s => ({ expenses: [{ ...e, id: uid(), date: now() }, ...s.expenses] })),
  addManager: (m) => set(s => ({ managers: [...s.managers, { ...m, id: uid() }] })),
  toggleManager: (id) => set(s => ({ managers: s.managers.map(m => m.id === id ? { ...m, active: !m.active } : m) })),
  deleteManager: (id) => set(s => ({ managers: s.managers.filter(m => m.id !== id) })),
  sendMessage: (msg) => set(s => ({ messages: [...s.messages, { ...msg, id: uid(), date: now() }] })),
  markNotificationRead: (id) => set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
  setOnline: (v) => set({ isOnline: v }),
}));
