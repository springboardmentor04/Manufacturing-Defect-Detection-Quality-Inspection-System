import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Scan, 
  SlidersHorizontal, 
  FileCheck2, 
  User as UserIcon, 
  BarChart3, 
  TrendingUp, 
  Settings2, 
  Activity, 
  Users,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  activeSection: string;
  onNavigate: (page: string) => void;
  onSelectSection: (section: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  activeSection, 
  onNavigate, 
  onSelectSection 
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isQE = user.role === 'quality_engineer';
  const isSupervisorOrAdmin = user.role === 'factory_supervisor' || user.role === 'admin';

  const qeMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Product Image', icon: UploadCloud },
    { id: 'results', label: 'Inspection Results', icon: Scan },
    { id: 'defects', label: 'Defect Details', icon: SlidersHorizontal },
    { id: 'history', label: 'Quality Reports Inspection History', icon: FileCheck2 },
    { id: 'profile', label: 'Profile', icon: UserIcon, isProfile: true },
  ];

  const supervisorMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'overview', label: 'Production Overview', icon: BarChart3 },
    { id: 'reports', label: 'Inspection Reports', icon: FileCheck2 },
    { id: 'trends', label: 'Defect Trends', icon: TrendingUp },
    { id: 'analytics', label: 'Quality Analytics', icon: Settings2 },
    { id: 'monitoring', label: 'Production Monitoring', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'profile', label: 'Profile', icon: UserIcon, isProfile: true },
  ];

  const menuItems = isQE ? qeMenuItems : supervisorMenuItems;

  const handleClick = (item: typeof menuItems[0]) => {
    if (item.isProfile) {
      onNavigate('profile');
    } else {
      onNavigate('dashboard');
      onSelectSection(item.id);
      
      // Smooth scroll to section element if present
      const element = document.getElementById(`section-${item.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      <div className="glass-card p-5 rounded-3xl sticky top-20 border border-white/80 shadow-xl space-y-6">
        
        {/* User Card */}
        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-white/80">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-teal-600/20">
            {user.fullName ? user.fullName.charAt(0) : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">{user.fullName}</h4>
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
              {user.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Navigation Section Title */}
        <div>
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Navigation Panel</span>
            <span className="text-[9px] bg-teal-500/10 text-teal-800 px-2 py-0.5 rounded-full font-mono">
              {isQE ? 'QE Suite' : 'Supervisor'}
            </span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = (currentPage === 'profile' && item.isProfile) || 
                               (currentPage === 'dashboard' && activeSection === item.id && !item.isProfile);

              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'text-white opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Responsibilities Box */}
        <div className="p-3.5 bg-teal-500/10 rounded-2xl border border-teal-500/20 text-[11px] space-y-1.5">
          <span className="font-extrabold text-teal-900 block uppercase text-[10px] tracking-wider">
            Role Responsibilities
          </span>
          <ul className="text-[11px] text-slate-700 font-medium space-y-1 list-disc pl-3.5">
            {isQE ? (
              <>
                <li>Upload product images</li>
                <li>View detected defects</li>
                <li>View severity score & pass/fail</li>
                <li>Generate inspection reports</li>
              </>
            ) : (
              <>
                <li>Monitor line yield rates</li>
                <li>Audit inspection records</li>
                <li>Analyze defect trends</li>
                <li>Adjust threshold limits</li>
              </>
            )}
          </ul>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-800 font-bold text-xs rounded-2xl transition-all border border-red-500/20 flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

      </div>
    </aside>
  );
};
