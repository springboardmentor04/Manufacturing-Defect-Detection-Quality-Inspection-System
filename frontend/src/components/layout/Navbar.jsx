import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Bell, User, LogOut, ChevronDown, Activity, Cpu } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Critical Defect Detected', msg: 'Engine block crack score 88 on Line A1', time: '2m ago', type: 'critical' },
    { id: 2, title: 'Batch Scan Completed', msg: 'PCB SMT Line #3 inspection finished (48 units)', time: '12m ago', type: 'info' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                VisionInspect <span className="text-blue-600">AI</span>
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md font-mono border ${
                user?.role === 'Quality Engineer'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {user?.role} Workspace
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Manufacturing Quality Inspection & Analytics System
            </p>
          </div>
        </div>

        {/* Center: System Status */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            YOLOv8 + U-Net Models Online
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Latency: 142ms
          </span>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-3">
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 animate-fade-in space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-900">
                  <span>System Quality Alerts</span>
                  <span className="text-[10px] text-blue-600 font-mono">MongoDB Stream</span>
                </div>
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{n.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name[0] : 'U'}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{user.employeeId}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-xs space-y-1">
                  <div className="p-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500">{user.email}</p>
                    <p className="text-[10px] font-mono text-blue-600 mt-1">{user.department}</p>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
