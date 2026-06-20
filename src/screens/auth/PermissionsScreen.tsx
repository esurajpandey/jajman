import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function PermissionsScreen() {
  const navigate = useNavigate();
  const row = (icon: ReactNode, title: string, body: string) => (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted">{body}</p>
      </div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">A couple of permissions</h1>
      <p className="mt-1 text-sm text-muted">These help us match nearby pandits and keep you updated.</p>
      <div className="mt-6 flex flex-col gap-3">
        {row(<MapPin size={20} />, 'Location', 'Find pandits near your address and show travel distance.')}
        {row(<Bell size={20} />, 'Notifications', 'Booking updates, pandit responses, and reminders.')}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Button className="w-full" onClick={() => navigate('/auth/profile-setup')}>Allow & continue</Button>
        <button type="button" onClick={() => navigate('/auth/profile-setup')} className="text-center text-sm text-muted">
          Not now
        </button>
      </div>
    </div>
  );
}
