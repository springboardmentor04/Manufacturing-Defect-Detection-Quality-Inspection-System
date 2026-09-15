"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type Role = "QUALITY_ENGINEER" | "FACTORY_SUPERVISOR" | "ADMIN" | null;

export interface User {
  id?: string;
  name: string;
  email: string;
  role: Role;
  employee_id: string;
  department?: string;
  phone?: string;
}

interface AuthContextType {
  role: Role;
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("visioninspect_auth_token");
      if (storedToken) {
        try {
          // Fetch user data from backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setToken(storedToken);
            setRole(userData.role);
            setUser({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              employee_id: userData.employee_id,
              department: userData.department,
              phone: userData.phone,
            });
          } else {
            // Invalid token
            localStorage.removeItem("visioninspect_auth_token");
          }
        } catch (e) {
          console.error("Failed to fetch user data", e);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("visioninspect_auth_token", newToken);
    setToken(newToken);
    setRole(newUser.role);
    setUser(newUser);
    
    // Set cookie for middleware
    document.cookie = `visioninspect_auth_token=${newToken}; path=/; max-age=86400`;

    // Redirect based on role
    if (newUser.role === "QUALITY_ENGINEER") {
      router.push("/dashboard/engineer");
    } else if (newUser.role === "FACTORY_SUPERVISOR") {
      router.push("/dashboard/supervisor");
    } else if (newUser.role === "ADMIN") {
      router.push("/dashboard/admin");
    } else {
      router.push("/dashboard");
    }
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem("visioninspect_auth_token");
    document.cookie = "visioninspect_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ role, user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
