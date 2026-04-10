import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function MessagesPage() {
  const { messages, sendMessage } = useStore();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage({ from: 'Propriétaire', to: 'Amadou', text: text.trim() });
    setText('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
        <p className="text-xs text-muted-foreground">Chat propriétaire ↔ gérant</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex ${msg.from === 'Propriétaire' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              msg.from === 'Propriétaire'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-card text-card-foreground border border-border rounded-bl-md'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.from === 'Propriétaire' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Écrire un message..."
          className="flex-1 h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center touch-target">
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  );
}
