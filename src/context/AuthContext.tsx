import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = 'cosmobrasil_auth';

function authEndpoint(): string {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? '/api/auth' : '/.netlify/functions/auth';
}

function getStoredAuth(): { token: string; username: string } | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.token && parsed.username) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    username: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setState({
        token: stored.token,
        username: stored.username,
        isAuthenticated: true,
        loading: false,
      });
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(authEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error || 'Erro ao autenticar';
      }

      const authData = { token: data.token, username: data.username };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      setState({
        token: data.token,
        username: data.username,
        isAuthenticated: true,
        loading: false,
      });
      return null;
    } catch (e) {
      return 'Erro de conexão com o servidor';
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<string | null> => {
    try {
      const res = await fetch(authEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', username: state.username, password: currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error || 'Erro ao alterar senha';
      }

      return null;
    } catch (e) {
      return 'Erro de conexão com o servidor';
    }
  }, [state.username]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setState({
      token: null,
      username: null,
      isAuthenticated: false,
      loading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
