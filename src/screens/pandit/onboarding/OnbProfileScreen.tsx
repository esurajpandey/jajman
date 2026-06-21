import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Chip } from '../../../components/ui/Chip';
import { Stepper } from '../../../components/ui/Stepper';
import { Avatar } from '../../../components/ui/Avatar';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

const LANGS = ['Hindi', 'Sanskrit', 'English', 'Marathi'];
const SPECS = ['Katha', 'Jaap', 'Marriage', 'Griha Pravesh', 'Festival Puja', 'Shradh', 'Temple Rituals'];

export function OnbProfileScreen() {
  const navigate = useNavigate();
  const draft = usePanditOnboardingStore((s) => s.draft);
  const patchProfile = usePanditOnboardingStore((s) => s.patchProfile);
  const setStep = usePanditOnboardingStore((s) => s.setStep);

  const [name, setName] = useState(draft.profile.name);
  const [about, setAbout] = useState(draft.profile.about);
  const [exp, setExp] = useState(draft.profile.experienceYears);
  const [langs, setLangs] = useState<string[]>(draft.profile.languages);
  const [specs, setSpecs] = useState<string[]>(draft.profile.specializations);
  const [city, setCity] = useState(draft.profile.city);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const valid = name.trim() && about.trim().length >= 10 && langs.length > 0 && specs.length > 0 && city.trim();

  const next = () => {
    patchProfile({ name: name.trim(), about: about.trim(), experienceYears: exp, languages: langs, specializations: specs, city: city.trim() });
    setStep(1);
    navigate('/pandit/onboarding/service');
  };

  return (
    <>
      <AppBar title="Your profile" left={<BackButton to="/pandit/onboarding" />} right={<Stepper total={5} current={0} />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={name || 'Pandit'} size={72} />
          <button type="button" className="text-xs font-medium text-primary">Add a photo (mock)</button>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Display name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="mb-1 block text-sm font-medium">About you</span>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} aria-label="About" rows={3} maxLength={500}
              placeholder="Your experience, traditions you specialise in…" className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          </div>
          <TextField label="Years of experience" name="experience" inputMode="numeric" value={String(exp)} onChange={(e) => setExp(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          <div>
            <span className="mb-1 block text-sm font-medium">Languages</span>
            <div className="flex flex-wrap gap-2">{LANGS.map((l) => <Chip key={l} label={l} selected={langs.includes(l)} onClick={() => toggle(langs, setLangs, l)} />)}</div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Specializations</span>
            <div className="flex flex-wrap gap-2">{SPECS.map((s) => <Chip key={s} label={s} selected={specs.includes(s)} onClick={() => toggle(specs, setSpecs, s)} />)}</div>
          </div>
          <TextField label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={next}>Save & continue</Button>
      </div>
    </>
  );
}
