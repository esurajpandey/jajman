import { Check } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { useUiStore, type Language } from '../../../store/uiStore';

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'sa', label: 'संस्कृत (Sanskrit)' },
];

export function LanguagePrefScreen() {
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);

  return (
    <>
      <AppBar title="Language" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLanguage(l.value)}
              aria-pressed={language === l.value}
              className="flex w-full items-center border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <span className="flex-1 text-left">{l.label}</span>
              {language === l.value && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Hindi / Sanskrit are partially translated (preview).</p>
      </div>
    </>
  );
}
