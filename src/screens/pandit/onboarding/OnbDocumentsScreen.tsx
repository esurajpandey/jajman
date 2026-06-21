import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { FileText, X } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

const TILES = ['ID proof', 'Certificate', 'Other'];

export function OnbDocumentsScreen() {
  const navigate = useNavigate();
  const docs = usePanditOnboardingStore(useShallow((s) => s.draft.documents));
  const addDocument = usePanditOnboardingStore((s) => s.addDocument);
  const removeDocument = usePanditOnboardingStore((s) => s.removeDocument);
  const setStep = usePanditOnboardingStore((s) => s.setStep);
  const proceed = () => { setStep(4); navigate('/pandit/onboarding/availability'); };

  return (
    <>
      <AppBar title="Documents (optional)" left={<BackButton to="/pandit/onboarding/pujas" />} right={<Stepper total={5} current={3} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-info/10 p-3 text-xs text-info">Optional — speeds up admin review but isn't required.</div>
        <div className="flex flex-col gap-2">
          {TILES.map((label) => (
            <button key={label} type="button" onClick={() => addDocument(label)} className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm">
              <FileText size={18} className="text-muted" /> Upload {label} (mock)
            </button>
          ))}
        </div>
        {docs.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                <FileText size={16} /> <span className="flex-1">{d.label} — {d.name}</span>
                <button type="button" aria-label={`Remove ${d.label}`} onClick={() => removeDocument(d.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={proceed}>Skip</Button>
        <Button className="flex-1" onClick={proceed}>Save & continue</Button>
      </div>
    </>
  );
}
