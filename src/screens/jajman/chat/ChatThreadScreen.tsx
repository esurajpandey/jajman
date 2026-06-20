import { useParams } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Avatar } from '../../../components/ui/Avatar';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatComposer } from '../../../components/chat/ChatComposer';
import { useChatStore } from '../../../store/chatStore';
import { useDataStore } from '../../../store/dataStore';

export function ChatThreadScreen() {
  const { threadId = '' } = useParams();
  const thread = useChatStore((s) => s.getThread(threadId));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const togglePhoneShared = useChatStore((s) => s.togglePhoneShared);
  const pandit = useDataStore((s) => s.getPandit(thread?.panditId ?? ''));

  if (!thread) {
    return <><AppBar title="Chat" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Conversation not found.</div></>;
  }

  return (
    <>
      <AppBar
        title={<span className="flex items-center gap-2"><Avatar name={pandit?.name ?? '?'} size={28} />{pandit?.name}</span>}
        left={<BackButton />}
        right={
          <button type="button" onClick={() => togglePhoneShared(thread.id)} aria-label="Toggle phone sharing" aria-pressed={thread.phoneShared} className="p-2 text-muted">
            {thread.phoneShared ? <Phone size={18} className="text-primary" /> : <PhoneOff size={18} />}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-md bg-surface-2 p-2 text-center text-xs text-muted">
          {thread.phoneShared ? 'Your phone number is shared in this booking.' : 'Phone number hidden — chat only.'}
        </div>
        <div className="flex flex-col gap-2">
          {thread.messages.map((m) => <MessageBubble key={m.id} message={m} mine={m.senderId === 'me'} />)}
        </div>
      </div>
      <ChatComposer
        onSend={(text) => sendMessage(thread.id, 'me', text)}
        onAttach={() => sendMessage(thread.id, 'me', 'Shared a photo', 'venue.jpg')}
      />
    </>
  );
}
