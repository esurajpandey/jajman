import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ToggleRow } from '../../../components/ui/ToggleRow';
import { Button } from '../../../components/ui/Button';
import { useUiStore, type ThemeMode } from '../../../store/uiStore';
import { useSessionStore } from '../../../store/sessionStore';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-1 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">{children}</h2>;
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const phoneShareDefault = useUiStore((s) => s.phoneShareDefault);
  const setPhoneShareDefault = useUiStore((s) => s.setPhoneShareDefault);
  const logout = useSessionStore((s) => s.logout);

  return (
    <>
      <AppBar title="Settings" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <SectionTitle>Appearance</SectionTitle>
        <SegmentedControl<ThemeMode>
          segments={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          value={theme}
          onChange={setTheme}
        />

        <SectionTitle>Privacy</SectionTitle>
        <div className="rounded-md border border-border bg-surface px-3">
          <ToggleRow label="Share phone by default" description="Applied to new booking chats" checked={phoneShareDefault} onChange={setPhoneShareDefault} />
        </div>

        <SectionTitle>Security</SectionTitle>
        <button type="button" onClick={() => navigate('/auth/change-password')} className="flex w-full items-center rounded-md border border-border bg-surface px-3 py-3 text-sm">
          Change password <ChevronRight size={18} className="ml-auto text-muted" />
        </button>

        <SectionTitle>About</SectionTitle>
        <div className="rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted">BookMyPanditji · v0.0.0 (prototype)</div>

        <SectionTitle>Account</SectionTitle>
        <Button variant="outline" className="mt-1 w-full border-error text-error" onClick={() => { logout(); navigate('/', { replace: true }); }}>
          Logout
        </Button>
      </div>
    </>
  );
}
