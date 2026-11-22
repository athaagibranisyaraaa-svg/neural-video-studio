import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken } from './api';
import type { UserInfo } from './api';

interface AuthCtx {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('nvs:logout', onLogout);
    if (getToken()) {
      api.me().then(d => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => window.removeEventListener('nvs:logout', onLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const d = await api.login({ email, password });
    setToken(d.token); setUser(d.user);
  };
  const register = async (name: string, email: string, password: string) => {
    const d = await api.register({ name, email, password });
    setToken(d.token); setUser(d.user);
  };
  const logout = () => { setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
