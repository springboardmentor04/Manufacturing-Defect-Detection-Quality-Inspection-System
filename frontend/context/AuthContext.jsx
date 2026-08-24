import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService } from "../services/authService";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  /* =====================================================
     LOAD CURRENT USER
  ===================================================== */

  useEffect(() => {

    const current =
      authService.getCurrentUser();

    setUser(current);

    setLoading(false);

  }, []);


  /* =====================================================
     LOGIN
  ===================================================== */

  async function login(email, password) {

    const loggedInUser =
      await authService.login(
        email,
        password
      );

    setUser(loggedInUser);

    return loggedInUser;
  }


  /* =====================================================
     UPDATE PROFILE
  ===================================================== */

  async function updateProfile(
    full_name,
    email
  ) {

    const updatedUser =
      await authService.updateProfile(
        full_name,
        email
      );

    setUser(updatedUser);

    return updatedUser;
  }


  /* =====================================================
     LOGOUT
  ===================================================== */

  function logout() {

    authService.logout();

    setUser(null);
  }


  const value = {
    user,
    loading,
    login,
    updateProfile,
    logout,
    isAuthenticated: Boolean(user),
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {

  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return ctx;
}