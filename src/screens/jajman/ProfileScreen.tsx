import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  CalendarCheck,
  Heart,
  MapPin,
  Receipt,
  Star,
  Bell,
  Languages,
  LifeBuoy,
  LogOut,
  Gift,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MenuRow } from '../../components/profile/MenuRow';
import { useSessionStore } from '../../store/sessionStore';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  to?: string;
  badge?: string;
  disabled?: boolean;
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const panditStatus = useSessionStore((s) => s.panditStatus);
  const switchMode = useSessionStore((s) => s.switchMode);
  const logout = useSessionStore((s) => s.logout);
  const isPandit = (user?.roles ?? []).includes('pandit');

  const items: MenuItem[] = [
    { icon: CalendarCheck, label: 'My Bookings', to: '/app/bookings' },
    { icon: Heart, label: 'Favorites', to: '/app/favorites' },
    { icon: MapPin, label: 'Addresses', to: '/app/profile/addresses' },
    { icon: Receipt, label: 'Payment history', to: '/app/profile/payments' },
    { icon: Star, label: 'My reviews', to: '/app/profile/reviews' },
    { icon: Bell, label: 'Notification preferences', to: '/app/profile/notifications' },
    { icon: Languages, label: 'Language', to: '/app/profile/language' },
    { icon: Gift, label: 'Referral', badge: 'Soon', disabled: true },
    { icon: ShieldAlert, label: 'Disputes', badge: 'Soon', disabled: true },
    { icon: LifeBuoy, label: 'Help & Support', badge: 'Soon', disabled: true },
    { icon: SettingsIcon, label: 'Settings', to: '/app/settings' },
  ];

  return (
    <>
      <AppBar
        title="Profile"
        right={
          <button type="button" aria-label="Settings" onClick={() => navigate('/app/settings')} className="p-2 text-muted">
            <SettingsIcon size={18} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto pb-4">
        <button type="button" onClick={() => navigate('/app/profile/edit')} className="flex w-full items-center gap-3 p-4 text-left">
          <Avatar name={user?.name ?? 'Devotee'} size={56} />
          <div className="min-w-0">
            <p className="font-semibold">{user?.name ?? 'Devotee'}</p>
            <p className="text-sm text-muted">{user?.phone || '—'}</p>
            <span className="text-xs font-medium text-primary">Edit profile</span>
          </div>
        </button>

        <Card className="mx-4 mb-2 flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">You're in Jajman mode</p>
            <p className="text-xs text-muted">{isPandit ? 'Switch to your pandit dashboard' : 'Offer pujas as a pandit'}</p>
          </div>
          {panditStatus === 'pending' ? (
            <Badge className="bg-warning/15 text-warning">Approval pending</Badge>
          ) : isPandit ? (
            <Button variant="outline" onClick={() => { switchMode('pandit'); navigate('/'); }}>Switch to Pandit</Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/app/become-pandit')}>Become a Pandit</Button>
          )}
        </Card>

        <div className="mt-1 divide-y divide-border border-y border-border">
          {items.map((it) => (
            <MenuRow
              key={it.label}
              icon={it.icon}
              label={it.label}
              badge={it.badge}
              disabled={it.disabled}
              onClick={it.to ? () => navigate(it.to as string) : undefined}
            />
          ))}
          <MenuRow icon={LogOut} label="Logout" onClick={() => { logout(); navigate('/', { replace: true }); }} />
        </div>
      </div>
    </>
  );
}
