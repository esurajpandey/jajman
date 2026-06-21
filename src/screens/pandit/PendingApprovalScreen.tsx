import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';
import { usePanditOnboardingStore } from '../../store/panditOnboardingStore';

export function PendingApprovalScreen() {
  const navigate = useNavigate();
  const profile = usePanditOnboardingStore((s) => s.profile);
  const simulateApproval = usePanditOnboardingStore((s) => s.simulateApproval);
  const simulateRejection = usePanditOnboardingStore((s) => s.simulateRejection);
  const setPanditStatus = useSessionStore((s) => s.setPanditStatus);

  const approve = () => { simulateApproval(); setPanditStatus('approved'); navigate('/pandit/dashboard', { replace: true }); };
  const reject = () => { simulateRejection('Please add a clearer ID document and complete your bio.'); setPanditStatus('rejected'); navigate('/pandit/rejected', { replace: true }); };

  return (
    <>
      <AppBar title="Application status" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Hourglass size={44} className="text-warning" />
        <h1 className="text-lg font-semibold">Pending admin approval</h1>
        <p className="text-sm text-muted">Admin usually reviews within 24 hours.{profile?.submittedAt ? ` Submitted ${profile.submittedAt.slice(0, 10)}.` : ''}</p>
        <Button className="mt-2 w-full" onClick={() => navigate('/pandit/onboarding/profile')} variant="outline">Edit submission</Button>
        <div className="mt-6 w-full rounded-md border border-dashed border-border p-3">
          <p className="mb-2 text-xs text-muted">Demo controls (Admin surface lands in P4)</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={approve}>Simulate approval</Button>
            <Button className="flex-1" variant="outline" onClick={reject}>Simulate rejection</Button>
          </div>
        </div>
      </div>
    </>
  );
}
