import { CalendarCheck, CreditCard, Clock, ShieldAlert, Bell, Gift, Star, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotifType } from '../../mock/types';

const ICON: Record<NotifType, LucideIcon> = {
  booking: CalendarCheck,
  payment: CreditCard,
  request: Clock,
  dispute: ShieldAlert,
  system: Bell,
  referral: Gift,
  review: Star,
};

export function NotificationRow({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const Icon = ICON[n.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
          {!n.read && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </span>
        <span className="block text-xs text-muted">{n.body}</span>
        <span className="mt-0.5 block text-[11px] text-muted">{n.createdAt.slice(0, 10)}</span>
      </span>
    </button>
  );
}
