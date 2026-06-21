import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { useSessionStore } from '../../../store/sessionStore';

export function EditProfileScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [about, setAbout] = useState(user?.about ?? '');
  const valid = name.trim().length > 0;

  const save = () => {
    updateProfile({ name: name.trim(), email: email.trim() || undefined, about: about.trim() || undefined });
    navigate(-1);
  };

  return (
    <>
      <AppBar title="Edit Profile" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <Avatar name={name || 'Devotee'} size={72} />
          <button type="button" className="text-xs font-medium text-primary">Change photo (mock)</button>
        </div>
        <div className="flex flex-col gap-3">
          <TextField label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Mobile" name="phone" value={user?.phone ?? ''} readOnly hint="Verified" />
          <TextField label="Email (optional)" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="About (optional)" name="about" value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full" disabled={!valid} onClick={save}>Save</Button>
      </div>
    </>
  );
}
