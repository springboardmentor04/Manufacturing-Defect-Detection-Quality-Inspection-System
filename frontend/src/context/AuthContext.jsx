import { createContext, useContext, useState, useCallback } from 'react';
import { Auth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => Auth.getUser());

  const login = useCallback((token, userObj) => {
    Auth.setSession(token, userObj);
    setUser(userObj);
  }, []);

  const logout = useCallback(() => {
    Auth.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
