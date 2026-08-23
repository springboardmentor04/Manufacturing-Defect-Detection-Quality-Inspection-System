'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Plus, LogOut, ShieldCheck, UserCheck, Bell, Sparkles } from 'lucide-react';
import { getCurrentUserFromStorage, clearAuthData, UserProfile } from '@/lib/api';

interface NavbarProps {
  onOpenUpload?: () => void;
}

export default function Navbar({ onOpenUpload }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getCurrentUserFromStorage());
  }, []);

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  const isSupervisor = user?.role_name === 'factory_supervisor';

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-100">
                VisionInspect <span className="text-sky-400">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v2.0
              </span>
            </div>
          </Link>
        </div>

        {/* Action Controls & User Meta */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Upload Trigger */}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Inspection</span>
            </button>
          )}

          {/* User Profile + Role Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
                {user?.username || 'Quality Inspector'}
              </span>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {isSupervisor ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> Supervisor
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" /> Quality Engineer
                  </span>
                )}
              </div>
            </div>

            {/* User Avatar Circle */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-xs shadow-inner">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'VI'}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
