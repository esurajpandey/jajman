import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ConversationRow } from '../../../components/chat/ConversationRow';
import { useChatStore } from '../../../store/chatStore';

export function ConversationsListScreen() {
  const navigate = useNavigate();
  const threads = useChatStore(useShallow((s) => s.threads));

  return (
    <>
      <AppBar title="Messages" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center"><div className="text-4xl">💬</div><p className="text-sm text-muted">No conversations yet. Chat opens after you request a booking.</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {threads.map((t) => <ConversationRow key={t.id} thread={t} onClick={() => navigate(`/app/chat/${t.id}`)} />)}
          </div>
        )}
      </div>
    </>
  );
}
