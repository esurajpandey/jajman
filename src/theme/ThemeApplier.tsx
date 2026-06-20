import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

/** Side-effect-only component: mirrors the theme store onto <html data-theme>. */
export function ThemeApplier() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}
