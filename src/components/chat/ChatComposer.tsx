import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

export function ChatComposer({ onSend, onAttach }: { onSend: (text: string) => void; onAttach: () => void }) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface p-2">
      <button type="button" onClick={onAttach} aria-label="Attach" className="p-2 text-muted"><Paperclip size={20} /></button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        placeholder="Message…"
        aria-label="Message"
        className="h-10 flex-1 rounded-full bg-surface-2 px-4 text-sm outline-none"
      />
      <button type="button" onClick={send} aria-label="Send" disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-fg disabled:opacity-40">
        <Send size={18} />
      </button>
    </div>
  );
}
