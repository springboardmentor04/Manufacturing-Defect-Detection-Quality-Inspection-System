import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const qeLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/upload", label: "Upload Product Image", icon: "📷" },
  { to: "/inspections", label: "Inspection History", icon: "🗂️" },
  { to: "/reports", label: "Quality Reports", icon: "📄" },
  { to: "/ai-calibration", label: "AI Calibration Studio", icon: "⚙️" },
  { to: "/annotation-studio", label: "Defect Annotation", icon: "🏷️" },
  { to: "/audit-logs", label: "Audit & Shift Logs", icon: "📋" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

const fsLinks = [
  { to: "/dashboard", label: "Production Overview", icon: "🏭" },
  { to: "/incident-center", label: "Incident Command Center", icon: "🚨" },
  { to: "/line-health", label: "Production Line Health", icon: "⚡" },
  { to: "/batch-analytics", label: "Batch & Shift Analytics", icon: "📦" },
  { to: "/inspection-reports", label: "Inspection Reports", icon: "📄" },
  { to: "/defect-trends", label: "Defect Trends", icon: "📈" },
  { to: "/quality-analytics", label: "Quality Analytics", icon: "📉" },
  { to: "/production-monitoring", label: "Production Monitoring", icon: "🖥️" },
  { to: "/user-management", label: "User Management", icon: "🧑‍🤝‍🧑" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === "factory_supervisor" ? fsLinks : qeLinks;

  return (
    <aside className="w-64 shrink-0 fixed left-0 top-0 h-screen overflow-y-auto bg-slate-900 text-slate-200 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🔍</span> VisionInspect AI
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Quality Inspection Platform</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-brand-600 to-accent-purple text-white shadow-lg shadow-brand-600/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-500">
        Milestone 1 · Core Setup
      </div>
    </aside>
  );
}