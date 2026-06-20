import type { Language } from '../store/uiStore';
import en from './en';

const dicts: Record<Language, Record<string, string>> = {
  en,
  hi: {}, // stub — Hindi keys added later
  sa: {}, // stub — Sanskrit keys added later
};

export function translate(key: string, lang: Language): string {
  return dicts[lang]?.[key] ?? dicts.en[key] ?? key;
}
