import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl">🪔</div>
      <h1 className="text-lg font-semibold">Coming soon</h1>
      <p className="text-sm text-muted">This screen arrives in a later build phase.</p>
      <Button onClick={() => navigate('/app/home')}>Go home</Button>
    </div>
  );
}
