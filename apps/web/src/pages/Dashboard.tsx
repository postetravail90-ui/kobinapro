import { motion } from 'framer-motion';
import { DollarSign, Receipt, Package, CreditCard, TrendingDown, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export default function Dashboard() {
  const transactions = useStore(s => s.transactions);
  const products = useStore(s => s.products);
  const expenses = useStore(s => s.expenses);

  const todaySales = transactions
    .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.total, 0);

  const totalCredits = transactions
    .filter(t => t.paymentType === 'credit')
    .reduce((sum, t) => sum + t.total, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const stats = [
    { label: 'Ventes aujourd\'hui', value: `${todaySales.toLocaleString()} F`, icon: DollarSign, color: 'bg-primary/10 text-primary', to: '/transactions' },
    { label: 'Transactions', value: transactions.length.toString(), icon: Receipt, color: 'bg-info/10 text-info', to: '/transactions' },
    { label: 'Produits', value: products.length.toString(), icon: Package, color: 'bg-secondary/10 text-secondary', to: '/produits' },
    { label: 'Crédits', value: `${totalCredits.toLocaleString()} F`, icon: CreditCard, color: 'bg-warning/10 text-warning', to: '/transactions' },
    { label: 'Dépenses', value: `${totalExpenses.toLocaleString()} F`, icon: TrendingDown, color: 'bg-destructive/10 text-destructive', to: '/depenses' },
  ];

  const recentTx = transactions.slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre commerce</p>
      </div>

      {/* Scrollable stat cards */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <NavLink
              to={stat.to}
              className="block min-w-[160px] bg-card card-float rounded-xl p-4 space-y-3"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xl font-bold text-card-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </NavLink>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <NavLink to="/caisse" className="bg-primary text-primary-foreground rounded-xl p-4 card-float flex items-center gap-3 font-semibold">
          <Receipt size={20} />
          Ouvrir la caisse
          <ArrowRight size={16} className="ml-auto" />
        </NavLink>
        <NavLink to="/produits" className="bg-card text-card-foreground rounded-xl p-4 card-float flex items-center gap-3 font-semibold border border-border">
          <Package size={20} />
          Voir produits
          <ArrowRight size={16} className="ml-auto" />
        </NavLink>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Transactions récentes</h2>
          <NavLink to="/transactions" className="text-sm text-primary font-medium">Voir tout</NavLink>
        </div>
        <div className="space-y-2">
          {recentTx.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card card-float rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {tx.products.map(p => p.name).join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">{tx.manager} · {new Date(tx.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-card-foreground">{tx.total.toLocaleString()} F</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  tx.paymentType === 'full' ? 'bg-success/15 text-success' :
                  tx.paymentType === 'half' ? 'bg-warning/15 text-warning' :
                  'bg-destructive/15 text-destructive'
                }`}>
                  {tx.paymentType === 'full' ? 'Payé' : tx.paymentType === 'half' ? 'Moitié' : 'Crédit'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
