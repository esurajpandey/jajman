import { NavLink } from 'react-router-dom';
import { Home, Search, CalendarCheck, Heart, User, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const jajmanTabs: TabItem[] = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/search', label: 'Explore', icon: Search },
  { to: '/app/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/app/favorites', label: 'Favorites', icon: Heart },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export function BottomTabBar({ tabs = jajmanTabs }: { tabs?: TabItem[] }) {
  return (
    <nav className="flex items-stretch border-t border-border bg-surface">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]',
                isActive ? 'text-primary' : 'text-muted',
              )
            }
          >
            <Icon size={20} />
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
