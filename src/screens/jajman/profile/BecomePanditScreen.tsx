import { useNavigate } from 'react-router-dom';
import { Sparkles, Wallet, Users, BadgeCheck } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { useSessionStore } from '../../../store/sessionStore';

export function BecomePanditScreen() {
  const navigate = useNavigate();
  const panditStatus = useSessionStore((s) => s.panditStatus);
  const becomePandit = useSessionStore((s) => s.becomePandit);

  if (panditStatus === 'pending') {
    return (
      <>
        <AppBar title="Become a Pandit" left={<BackButton />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <BadgeCheck size={40} className="text-warning" />
          <p className="font-semibold">Awaiting admin approval</p>
          <p className="text-sm text-muted">Your pandit profile has been submitted. The full pandit dashboard arrives in a later build phase.</p>
          <Button onClick={() => navigate('/app/profile')}>Back to profile</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Become a Pandit" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-lg bg-secondary/10 p-4 text-center">
          <Sparkles size={28} className="mx-auto text-secondary" />
          <h2 className="mt-2 font-semibold">Offer your services as a pandit</h2>
          <p className="text-sm text-muted">Earn, set your own charges, and reach devotees near you.</p>
        </div>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3 text-sm"><Wallet size={18} className="shrink-0 text-primary" /> Set your own puja charges</li>
          <li className="flex items-center gap-3 text-sm"><Users size={18} className="shrink-0 text-primary" /> Reach devotees in your area</li>
          <li className="flex items-center gap-3 text-sm"><BadgeCheck size={18} className="shrink-0 text-primary" /> Steps: profile → pujas → availability → admin approval</li>
        </ul>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={() => { becomePandit(); navigate('/app/become-pandit', { replace: true }); }}>
          Start Pandit Onboarding
        </Button>
      </div>
    </>
  );
}
