import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Camera, BarChart3, ClipboardCheck, Cpu, ShieldCheck } from 'lucide-react';

export const Sidebar = () => {
  const { user, activeTab, setActiveTab } = useAuth();

  const isSupervisor = user?.role === 'Factory Supervisor';

  const navItems = isSupervisor
    ? [
        { id: 'dashboard', label: 'Supervisor Dashboard', icon: BarChart3 },
        { id: 'model_metrics', label: 'YOLO Model & Metrics', icon: Cpu },
        { id: 'qc_center', label: 'Quality Control Logs', icon: ClipboardCheck },
      ]
    : [
        { id: 'dashboard', label: 'Engineer Dashboard', icon: LayoutDashboard },
        { id: 'inspection_workspace', label: 'AI Inspection Studio', icon: Camera },
        { id: 'model_metrics', label: 'YOLO Model & Metrics', icon: Cpu },
        { id: 'qc_center', label: 'Quality Control Logs', icon: ClipboardCheck },
      ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)] p-4 shrink-0 shadow-xs">
      
      <div className="space-y-6">
        <div>
          <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
            {isSupervisor ? 'Supervisor Workspace' : 'Quality Engineer Workspace'}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? isSupervisor
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? (isSupervisor ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Hardware Status Widget */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-700 font-bold font-sans">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Camera Node #01
            </span>
            <span className="text-emerald-600 text-[10px]">CONNECTED</span>
          </div>

          <div className="space-y-1 text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>Resolution:</span>
              <span className="text-slate-800">4096 x 3072</span>
            </div>
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-emerald-600 font-bold">MongoDB Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Footer */}
      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono space-y-1">
        <div className="flex items-center gap-1.5 text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Role: <strong>{user?.role}</strong></span>
        </div>
        <p className="text-[10px] text-slate-400">Industry 4.0 Standard Compliant</p>
      </div>

    </aside>
  );
};
