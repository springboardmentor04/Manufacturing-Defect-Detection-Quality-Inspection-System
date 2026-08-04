import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Scan, ShieldAlert, BarChart3, Settings, LogOut, User as UserIcon, Activity } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout, switchRoleForDemo } = useAuth();

  const roleBadges: Record<UserRole, { label: string; color: string }> = {
    quality_engineer: { label: 'Quality Engineer', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    factory_supervisor: { label: 'Factory Supervisor', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    admin: { label: 'Administrator', color: 'bg-purple-50 text-purple-700 border-purple-200' }
  };

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-800 tracking-tight block leading-none">
                VisionInspect <span className="text-teal-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Quality Inspection System
              </span>
            </div>
          </div>

          {/* Navigation Links (When authenticated) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 bg-white/40 p-1 rounded-2xl text-xs font-medium border border-white/60 backdrop-blur-md">
              {user.role === 'quality_engineer' && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-teal-600/10 text-teal-800 font-bold border border-teal-600/20 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Scan className="w-4 h-4 text-teal-700" />
                  Inspection Station
                </button>
              )}

              {user.role === 'factory_supervisor' && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-teal-600/10 text-teal-800 font-bold border border-teal-600/20 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  Production Analytics
                </button>
              )}

              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-purple-600/10 text-purple-800 font-bold border border-purple-600/20 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Settings className="w-4 h-4 text-purple-700" />
                  Master Admin Suite
                </button>
              )}

              <button
                onClick={() => onNavigate('profile')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                  currentPage === 'profile'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </button>
            </nav>
          )}

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* User Info */}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{user.fullName}</div>
                  <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">{user.role.replace('_', ' ')}</div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-xl transition-colors border border-transparent hover:border-white/80"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white/50 rounded-xl transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-full shadow-lg shadow-teal-600/20 transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
