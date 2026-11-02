import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API, clearTokens, restoreSession, setSessionEndHandler, setTokens } from './api';
import { setLang } from './i18n';
import { storage } from './storage';
import type { Me, Role } from './types';

type Status = 'loading' | 'signedOut' | 'needsProfile' | 'ready';
type Mode = Exclude<Role, 'ADMIN'>;
interface AuthCtx {
  status: Status; me: Me | null; mode: Mode;
  signIn(tokens: { accessToken: string; refreshToken: string }): Promise<void>;
  signOut(): Promise<void>; reload(): Promise<Me | null>; setMode(m: Mode): Promise<void>;
  canUse(m: Mode): boolean; roleStatus(m: Mode): string | null;
}
const Ctx = createContext<AuthCtx | null>(null);
const MODE_KEY = 'maacrave.mode';
/** Set during sign-up when the person chooses to cook or ride, so the app opens their application next. */
export const onboarding: { next: 'cook' | 'rider' | null } = { next: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setModeState] = useState<Mode>('CUSTOMER');

  const canUseFor = (u: Me | null, m: Mode) => !!u?.roles.some((r) => r.role === m && r.status === 'APPROVED');

  const reload = useCallback(async () => {
    try {
      const u = await API.me();
      setMe(u);
      if (u.language === 'bn' || u.language === 'en') setLang(u.language);
      setStatus(u.name ? 'ready' : 'needsProfile');
      const saved = (await storage.get(MODE_KEY)) as Mode | null;
      setModeState(saved && canUseFor(u, saved) ? saved : 'CUSTOMER');
      return u;
    } catch {
      setStatus('signedOut');
      return null;
    }
  }, []);

  useEffect(() => {
    setSessionEndHandler(() => { setMe(null); setStatus('signedOut'); qc.clear(); });
    restoreSession().then((ok) => (ok ? reload() : setStatus('signedOut')));
  }, [reload, qc]);

  const value = useMemo<AuthCtx>(() => ({
    status, me, mode,
    async signIn(tokens) { await setTokens(tokens); await reload(); },
    async signOut() { await clearTokens(); await storage.remove(MODE_KEY); qc.clear(); setMe(null); setStatus('signedOut'); },
    reload,
    async setMode(m) { if (!canUseFor(me, m)) return; await storage.set(MODE_KEY, m); setModeState(m); },
    canUse: (m) => canUseFor(me, m),
    roleStatus: (m) => me?.roles.find((r) => r.role === m)?.status ?? null,
  }), [status, me, mode, reload, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
export const homeFor = (m: Mode) => (m === 'COOK' ? '/kitchen' : m === 'RIDER' ? '/rider' : '/');
