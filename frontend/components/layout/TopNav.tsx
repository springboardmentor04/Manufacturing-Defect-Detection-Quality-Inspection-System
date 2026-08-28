"use client";

import { useAuth } from '@/hooks/useAuth';
import { UserCircle } from 'lucide-react';

export default function TopNav() {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
      <div className="flex items-center">
        {/* Can put breadcrumbs or page title here */}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{user?.username || user?.email || user?.full_name || 'Operator'}</p>
          <p className="text-xs text-slate-500 font-medium">{user?.role?.replace('_', ' ')}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <UserCircle size={24} />
        </div>
      </div>
    </header>
  );
}
