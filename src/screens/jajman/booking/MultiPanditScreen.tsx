import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Users, UserCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { useDataStore } from '../../../store/dataStore';
import { cn } from '../../../lib/cn';

export function MultiPanditScreen() {
  const navigate = useNavigate();
  const pandits = useDataStore(useShallow((s) => s.getApprovedPandits()));
  const [mode, setMode] = useState<'build' | 'lead' | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const [lead, setLead] = useState<string | null>(null);

  const toggle = (id: string) => setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const canProceed = (mode === 'build' && team.length >= 2) || (mode === 'lead' && !!lead);

  const proceed = () => {
    // Hand off to the single booking flow on the lead/first pandit, carrying the team via the URL.
    const leadId = mode === 'lead' ? lead! : team[0];
    const others = mode === 'build' ? team.slice(1).join(',') : '';
    navigate(`/app/book/${leadId}?team=${others}&mode=${mode}`);
  };

  return (
    <>
      <AppBar title="Multi-pandit booking" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-sm text-muted">Some pujas (Yagna, Maha Mrityunjaya Jaap, marriage) need several pandits. Choose how to assemble the team.</p>
        <div className="mb-4 flex flex-col gap-2">
          <button type="button" onClick={() => setMode('build')} className={cn('flex items-start gap-3 rounded-md border p-3 text-left', mode === 'build' ? 'border-primary bg-primary/5' : 'border-border')}>
            <Users size={20} className="text-primary" />
            <span><span className="block text-sm font-medium">Build my own team</span><span className="block text-xs text-muted">Pick each pandit yourself.</span></span>
          </button>
          <button type="button" onClick={() => setMode('lead')} className={cn('flex items-start gap-3 rounded-md border p-3 text-left', mode === 'lead' ? 'border-primary bg-primary/5' : 'border-border')}>
            <UserCheck size={20} className="text-primary" />
            <span><span className="block text-sm font-medium">Book a lead pandit who brings the team</span><span className="block text-xs text-muted">The lead arranges the supporting pandits.</span></span>
          </button>
        </div>

        {mode && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{mode === 'build' ? `Select team (${team.length})` : 'Select the lead pandit'}</h3>
            {pandits.map((p) => {
              const selected = mode === 'build' ? team.includes(p.id) : lead === p.id;
              return (
                <button key={p.id} type="button" onClick={() => (mode === 'build' ? toggle(p.id) : setLead(p.id))} className={cn('flex items-center gap-3 rounded-md border p-3 text-left', selected ? 'border-primary bg-primary/5' : 'border-border')}>
                  <Avatar name={p.name} size={36} />
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  {selected && <span className="text-xs font-medium text-primary">Selected</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!canProceed} onClick={proceed}>Continue</Button>
      </div>
    </>
  );
}
