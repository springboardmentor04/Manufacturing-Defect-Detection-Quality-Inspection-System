import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Shield, Factory, Mail, LogOut } from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-6">
      
      <div className="glass-card p-6 rounded-3xl space-y-6">
        
        {/* Profile Header */}
        <div className="flex items-center gap-4 border-b border-slate-200/60 pb-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-teal-600/20">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{user.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-teal-500/10 text-teal-800 border border-teal-500/20">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="p-3.5 bg-white/40 rounded-2xl border border-white/60 space-y-1">
            <span className="text-slate-500 font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              Email Address
            </span>
            <span className="font-bold text-slate-800 font-mono block">{user.email}</span>
          </div>

          <div className="p-3.5 bg-white/40 rounded-2xl border border-white/60 space-y-1">
            <span className="text-slate-500 font-bold flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-teal-700" />
              User ID
            </span>
            <span className="font-bold text-slate-800 font-mono block">{user.id}</span>
          </div>

          <div className="p-3.5 bg-white/40 rounded-2xl border border-white/60 space-y-1">
            <span className="text-slate-500 font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              Role Permissions
            </span>
            <span className="font-semibold text-slate-800 block">
              {user.role === 'quality_engineer' ? 'Image Upload, Inspection Trigger, Pass/Fail Reports' :
               user.role === 'factory_supervisor' ? 'Production Analytics, Yield KPI, Quality Rules' :
               'Master Admin, Full User & System Configuration'}
            </span>
          </div>

          <div className="p-3.5 bg-white/40 rounded-2xl border border-white/60 space-y-1">
            <span className="text-slate-500 font-bold flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-teal-700" />
              User ID
            </span>
            <span className="font-bold text-slate-800 font-mono block">{user.id}</span>
          </div>

        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-white/60 hover:bg-white/90 text-slate-800 font-bold text-xs rounded-full border border-white/80 transition-all shadow-xs"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => {
              logout();
              onNavigate('login');
            }}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-800 font-bold text-xs rounded-full border border-red-500/20 transition-all flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

    </div>
  );
};
