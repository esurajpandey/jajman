import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { BellOff } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { NotificationRow } from '../../../components/comms/NotificationRow';
import { useNotificationStore } from '../../../store/notificationStore';

export function NotificationsScreen() {
  const navigate = useNavigate();
  const notifications = useNotificationStore(useShallow((s) => s.getNotifications()));
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const open = (id: string, link?: string) => {
    markRead(id);
    if (link) navigate(link);
  };

  return (
    <>
      <AppBar
        title="Notifications"
        left={<BackButton />}
        right={<button type="button" onClick={markAllRead} className="px-2 text-xs font-medium text-primary">Mark all read</button>}
      />
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <BellOff size={36} className="text-muted" />
            <p className="text-sm text-muted">You're all caught up.</p>
          </div>
        ) : (
          notifications.map((n) => <NotificationRow key={n.id} n={n} onClick={() => open(n.id, n.link)} />)
        )}
      </div>
    </>
  );
}
