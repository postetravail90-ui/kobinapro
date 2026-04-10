import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserX, Trash2, X, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export default function GerantsPage() {
  const { managers, addManager, toggleManager, deleteManager } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', commerce: '' });

  const handleSubmit = () => {
    if (!form.name || !form.phone) { toast.error('Remplissez les champs obligatoires'); return; }
    addManager({ ...form, active: true });
    setForm({ name: '', phone: '', commerce: '' });
    setShowForm(false);
    toast.success('Gérant créé');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gérants</h1>
          <p className="text-sm text-muted-foreground">{managers.length} gérants</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 touch-target">
          <Plus size={18} /> Créer gérant
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-card-foreground">Créer un gérant</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom complet *" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Téléphone *" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <input value={form.commerce} onChange={e => setForm(f => ({ ...f, commerce: e.target.value }))} placeholder="Commerce" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <button onClick={handleSubmit} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold touch-target">Créer</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {managers.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-card card-float rounded-xl p-4 flex items-center gap-3 ${!m.active ? 'opacity-50' : ''}`}>
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {m.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground">📞 {m.phone}</p>
              <p className="text-xs text-muted-foreground">🏪 {m.commerce}</p>
            </div>
            <button onClick={() => { toggleManager(m.id); toast.success(m.active ? 'Gérant désactivé' : 'Gérant activé'); }} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground touch-target">
              <UserX size={16} />
            </button>
            <button onClick={() => { deleteManager(m.id); toast.success('Gérant supprimé'); }} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center touch-target">
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
