import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { Card } from '../../components/ui/Card';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { acceptCharges } from '../../domain/charges';

export function AcceptRequestScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const request = usePanditBookingStore((s) => s.getRequest(id));
  const accept = usePanditBookingStore((s) => s.accept);

  const [chargeTravel, setChargeTravel] = useState(false);
  const [travel, setTravel] = useState('');
  const [lines, setLines] = useState<{ label: string; amount: string }[]>([]);

  if (!request) {
    return <><AppBar title="Accept Request" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Request not found.</div></>;
  }

  const travelNum = chargeTravel ? Number(travel) || 0 : 0;
  const additional = lines.filter((l) => l.label.trim() && Number(l.amount) > 0).map((l) => ({ label: l.label.trim(), amount: Number(l.amount) }));
  const additionalTotal = additional.reduce((s, x) => s + x.amount, 0);
  const c = acceptCharges(request.charges.base, travelNum, additionalTotal, request.isEmergency);

  const confirm = () => {
    accept(request.id, { travel: travelNum, additionalCharges: additional });
    navigate('/pandit/requests', { replace: true });
  };

  return (
    <>
      <AppBar title="Accept Request" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Puja charge</span><span>₹{request.charges.base}</span></div>
          {c.emergencySurcharge > 0 && <div className="flex justify-between py-0.5"><span className="text-muted">Urgent surcharge</span><span>₹{c.emergencySurcharge}</span></div>}
        </Card>

        <div className="mt-4 rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Add travel charge" checked={chargeTravel} onChange={setChargeTravel} />
        </div>
        {chargeTravel && (
          <div className="mt-2"><TextField label="Travel charge (₹)" name="travel" inputMode="numeric" value={travel} onChange={(e) => setTravel(e.target.value.replace(/\D/g, ''))} /></div>
        )}

        <h2 className="mb-1 mt-5 text-sm font-semibold">Additional charges</h2>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 flex items-end gap-2">
            <TextField label="Label" name={`label-${i}`} value={l.label} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <TextField label="₹" name={`amount-${i}`} inputMode="numeric" value={l.amount} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, '') } : x)))} />
            <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="mb-3 text-muted"><X size={16} /></button>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={() => setLines((ls) => [...ls, { label: '', amount: '' }])}><Plus size={16} /> Add charge line</Button>

        <Card className="mt-5 p-3 text-sm">
          <div className="flex justify-between py-0.5"><span className="text-muted">Travel</span><span>₹{c.travel}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-muted">Additional</span><span>₹{c.additionalTotal}</span></div>
          <div className="my-1 border-t border-border" />
          <div className="flex justify-between py-0.5 font-semibold"><span>Total to jajman</span><span>₹{c.subtotal}</span></div>
          <div className="flex justify-between py-0.5 text-primary"><span>Advance (30%)</span><span>₹{c.advance}</span></div>
        </Card>
        <p className="mt-2 text-xs text-muted">The jajman will be asked to pay the advance to confirm.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={confirm}>Confirm &amp; Accept</Button>
      </div>
    </>
  );
}
