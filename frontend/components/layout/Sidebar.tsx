"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Camera, 
  Box, 
  Layers, 
  BarChart3, 
  FileText, 
  Cpu, 
  LogOut,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const normalizeRole = (role?: string | null) => (role || '').toString().trim().replace(/\s+/g, '_').toUpperCase();

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNavItems = () => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'QUALITY_ENGINEER', 'SUPERVISOR', 'FACTORY_SUPERVISOR'] },
      { name: 'Inspections', href: '/inspections', icon: Camera, roles: ['ADMIN', 'QUALITY_ENGINEER', 'SUPERVISOR', 'FACTORY_SUPERVISOR', 'OPERATOR'] },
      { name: 'New Inspection', href: '/inspections/new', icon: Plus, roles: ['ADMIN', 'QUALITY_ENGINEER', 'OPERATOR'] },
      { name: 'Products', href: '/products', icon: Box, roles: ['ADMIN', 'QUALITY_ENGINEER'] },
      { name: 'Batches', href: '/batches', icon: Layers, roles: ['ADMIN', 'QUALITY_ENGINEER', 'SUPERVISOR', 'FACTORY_SUPERVISOR'] },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'QUALITY_ENGINEER', 'SUPERVISOR', 'FACTORY_SUPERVISOR'] },
      { name: 'Reports', href: '/reports', icon: FileText, roles: ['ADMIN', 'QUALITY_ENGINEER', 'SUPERVISOR', 'FACTORY_SUPERVISOR'] },
      { name: 'Models', href: '/models', icon: Cpu, roles: ['ADMIN', 'QUALITY_ENGINEER'] },
    ];

    if (!user || !user.role) return items;
    return items.filter(item => item.roles.includes(normalizeRole(user.role)));
  };

  const navItems = getNavItems();

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-white min-h-screen">
      <div className="flex items-center justify-center h-20 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">VISIONINSPECT AI</h1>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
