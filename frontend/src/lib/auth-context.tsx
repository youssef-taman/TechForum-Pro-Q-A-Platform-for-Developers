import React, { createContext, useContext, useState, useCallback } from "react";
import { saveAuth, clearAuth, getStoredUser, type StoredUser } from "./api";

interface AuthContextValue {
  user: StoredUser | null;
  isLoggedIn: boolean;
  login: (token: string, user: StoredUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());

  const login = useCallback((token: string, userData: StoredUser) => {
    saveAuth(token, userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
