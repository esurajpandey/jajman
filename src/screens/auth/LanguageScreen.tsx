import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useUiStore, type Language } from '../../store/uiStore';
import { cn } from '../../lib/cn';

const LANGS: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { value: 'sa', label: 'Sanskrit', native: 'संस्कृतम्' },
];

export function LanguageScreen() {
  const navigate = useNavigate();
  const language = useUiStore((s) => s.language);
  const chooseLanguage = useUiStore((s) => s.chooseLanguage);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Choose your language</h1>
      <p className="mt-1 text-sm text-muted">You can change this later in settings.</p>
      <div className="mt-6 flex flex-col gap-3">
        {LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => chooseLanguage(l.value)}
            className={cn(
              'flex items-center justify-between rounded-md border p-4 text-left',
              language === l.value ? 'border-primary bg-primary/5' : 'border-border bg-surface',
            )}
          >
            <span>
              <span className="block font-medium">{l.native}</span>
              <span className="block text-xs text-muted">{l.label}</span>
            </span>
            {language === l.value && <Check size={18} className="text-primary" />}
          </button>
        ))}
      </div>
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => { chooseLanguage(language); navigate('/auth/welcome'); }}
          className="h-12 w-full rounded-md bg-primary font-medium text-primary-fg"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
