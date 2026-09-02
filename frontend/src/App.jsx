import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { QualityEngineerDashboard } from './pages/QualityEngineerDashboard';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { InspectionWorkspace } from './pages/InspectionWorkspace';
import { QualityControlCenter } from './pages/QualityControlCenter';
import { ModelTrainingWorkbench } from './pages/ModelTrainingWorkbench';
import { LayoutDashboard, Camera, ClipboardCheck, BarChart3 } from 'lucide-react';

const MainAppContent = () => {
  const { user, activeTab, setActiveTab } = useAuth();
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'register'

  // CRITICAL REQUIREMENT: Before signup or login, NO dashboard or navigation layout is shown
  if (!user) {
    if (authPage === 'register') {
      return <Register onSwitchToLogin={() => setAuthPage('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthPage('register')} />;
  }

  const isSupervisor = user.role === 'Factory Supervisor';

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return isSupervisor ? <SupervisorDashboard /> : <QualityEngineerDashboard />;
      case 'inspection_workspace':
        return <InspectionWorkspace />;
      case 'model_metrics':
        return <ModelTrainingWorkbench />;
      case 'qc_center':
        return <QualityControlCenter />;
      default:
        return isSupervisor ? <SupervisorDashboard /> : <QualityEngineerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Navbar - Only rendered AFTER successful login/signup */}
      <Navbar />

      {/* Main Container */}
      <div className="flex flex-1 relative">
        
        {/* Sidebar - Tailored to role */}
        <Sidebar />

        {/* Dynamic Workspace View */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderActiveTab()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden sticky bottom-0 z-40 bg-white border-t border-slate-200 p-2 grid grid-cols-3 gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all ${
            activeTab === 'dashboard' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        {!isSupervisor && (
          <button
            onClick={() => setActiveTab('inspection_workspace')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === 'inspection_workspace' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Camera className="w-4 h-4 mb-0.5" />
            <span>AI Studio</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('qc_center')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all ${
            activeTab === 'qc_center' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-500'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 mb-0.5" />
          <span>QC Logs</span>
        </button>
      </div>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
