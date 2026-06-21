import { useNavigate } from 'react-router-dom';
import { Inbox, IndianRupee, Wallet } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

export function OnboardingIntroScreen() {
  const navigate = useNavigate();
  const resetDraft = usePanditOnboardingStore((s) => s.resetDraft);
  const start = () => { resetDraft(); navigate('/pandit/onboarding/profile'); };

  return (
    <>
      <AppBar title="Become a Pandit" left={<BackButton to="/app/profile" />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-lg bg-gradient-to-b from-[#f6c66b]/30 to-[#e8801a]/10 p-6 text-center">
          <div className="text-3xl">🪔</div>
          <h1 className="mt-2 text-lg font-bold">Offer your seva to families near you</h1>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          <li className="flex items-center gap-3 text-sm"><Inbox size={18} className="shrink-0 text-primary" /> Get booking requests from nearby jajmans</li>
          <li className="flex items-center gap-3 text-sm"><IndianRupee size={18} className="shrink-0 text-primary" /> Set your own charges per puja</li>
          <li className="flex items-center gap-3 text-sm"><Wallet size={18} className="shrink-0 text-primary" /> Withdraw your earnings anytime</li>
        </ul>
        <div className="mt-5 flex items-center justify-between rounded-md bg-surface-2 p-3 text-xs text-muted">
          <span>Profile</span><span>→</span><span>Pujas</span><span>→</span><span>Availability</span><span>→</span><span>Approval</span>
        </div>
        <p className="mt-3 text-center text-xs text-muted">Admin verifies every pandit before you go live.</p>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" onClick={start}>Get started</Button>
      </div>
    </>
  );
}
