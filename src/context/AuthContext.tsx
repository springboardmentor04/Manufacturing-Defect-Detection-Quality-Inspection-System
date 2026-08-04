import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { loginUser as loginApi, registerUser as registerApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole, assignedLine?: string) => Promise<void>;
  logout: () => void;
  switchRoleForDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, User> = {
  quality_engineer: {
    id: 'u-qe1',
    email: 'engineer@factory.com',
    fullName: 'Sarah Connor',
    role: 'quality_engineer',
    assignedLine: 'Assembly Line A1'
  },
  factory_supervisor: {
    id: 'u-fs1',
    email: 'supervisor@factory.com',
    fullName: 'Marcus Vance',
    role: 'factory_supervisor',
    assignedLine: 'All Production Lines'
  },
  admin: {
    id: 'u-adm1',
    email: 'admin@factory.com',
    fullName: 'Elena Rostova',
    role: 'admin',
    assignedLine: 'Global Operations'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('visioninspect_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.quality_engineer;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('visioninspect_token') || 'demo_jwt_token_123';
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

  const login = async (email: string, password: string) => {
    try {
      const data = await loginApi(email, password);
      setUser(data.user);
      setToken(data.token);
    } catch (err) {
      // Fallback for offline demo matching user role request
      const foundRole = Object.keys(DEMO_USERS).find(
        r => DEMO_USERS[r as UserRole].email.toLowerCase() === email.toLowerCase()
      ) as UserRole | undefined;

      if (foundRole) {
        setUser(DEMO_USERS[foundRole]);
        setToken('demo_token');
      } else {
        throw err;
      }
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    assignedLine?: string
  ) => {
    try {
      const data = await registerApi(email, password, fullName, role, assignedLine);
      setUser(data.user);
      setToken(data.token);
    } catch (err) {
      const newUser: User = {
        id: `u-${Math.random().toString(36).substr(2, 6)}`,
        email,
        fullName,
        role,
        assignedLine: assignedLine || 'Assembly Line A1'
      };
      setUser(newUser);
      setToken('demo_token');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('visioninspect_user');
    localStorage.removeItem('visioninspect_token');
  };

  const switchRoleForDemo = (role: UserRole) => {
    setUser(DEMO_USERS[role]);
    setToken(`demo_jwt_token_${role}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchRoleForDemo
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
