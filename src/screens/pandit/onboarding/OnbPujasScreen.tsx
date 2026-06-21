import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Stepper } from '../../../components/ui/Stepper';
import { PujaChargeSheet } from './PujaChargeSheet';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import type { Puja } from '../../../mock/types';

export function OnbPujasScreen() {
  const navigate = useNavigate();
  const pujas = useDataStore((s) => s.pujas);
  const draft = usePanditOnboardingStore(useShallow((s) => s.draft));
  const addSupportedPuja = usePanditOnboardingStore((s) => s.addSupportedPuja);
  const removeSupportedPuja = usePanditOnboardingStore((s) => s.removeSupportedPuja);
  const removeCustomPuja = usePanditOnboardingStore((s) => s.removeCustomPuja);
  const setStep = usePanditOnboardingStore((s) => s.setStep);
  const [sheetPuja, setSheetPuja] = useState<Puja | null>(null);

  const isSelected = (id: string) => draft.supportedPujas.some((sp) => sp.pujaId === id);
  const totalSelected = draft.supportedPujas.length + draft.customPujas.length;

  const next = () => { setStep(3); navigate('/pandit/onboarding/documents'); };

  return (
    <>
      <AppBar title="Your pujas" left={<BackButton to="/pandit/onboarding/service" />} right={<Stepper total={5} current={2} />} />
      <div className="flex-1 overflow-y-auto p-4">
        {totalSelected > 0 && <Badge className="mb-3 bg-primary/10 text-primary">Selected ({totalSelected})</Badge>}

        <div className="flex flex-col gap-2">
          {pujas.map((p) => {
            const selected = isSelected(p.id);
            return (
              <Card key={p.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.suggestedDurationMins} min · ₹{p.minAmount}–₹{p.maxAmount}</p>
                </div>
                {selected ? (
                  <Button variant="outline" onClick={() => removeSupportedPuja(p.id)}><Check size={16} /> Added</Button>
                ) : (
                  <Button variant="outline" onClick={() => setSheetPuja(p)}><Plus size={16} /> Add</Button>
                )}
              </Card>
            );
          })}

          {draft.customPujas.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium">{c.name} <Badge className="bg-secondary/10 text-secondary">Custom</Badge></p>
                <p className="text-xs text-muted">₹{c.charge}{c.additionalCharge ? ` + ₹${c.additionalCharge}` : ''} · {c.durationMins} min</p>
              </div>
              <Button variant="outline" onClick={() => removeCustomPuja(c.id)}>Remove</Button>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/pandit/onboarding/pujas/custom')}><Plus size={16} /> Create custom puja</Button>
      </div>

      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={totalSelected === 0} onClick={next}>Save & continue</Button>
      </div>

      <PujaChargeSheet
        key={sheetPuja?.id ?? 'none'}
        puja={sheetPuja}
        open={sheetPuja !== null}
        onClose={() => setSheetPuja(null)}
        onAdd={(charge, durationMins) => { if (sheetPuja) addSupportedPuja({ pujaId: sheetPuja.id, charge, durationMins }); setSheetPuja(null); }}
      />
    </>
  );
}
