"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredAuth,
  getRedirectPath,
  persistAuth,
  readStoredAuth,
  signInWithEmail,
  signUpWithEmail,
  type AuthUser,
  type RoleKey,
  type SignInValues,
  type SignUpValues,
} from "@/lib/auth";

type AuthContextType = {
  user: AuthUser | null;
  currentUser: AuthUser | null;
  role: RoleKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (values: SignInValues) => Promise<AuthUser>;
  signUp: (values: SignUpValues) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Restore session on mount / page refresh
    const stored = readStoredAuth();
    if (stored) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  async function login(values: SignInValues): Promise<AuthUser> {
    setIsLoading(true);
    try {
      const loggedUser = await signInWithEmail(values);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(values: SignUpValues): Promise<AuthUser> {
    setIsLoading(true);
    try {
      const registeredUser = await signUpWithEmail(values);
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearStoredAuth();
    setUser(null);
    router.replace("/");
  }

  const value: AuthContextType = {
    user,
    currentUser: user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isLoading,
    login,
    signUp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
