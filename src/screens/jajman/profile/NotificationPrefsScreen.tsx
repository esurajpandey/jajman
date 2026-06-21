import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { useSessionStore } from '../../../store/sessionStore';

export function NotificationPrefsScreen() {
  const prefs = useSessionStore((s) => s.notificationPrefs);
  const set = useSessionStore((s) => s.setNotificationPref);

  return (
    <>
      <AppBar title="Notification Preferences" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Channels</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="SMS" checked={prefs.sms} onChange={(v) => set('sms', v)} />
          <ToggleRow label="WhatsApp" checked={prefs.whatsapp} onChange={(v) => set('whatsapp', v)} />
          <ToggleRow label="Email / Push" description="Coming soon" checked={false} onChange={() => {}} disabled />
        </div>

        <h2 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Notify me about</h2>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Booking updates" checked={prefs.bookingUpdates} onChange={(v) => set('bookingUpdates', v)} />
          <ToggleRow label="Payment reminders" checked={prefs.paymentReminders} onChange={(v) => set('paymentReminders', v)} />
          <ToggleRow label="Promotions" checked={prefs.promotions} onChange={(v) => set('promotions', v)} />
          <ToggleRow label="Referral" checked={prefs.referral} onChange={(v) => set('referral', v)} />
          <ToggleRow label="Reviews" checked={prefs.reviews} onChange={(v) => set('reviews', v)} />
        </div>
      </div>
    </>
  );
}
