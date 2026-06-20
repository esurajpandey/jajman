import dayjs from 'dayjs';
import { Paperclip } from 'lucide-react';
import type { ChatMessage } from '../../mock/types';
import { cn } from '../../lib/cn';

export function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-text')}>
        {message.attachmentName && (
          <span className="mb-1 flex items-center gap-1 text-xs opacity-80"><Paperclip size={12} />{message.attachmentName}</span>
        )}
        <p>{message.text}</p>
        <span className={cn('mt-0.5 block text-[10px]', mine ? 'text-primary-fg/70' : 'text-muted')}>{dayjs(message.sentAt).format('h:mm A')}</span>
      </div>
    </div>
  );
}
