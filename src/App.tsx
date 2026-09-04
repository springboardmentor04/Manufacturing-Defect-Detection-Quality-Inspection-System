import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { QualityEngineerDashboard } from './pages/QualityEngineerDashboard';
import { FactorySupervisorDashboard } from './pages/FactorySupervisorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { ProductsPage } from './pages/ProductsPage';

function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderDashboardByRole = () => {
    if (!user) {
      return <LoginPage onNavigate={handleNavigate} />;
    }

    if (user.role === 'quality_engineer') {
      return <QualityEngineerDashboard />;
    }

    if (user.role === 'factory_supervisor') {
      return <FactorySupervisorDashboard />;
    }

    if (user.role === 'admin') {
      return <AdminDashboard />;
    }

    return <QualityEngineerDashboard />;
  };

  const showSidebar = user && (currentPage === 'dashboard' || currentPage === 'profile' || currentPage === 'products');

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F1]">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showSidebar ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <Sidebar
              currentPage={currentPage}
              activeSection={activeSection}
              onNavigate={handleNavigate}
              onSelectSection={setActiveSection}
            />
            <div className="flex-1 min-w-0">
              {currentPage === 'dashboard' && renderDashboardByRole()}
              {currentPage === 'profile' && <ProfilePage onNavigate={handleNavigate} />}
              {currentPage === 'products' && <ProductsPage />}
            </div>
          </div>
        ) : (
          <>
            {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
            {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
            {currentPage === 'register' && <RegisterPage onNavigate={handleNavigate} />}
            {currentPage === 'dashboard' && renderDashboardByRole()}
            {currentPage === 'profile' && <ProfilePage onNavigate={handleNavigate} />}
            {currentPage === 'products' && <ProductsPage />}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
