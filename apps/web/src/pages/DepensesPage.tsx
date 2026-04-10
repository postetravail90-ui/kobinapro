import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export default function DepensesPage() {
  const { expenses, addExpense } = useStore();
  const [form, setForm] = useState({ title: '', amount: '', description: '', manager: '' });

  const handleSubmit = () => {
    if (!form.title || !form.amount) { toast.error('Remplissez les champs obligatoires'); return; }
    addExpense({ title: form.title, amount: Number(form.amount), description: form.description, manager: form.manager || 'Gérant' });
    setForm({ title: '', amount: '', description: '', manager: '' });
    toast.success('Dépense enregistrée');
  };

  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dépenses</h1>

      {/* Form */}
      <div className="bg-card card-float rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-card-foreground">Nouvelle dépense</h2>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre *" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Montant (FCFA) *" type="number" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
        <button onClick={handleSubmit} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm touch-target flex items-center justify-center gap-2">
          <Plus size={18} /> Enregistrer la dépense
        </button>
      </div>

      {/* Summary */}
      <div className="bg-card card-float rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Dépenses du jour</span>
          <span className="text-lg font-bold text-foreground">{todayTotal.toLocaleString()} F</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {expenses.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card card-float rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.manager} · {new Date(e.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <span className="text-sm font-bold text-destructive">{e.amount.toLocaleString()} F</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
