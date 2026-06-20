import type { ChatThread } from '../../mock/types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useDataStore } from '../../store/dataStore';

export function ConversationRow({ thread, onClick }: { thread: ChatThread; onClick: () => void }) {
  const pandit = useDataStore((s) => s.getPandit(thread.panditId));
  const last = thread.messages.at(-1);
  return (
    <Card role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`Chat with ${pandit?.name ?? 'pandit'}`} className="flex cursor-pointer items-center gap-3 p-3">
      <Avatar name={pandit?.name ?? '?'} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pandit?.name}</p>
        <p className="truncate text-xs text-muted">{last ? last.text : 'No messages yet'}</p>
      </div>
    </Card>
  );
}
