import React from 'react';
import { Search, Bell, Calendar, User } from 'lucide-react';

export default function Navbar({ title = "Dashboard", subtitle = "Welcome back, Operator!" }) {
  // Format current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-20 bg-[#111827] border-b border-[#1F2937] px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Welcome Message */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-gray-400 font-normal mt-0.5">{subtitle}</p>
      </div>

      {/* Right Controls Area */}
      <div className="flex items-center space-x-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search inspections, logs, users..."
            className="w-64 bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-all"
          />
        </div>

        {/* Current Date */}
        <div className="flex items-center space-x-2 bg-[#1F2937]/70 border border-gray-800 px-3.5 py-2 rounded-xl text-xs text-gray-300">
          <Calendar className="w-4 h-4 text-[#2563EB]" />
          <span>{currentDate}</span>
        </div>

        {/* Notification Bell */}
        <button 
          className="relative p-2.5 rounded-xl bg-[#1F2937] border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition-all cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#111827]"></span>
        </button>

        {/* Profile Avatar & Section */}
        <div className="flex items-center space-x-3 border-l border-[#1F2937] pl-6">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#2563EB] font-bold text-sm">
            VI
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">Operator User</div>
            <div className="text-[11px] text-[#22C55E] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
              Active Session
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
