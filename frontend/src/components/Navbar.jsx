import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleLabel =
    user?.role === "factory_supervisor" ? "Factory Supervisor" : "Quality Engineer";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 shrink-0 sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <p className="text-sm text-slate-500">Welcome back,</p>
        <p className="font-semibold text-slate-800">{user?.full_name}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
          {roleLabel}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}