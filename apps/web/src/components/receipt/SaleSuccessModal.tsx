import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { CheckCircle2, Printer, Share2, X } from 'lucide-react';
import { receiptNumber, paymentLabel, printReceipt, shareReceipt, type ReceiptData } from '@/lib/receipt-utils';
import { toast } from 'sonner';

const CONFETTI = ['🎉', '💰', '🔥', '⭐', '✨', '🎊', '💎', '🏆'];

interface Props {
  show: boolean;
  receiptData: ReceiptData | null;
  onClose: () => void;
  onOpenReceipt: () => void;
}

export default function SaleSuccessModal({ show, receiptData, onClose, onOpenReceipt }: Props) {
  useEffect(() => {
    if (show && navigator.vibrate) navigator.vibrate([50, 30, 50]);
  }, [show]);

  if (!receiptData) return null;

  const recNo = receiptNumber(receiptData.id, receiptData.date);
  const d = new Date(receiptData.date);
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    try {
      printReceipt(receiptData);
    } catch {
      toast.error('Impossible d\'imprimer');
    }
  };

  const handleShare = async () => {
    try {
      await shareReceipt(receiptData);
      toast.success(navigator.share ? 'Partagé !' : 'Copié !');
    } catch {
      toast.error('Partage impossible');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Confetti */}
          {CONFETTI.map((emoji, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 400 - 100,
                scale: [0, 1.5, 0.5],
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.5, delay: i * 0.08, ease: 'easeOut' }}
              className="absolute text-2xl pointer-events-none"
            >
              {emoji}
            </motion.span>
          ))}

          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="bg-card rounded-3xl p-6 shadow-2xl text-center max-w-[320px] mx-4 w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted flex items-center justify-center"
            >
              <X size={14} />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 size={32} className="text-primary" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-extrabold text-foreground mb-0.5"
            >
              {receiptData.totalFinal.toLocaleString()} F
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-muted-foreground mb-1"
            >
              Vente enregistrée avec succès !
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-5"
            >
              <span>🕐 {timeStr}</span>
              <span>#{recNo.slice(-8)}</span>
              <span>{paymentLabel(receiptData.type)}</span>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <button
                onClick={() => { onClose(); onOpenReceipt(); }}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Printer size={18} /> Tirer le reçu
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  className="h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-1.5 border border-border active:scale-[0.97] transition-transform"
                >
                  <Share2 size={16} /> Partager
                </button>
                <button
                  onClick={onClose}
                  className="h-11 rounded-xl bg-muted text-muted-foreground font-semibold text-sm flex items-center justify-center active:scale-[0.97] transition-transform"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
