import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TextField } from '../../../components/ui/TextField';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

export function OnbCustomPujaScreen() {
  const navigate = useNavigate();
  const categories = useDataStore((s) => s.categories);
  const addCustomPuja = usePanditOnboardingStore((s) => s.addCustomPuja);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [charge, setCharge] = useState('');
  const [add, setAdd] = useState('');
  const [duration, setDuration] = useState('');

  const chargeNum = Number(charge) || 0;
  const valid = name.trim() && chargeNum > 0;
  const total = chargeNum + (Number(add) || 0);

  const submit = () => {
    addCustomPuja({ name: name.trim(), categoryId, description: description.trim(), charge: chargeNum, additionalCharge: Number(add) || 0, durationMins: Number(duration) || 60 });
    navigate('/pandit/onboarding/pujas');
  };

  return (
    <>
      <AppBar title="Create custom puja" left={<BackButton to="/pandit/onboarding/pujas" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-md bg-secondary/10 p-3 text-center">
          <Badge className="bg-secondary/15 text-secondary">Custom puja</Badge>
          <p className="mt-1 text-xs text-muted">Additional charges apply and are shown to jajmans at booking.</p>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Puja name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="mb-1 block text-sm font-medium">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category" className="h-12 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" rows={3} className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          </div>
          <TextField label="Base charge (₹)" name="charge" inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value.replace(/\D/g, ''))} />
          <TextField label="Additional charge (₹)" name="add" inputMode="numeric" value={add} onChange={(e) => setAdd(e.target.value.replace(/\D/g, ''))} />
          <TextField label="Duration (min)" name="duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} placeholder="60" />
          <p className="text-sm font-medium">Total quoted: ₹{total}</p>
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={submit}>Add custom puja</Button>
      </div>
    </>
  );
}
