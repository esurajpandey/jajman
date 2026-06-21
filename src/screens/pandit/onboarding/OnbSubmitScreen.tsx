import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import { useSessionStore } from '../../../store/sessionStore';

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <Card className="flex items-center justify-between gap-2 p-3">
      <div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="truncate text-sm font-medium">{value}</p></div>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-primary">Edit</button>
    </Card>
  );
}

export function OnbSubmitScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft));
  const submit = usePanditOnboardingStore((s) => s.submit);
  const userId = useSessionStore((s) => s.user?.id ?? 'user');
  const becomePandit = useSessionStore((s) => s.becomePandit);
  const switchMode = useSessionStore((s) => s.switchMode);
  const [agree, setAgree] = useState(false);

  const go = () => {
    becomePandit();
    switchMode('pandit');
    submit(userId, new Date().toISOString());
    navigate('/pandit/pending-approval', { replace: true });
  };

  const pujaCount = draft.supportedPujas.length + draft.customPujas.length;

  return (
    <>
      <AppBar title="Review & submit" left={<BackButton to="/pandit/onboarding/availability" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <Row label="Profile" value={`${draft.profile.name || '—'} · ${draft.profile.experienceYears}y`} onEdit={() => navigate('/pandit/onboarding/profile')} />
          <Row label="Service area" value={`${draft.service.radiusKm} km · ${draft.service.travelPreference}`} onEdit={() => navigate('/pandit/onboarding/service')} />
          <Row label="Pujas" value={`${pujaCount} selected${draft.customPujas.length ? ` (${draft.customPujas.length} custom)` : ''}`} onEdit={() => navigate('/pandit/onboarding/pujas')} />
          <Row label="Documents" value={`${draft.documents.length} uploaded`} onEdit={() => navigate('/pandit/onboarding/documents')} />
          <Row label="Availability" value={`${draft.availability.recurring.length} weekly · ${draft.availability.slots.length} dated`} onEdit={() => navigate('/pandit/onboarding/availability')} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-label="Information is accurate" className="h-4 w-4 accent-[var(--color-primary)]" />
          The information provided is accurate.
        </label>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!agree} onClick={go}>Submit for approval</Button>
      </div>
    </>
  );
}
