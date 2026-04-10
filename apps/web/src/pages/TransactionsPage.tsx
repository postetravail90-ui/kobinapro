import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function TransactionsPage() {
  const transactions = useStore(s => s.transactions);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">{transactions.length} transactions</p>
      </div>

      <div className="space-y-2">
        {transactions.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card card-float rounded-xl p-4 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 mt-0.5">
              <Receipt size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">
                {tx.products.map(p => `${p.name} x${p.quantity}`).join(', ')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">👤 {tx.manager}</span>
                <span className="text-xs text-muted-foreground">📅 {new Date(tx.date).toLocaleDateString('fr-FR')}</span>
                <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-card-foreground">{tx.total.toLocaleString()} F</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
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
  );
}
