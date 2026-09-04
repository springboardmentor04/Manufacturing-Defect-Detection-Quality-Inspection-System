import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { fetchCurrentUser, loginUser as loginApi, registerUser as registerApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole, assignedLine?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('visioninspect_user');
    const savedToken = localStorage.getItem('visioninspect_token');
    if (!saved || !savedToken) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('visioninspect_token');
    return savedToken;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('visioninspect_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('visioninspect_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('visioninspect_token', token);
    } else {
      localStorage.removeItem('visioninspect_token');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void fetchCurrentUser().then(setUser).catch(() => {
      setUser(null);
      setToken(null);
    });
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    assignedLine?: string
  ) => {
    const data = await registerApi(email, password, fullName, role, assignedLine);
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('visioninspect_user');
    localStorage.removeItem('visioninspect_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
