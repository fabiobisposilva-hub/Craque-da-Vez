import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface Ctx {
  sessao: Session | null;
  carregando: boolean;
}

const AuthCtx = createContext<Ctx>({ sessao: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthCtx.Provider value={{ sessao, carregando }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
