import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'sb_token';
const USER_KEY = 'sb_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string) => {
    setError(null);
    try {
      const data = await api.login(email);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Clear stale state if token is missing
  useEffect(() => {
    if (!token && user) {
      setUser(null);
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
