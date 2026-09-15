"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, User, LogOut, Settings, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const mockNotifications = [
  { id: 1, title: "Inspection Complete", message: "Batch #4829 completed.", time: "2m ago", unread: true },
  { id: 2, title: "Weekly Report Ready", message: "Your quality report is ready.", time: "2h ago", unread: false },
];

export function Topbar() {
  const { role, user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            suppressHydrationWarning
            placeholder="Search inspections, defects, or products..." 
            className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-4">
        
        {/* Supervisor specific badges */}
        {role === "FACTORY_SUPERVISOR" && (
          <div className="hidden lg:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Factory Optimal
            </div>
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
              Morning Shift
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            suppressHydrationWarning 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold">Notifications</h3>
                  <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className={`text-sm font-medium ${n.unread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                        <span className="text-xs text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500">{n.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center bg-slate-50 dark:bg-slate-900/80 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400">
                  View All Notifications
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
        
        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            suppressHydrationWarning 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1 pl-2 pr-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {user ? user.name.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden md:flex flex-col items-start mr-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">
                {user ? user.name : "Loading..."}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
          
          <AnimatePresence>
            {showProfile && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 p-2"
              >
                {user && (
                  <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-semibold capitalize">
                      <Check className="w-3 h-3" /> {role?.replace("_", " ").toLowerCase()}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Link href="/profile" onClick={() => setShowProfile(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link href="/settings" onClick={() => setShowProfile(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
}
