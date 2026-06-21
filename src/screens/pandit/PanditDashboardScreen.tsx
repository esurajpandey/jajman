import { AppBar } from '../../components/ui/AppBar';
import { useSessionStore } from '../../store/sessionStore';

export function PanditDashboardScreen() {
  const name = useSessionStore((s) => s.user?.name ?? 'Pandit');
  return (
    <>
      <AppBar title={`Namaste, ${name}`} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-md border border-success/30 bg-success/5 p-4 text-center">
          <p className="font-semibold text-success">You're approved 🎉</p>
          <p className="text-sm text-muted">Your pandit dashboard arrives in the next build phase (P3b).</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">Dashboard widgets (today's bookings, requests, earnings, ratings) coming soon.</p>
      </div>
    </>
  );
}
