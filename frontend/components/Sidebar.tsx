'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUserFromStorage, clearAuthData, UserProfile } from '@/lib/api';
import {
  LayoutDashboard,
  Scan,
  Layers,
  UploadCloud,
  LogOut,
  ShieldCheck,
  UserCheck,
  Eye,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  onOpenUpload?: () => void;
}

export default function Sidebar({ onOpenUpload }: SidebarProps) {
  const pathname = usePathname();
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

  const navItems = [
    { label: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'All Inspections', href: '/dashboard/inspections', icon: Scan },
    { label: 'Batch Inference Engine', href: '/dashboard/batch-analyze', icon: Layers },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 hidden md:flex flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 tracking-tight text-base">
              VisionInspect <span className="text-sky-400">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400">Industrial QA Platform</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Card & Sign Out */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-xs">
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'VI'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.username || 'Inspector'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isSupervisor ? (
                <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Supervisor
                </span>
              ) : (
                <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-0.5">
                  <UserCheck className="w-3 h-3" /> Engineer
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
