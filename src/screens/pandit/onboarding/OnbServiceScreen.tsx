import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Stepper } from '../../../components/ui/Stepper';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { OnboardingService } from '../../../mock/types';

type Pref = OnboardingService['travelPreference'];

export function OnbServiceScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore((s) => s.draft);
  const patchService = usePanditOnboardingStore((s) => s.patchService);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [radius, setRadius] = useState(draft.service.radiusKm);
  const [pref, setPref] = useState<Pref>(draft.service.travelPreference);
  const [charge, setCharge] = useState(draft.service.chargeForTravel);
  const [baseFee, setBaseFee] = useState(draft.service.baseTravelFee);
  const [perKm, setPerKm] = useState(draft.service.perKmRate);

  const valid = radius > 0 && (!charge || (baseFee >= 0 && perKm >= 0));
  const next = () => {
    patchService({ radiusKm: radius, travelPreference: pref, chargeForTravel: charge, baseTravelFee: baseFee, perKmRate: perKm });
    setStep(2);
    navigate('/pandit/onboarding/pujas');
  };

  return (
    <>
      <AppBar title="Service area" left={<BackButton to="/pandit/onboarding/profile" />} right={<Stepper total={5} current={1} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <label className="block text-sm font-medium">Service radius: <span className="text-primary">{radius} km</span></label>
        <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Service radius" className="mt-2 w-full accent-[var(--color-primary)]" />
        <div className="mt-2 flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-8 text-xs text-muted">🗺️ Service area (mock)</div>

        <span className="mb-1 mt-5 block text-sm font-medium">Travel preference</span>
        <SegmentedControl<Pref>
          segments={[{ value: 'within', label: 'Within' }, { value: 'outside', label: 'Outside' }, { value: 'anywhere', label: 'Anywhere' }]}
          value={pref} onChange={setPref} />

        <div className="mt-5 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Charge for travel" checked={charge} onChange={setCharge} />
        </div>
        {charge && (
          <div className="mt-3 flex flex-col gap-3">
            <TextField label="Base travel fee (₹)" name="baseFee" inputMode="numeric" value={String(baseFee)} onChange={(e) => setBaseFee(Number(e.target.value.replace(/\D/g, '')) || 0)} />
            <TextField label="Per-km rate (₹)" name="perKm" inputMode="numeric" value={String(perKm)} onChange={(e) => setPerKm(Number(e.target.value.replace(/\D/g, '')) || 0)} />
            <p className="text-xs text-muted">Final travel charge is confirmed at booking acceptance.</p>
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={next}>Save & continue</Button>
      </div>
    </>
  );
}
