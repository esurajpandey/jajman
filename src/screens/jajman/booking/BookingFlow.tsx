import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Stepper } from '../../../components/ui/Stepper';
import { SlotPicker } from '../../../components/booking/SlotPicker';
import { AddressPicker } from '../../../components/booking/AddressPicker';
import { AttachmentUploader } from '../../../components/booking/AttachmentUploader';
import { MoneyBreakdown } from '../../../components/ui/MoneyBreakdown';
import { useDataStore } from '../../../store/dataStore';
import { useBookingStore } from '../../../store/bookingStore';
import { computeCharges, travelEstimate } from '../../../domain/charges';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';

const STEP_TITLES = ['Puja', 'Date & time', 'Address', 'Details', 'Review'];

export function BookingFlow() {
  const navigate = useNavigate();
  const { panditId = '' } = useParams();
  const [params] = useSearchParams();
  const isEmergency = params.get('urgent') === '1';

  const pandit = useDataStore((s) => s.getPandit(panditId));
  const pujas = useDataStore((s) => s.pujas);
  const addresses = useBookingStore((s) => s.addresses);
  const draft = useBookingStore((s) => s.draft);
  const startDraft = useBookingStore((s) => s.startDraft);
  const patchDraft = useBookingStore((s) => s.patchDraft);
  const createBooking = useBookingStore((s) => s.createBookingFromDraft);
  const [step, setStep] = useState(0);
  const [showAddrNote, setShowAddrNote] = useState(false);
  const slotBaseISO = dayjs().startOf('day').add(isEmergency ? 0 : 1, 'day').toISOString();

  useEffect(() => {
    startDraft(panditId, { isEmergency, type: 'single' });
  }, [panditId, isEmergency, startDraft]);

  if (!pandit || !draft) {
    return <><AppBar title="Book" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Loading…</div></>;
  }

  const supported = pandit.supportedPujas;
  const canNext =
    (step === 0 && !!draft.pujaId) ||
    (step === 1 && !!draft.pujaStartISO) ||
    (step === 2 && !!draft.addressId) ||
    step === 3;

  const submit = () => {
    const booking = createBooking(dayjs().toISOString());
    navigate(`/app/booking/${booking.id}/sent`, { replace: true });
  };

  const base = draft.pujaId ? supported.find((s) => s.pujaId === draft.pujaId)?.charge ?? 0 : 0;
  const charges = computeCharges(base, travelEstimate(pandit.distanceKm), draft.isEmergency);

  return (
    <>
      <AppBar
        title={isEmergency ? 'Urgent booking' : `Book ${pandit.name}`}
        left={<BackButton />}
      />
      <div className="border-b border-border px-4 py-3">
        <Stepper total={STEP_TITLES.length} current={step} />
        <p className="mt-2 text-sm font-medium">{STEP_TITLES[step]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === 0 && (
          <div className="flex flex-col gap-2">
            {supported.length === 0 && <p className="text-sm text-muted">This pandit has no pujas configured.</p>}
            {supported.map((sp) => {
              const puja = pujas.find((p) => p.id === sp.pujaId);
              return (
                <button
                  key={sp.pujaId}
                  type="button"
                  onClick={() => patchDraft({ pujaId: sp.pujaId })}
                  className={`flex items-center justify-between rounded-md border p-3 text-left ${draft.pujaId === sp.pujaId ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <span><span className="block text-sm font-medium">{puja?.name}</span><span className="block text-xs text-muted">{sp.durationMins} min</span></span>
                  <span className="font-semibold">₹{sp.charge}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <SlotPicker
            baseDateISO={slotBaseISO}
            selectedISO={draft.pujaStartISO}
            onSelect={(iso, label) => patchDraft({ pujaStartISO: iso, slotLabel: label })}
          />
        )}

        {step === 2 && (
          <>
            <AddressPicker
              addresses={addresses}
              selectedId={draft.addressId}
              onSelect={(id) => patchDraft({ addressId: id })}
              onAdd={() => setShowAddrNote(true)}
            />
            {showAddrNote && <p className="mt-2 text-xs text-muted">Adding new addresses arrives with Address Management (coming soon).</p>}
          </>
        )}

        {step === 3 && (
          <AttachmentUploader
            attachments={draft.attachments}
            notes={draft.notes}
            onAdd={(kind) => patchDraft({ attachments: [...draft.attachments, { id: nanoid(5), kind, name: kind === 'image' ? 'Photo.jpg' : 'Document.pdf' }] })}
            onRemove={(id) => patchDraft({ attachments: draft.attachments.filter((a) => a.id !== id) })}
            onNotes={(v) => patchDraft({ notes: v })}
          />
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium">{pujas.find((p) => p.id === draft.pujaId)?.name}</p>
              <p className="text-muted">{draft.slotLabel}</p>
              <p className="text-muted">{addresses.find((a) => a.id === draft.addressId)?.label}</p>
              {draft.isEmergency && <p className="mt-1 text-error">Urgent · same-day surcharge applies</p>}
            </div>
            <MoneyBreakdown charges={{ base: charges.base, travel: charges.travel, emergencySurcharge: charges.emergencySurcharge, subtotal: charges.subtotal }} advance={charges.advance} remaining={charges.remaining} />
            <p className="text-xs text-muted">You'll pay the advance after the pandit accepts (within 24h). The advance is an estimate and is confirmed on acceptance.</p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {step < 4 ? (
          <Button className="w-full" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button className="w-full" onClick={submit}>Send booking request</Button>
        )}
      </div>
    </>
  );
}
