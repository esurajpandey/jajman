import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, Flame } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';
import { cn } from '../../lib/cn';

type Choice = 'jajman' | 'both';

export function RoleSelectScreen() {
  const navigate = useNavigate();
  const becomePandit = useSessionStore((s) => s.becomePandit);
  const [choice, setChoice] = useState<Choice>('jajman');

  const cont = () => {
    if (choice === 'both') becomePandit(); // adds pandit role (pending); pandit onboarding lives in P3
    navigate('/auth/permissions');
  };

  const opt = (value: Choice, icon: ReactNode, title: string, body: string) => (
    <button
      type="button"
      onClick={() => setChoice(value)}
      className={cn(
        'flex items-start gap-3 rounded-md border p-4 text-left',
        choice === value ? 'border-primary bg-primary/5' : 'border-border bg-surface',
      )}
    >
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">How will you use Pandit Seva?</h1>
      <p className="mt-1 text-sm text-muted">You can switch modes anytime later.</p>
      <div className="mt-6 flex flex-col gap-3">
        {opt('jajman', <HeartHandshake size={22} />, 'Book pandits (Jajman)', 'Find and book pandits for your pujas and ceremonies.')}
        {opt('both', <Flame size={22} />, 'I am also a Pandit', 'Offer your services too — set up your pandit profile next (admin approval needed).')}
      </div>
      <Button className="mt-auto w-full" onClick={cont}>Continue</Button>
    </div>
  );
}
