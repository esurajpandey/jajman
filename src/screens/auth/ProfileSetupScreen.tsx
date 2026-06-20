import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../store/sessionStore';

export function ProfileSetupScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const completeProfile = useSessionStore((s) => s.completeProfile);
  const [name, setName] = useState(user?.name ?? '');

  const finish = () => {
    completeProfile({ name: name.trim() || 'Devotee' });
    navigate('/app/home', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted">This is how pandits will see you.</p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Avatar name={name || 'You'} size={84} />
        <button type="button" className="text-sm text-primary">Add a photo</button>
      </div>

      <div className="mt-6">
        <TextField label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <Button className="mt-auto w-full" onClick={finish}>Finish</Button>
    </div>
  );
}
