import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { clearAuth, readAuth, saveAuth } from "./storage";
import type { AuthSession, AuthUser } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  login: (session: AuthSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readAuth()?.user ?? null);

  const login = useCallback((session: AuthSession) => {
    saveAuth(session);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
