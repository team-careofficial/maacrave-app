import { useSyncExternalStore } from 'react';
import { BN } from './bn';
import { storage } from './storage';

export type Lang = 'en' | 'bn';
const KEY = 'maacrave.lang';
let current: Lang = 'en';
const listeners = new Set<() => void>();
storage.get(KEY).then((v) => { if (v === 'bn' || v === 'en') setLang(v as Lang, false); });

export function setLang(l: Lang, persist = true) {
  if (l === current) return;
  current = l;
  if (persist) storage.set(KEY, l);
  listeners.forEach((f) => f());
}
export const getLang = () => current;
/** Re-renders the caller when the language changes. */
export function useLang(): Lang {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => current, () => current);
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Bangla numerals for numbers shown inside Bangla sentences. */
export const num = (s: string | number) => (current === 'bn' ? String(s).replace(/\d/g, (d) => BN_DIGITS[+d]) : String(s));

/** Translates a fixed English UI string. Unknown strings stay as they are. */
export function tr<T>(s: T): T {
  if (current !== 'bn' || typeof s !== 'string') return s;
  return ((BN[s] ?? BN[s.trim()] ?? s) as unknown) as T;
}
/** Picks the right text when a sentence has dynamic parts: t('3 open requests', '৩টি খোলা অনুরোধ'). */
export const t = (en: string, bn: string) => (current === 'bn' ? bn : en);
