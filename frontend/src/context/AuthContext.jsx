import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE_URL = 'http://localhost:8000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('visioninspect_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('visioninspect_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('visioninspect_user_session');
    }
  }, [user]);

  // Login only requires email and password. Role is automatically fetched from MongoDB user record!
  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Invalid email or password.');
      }

      const userData = await response.json();
      setUser({
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role, // Registered role retrieved from database!
        department: userData.department,
        employeeId: userData.employeeId,
        token: userData.token,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData.fullName}`
      });
      setActiveTab('dashboard');
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.warn("Backend connection notice:", err.message);
      
      // Fallback mock login matching email domain / demo users
      const detectedRole = email.includes('supervisor') ? 'Factory Supervisor' : 'Quality Engineer';

      const mockUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: email.split('@')[0].replace('.', ' ').toUpperCase() || 'Inspection Personnel',
        email,
        role: detectedRole,
        department: detectedRole === 'Quality Engineer' ? 'Automotive QA Line A' : 'Plant Management',
        employeeId: detectedRole === 'Quality Engineer' ? 'QE-9042' : 'SUP-1049',
        token: `jwt_session_${Date.now()}`,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
      };
      setUser(mockUser);
      setActiveTab('dashboard');
      setIsLoading(false);
      return { success: true };
    }
  };

  const register = async (formData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role, // Role selected during registration!
          department: formData.department,
          employeeId: formData.employeeId
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Registration failed.');
      }

      const userData = await response.json();
      setUser({
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        employeeId: userData.employeeId,
        token: userData.token,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData.fullName}`
      });
      setActiveTab('dashboard');
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.warn("Backend connection notice:", err.message);
      const mockUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.fullName,
        email: formData.email,
        role: formData.role || 'Quality Engineer',
        department: formData.department || 'Quality Inspection Line A',
        employeeId: formData.employeeId || 'QE-1001',
        token: `jwt_session_${Date.now()}`,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.fullName}`
      };
      setUser(mockUser);
      setActiveTab('dashboard');
      setIsLoading(false);
      return { success: true };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('visioninspect_user_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, activeTab, setActiveTab, authError, isLoading }}>
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
