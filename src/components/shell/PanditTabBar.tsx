import { LayoutDashboard, Inbox, CalendarDays, Wallet, User, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface Tab { to: string; label: string; icon: LucideIcon; }
export const panditTabs: Tab[] = [
  { to: '/pandit/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pandit/requests', label: 'Requests', icon: Inbox },
  { to: '/pandit/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/pandit/earnings', label: 'Earnings', icon: Wallet },
  { to: '/pandit/profile', label: 'Profile', icon: User },
];

export function PanditTabBar() {
  return (
    <nav aria-label="Pandit navigation" className="flex items-stretch border-t border-border bg-surface">
      {panditTabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink key={t.to} to={t.to}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]', isActive ? 'text-primary' : 'text-muted')}>
            <Icon size={20} />
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
