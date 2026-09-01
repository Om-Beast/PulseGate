import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  login as apiLogin,
  clearToken,
  getToken,
  getStoredUser,
  setToken,
  setStoredUser,
  type StoredUser,
} from '../lib/api';

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [token, setTokenState] = useState<string | null>(getToken);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setToken(result.token);
    setStoredUser(result.user);
    setTokenState(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
