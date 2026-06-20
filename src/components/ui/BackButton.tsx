import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label="Back"
      className="-ml-1 p-1 text-muted"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
