import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  ShieldCheck, 
  Activity, 
  FileCheck, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  LayoutDashboard,
  Users,
  Database,
  Cpu,
  Server,
  FileText,
  Settings,
  TrendingUp,
  BarChart2,
  Tv,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

export default function Sidebar({ isCollapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Determine current portal section
  let portalTitle = 'Portal';
  let navItems = [];

  if (path.startsWith('/admin')) {
    portalTitle = 'Admin Portal';
    navItems = [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'User Management', path: '/admin/users', icon: Users },
      { name: 'Dataset Management', path: '/admin/datasets', icon: Database },
      { name: 'AI Model Management', path: '/admin/models', icon: Cpu },
      { name: 'System Health', path: '/admin/system-health', icon: Server },
      { name: 'Activity Logs', path: '/admin/activity-logs', icon: FileText },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];
  } else if (path.startsWith('/supervisor')) {
    portalTitle = 'Supervisor Portal';
    navItems = [
      { name: 'Production Overview', path: '/supervisor/production-overview', icon: Layers },
      { name: 'Inspection Reports', path: '/supervisor/inspection-reports', icon: FileSpreadsheet },
      { name: 'Defect Trends', path: '/supervisor/defect-trends', icon: TrendingUp },
      { name: 'Quality Analytics', path: '/supervisor/quality-analytics', icon: BarChart2 },
      { name: 'Production Monitoring', path: '/supervisor/production-monitoring', icon: Tv },
    ];
  } else if (path.startsWith('/quality')) {
    portalTitle = 'Quality Engineer';
    navItems = [
      { name: 'Upload Image', path: '/quality/upload-image', icon: UploadCloud },
      { name: 'Inspection Result', path: '/quality/inspection-result', icon: CheckCircle2 },
      { name: 'Defect Details', path: '/quality/defect-details', icon: AlertTriangle },
      { name: 'Quality Report', path: '/quality/quality-report', icon: FileText },
      { name: 'Inspection History', path: '/quality/inspection-history', icon: FileSpreadsheet },
    ];
  }

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-[#111827] border-r border-[#1F2937] text-gray-200 flex flex-col justify-between transition-all duration-300 z-30 ${
        isCollapsed ? 'w-24' : 'w-72'
      }`}
    >
      {/* Top Header & Logo */}
      <div>
        <div className="h-20 border-b border-[#1F2937] flex items-center justify-between px-5">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB] shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-base text-white leading-tight truncate">VisionInspect AI</h1>
                <p className="text-xs text-blue-400 font-medium truncate">{portalTitle}</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="p-2 rounded-xl bg-[#1F2937] hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Navigation Menu
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Logout Area */}
      <div className="p-4 border-t border-[#1F2937]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
