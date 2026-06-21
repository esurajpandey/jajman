import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { usePanditOnboardingStore } from '../../store/panditOnboardingStore';

export function RejectedScreen() {
  const navigate = useNavigate();
  const profile = usePanditOnboardingStore((s) => s.profile);
  return (
    <>
      <AppBar title="Application status" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={44} className="text-error" />
        <h1 className="text-lg font-semibold">Application needs changes</h1>
        <Card className="w-full p-3 text-left">
          <p className="text-xs font-medium text-muted">Reason</p>
          <p className="text-sm">{profile?.rejectionReason ?? 'Please review your submission and resubmit.'}</p>
        </Card>
        <Button className="mt-2 w-full" onClick={() => navigate('/pandit/onboarding/profile')}>Edit & resubmit</Button>
      </div>
    </>
  );
}
