'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AuthUser } from '@/types';

interface ToastData { msg: string; type: 'ok' | 'error' | 'warn'; id: number }

interface AppCtxType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  notify: (msg: string, type?: 'ok' | 'error' | 'warn') => void;
  isAdmin: boolean;
  can: (mod: string) => boolean;
}

const AppCtx = createContext<AppCtxType | null>(null);

export function AppProvider({ children, initialUser }: { children: ReactNode; initialUser: AuthUser | null }) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [toast, setToast] = useState<ToastData | null>(null);

  const notify = useCallback((msg: string, type: 'ok' | 'error' | 'warn' = 'ok') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const isAdmin = user?.rol === 'admin';
  const can = useCallback((mod: string) => isAdmin || (user?.modulos ?? []).includes(mod), [user, isAdmin]);

  return (
    <AppCtx.Provider value={{ user, setUser, notify, isAdmin, can }}>
      {children}
      {toast && <Toast data={toast} />}
    </AppCtx.Provider>
  );
}

function Toast({ data }: { data: ToastData }) {
  const icons = { ok: 'fa-check-circle', error: 'fa-exclamation-circle', warn: 'fa-triangle-exclamation' };
  const colors = { ok: '#10B981', error: '#EF4444', warn: '#F59E0B' };
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      padding: '10px 16px', borderRadius: 10,
      background: colors[data.type], color: '#fff',
      display: 'flex', alignItems: 'center', gap: 8,
      fontWeight: 700, fontSize: 12.5, fontFamily: 'Nunito, sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,.15)',
      animation: 'slideIn .24s ease',
    }}>
      <i className={`fas ${icons[data.type]}`}></i>
      {data.msg}
    </div>
  );
}

export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
