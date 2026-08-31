import React, { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

export default function DashboardLayout({ children, title, subtitle }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex">
      {/* Sidebar Component */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggle={toggleSidebar} 
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isCollapsed ? 'ml-24' : 'ml-72'
        }`}
      >
        {/* Navbar Component */}
        <Navbar 
          title={title} 
          subtitle={subtitle} 
        />

        {/* Page Content with Standard p-8 Dashboard Padding */}
        <main className="flex-1 p-8 bg-[#0B0F19]">
          {children}
        </main>
      </div>
    </div>
  );
}
