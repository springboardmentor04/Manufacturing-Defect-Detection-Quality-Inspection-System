"use client";

import { useState } from "react";
import { Moon, Sun, Bell, Globe, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [theme, setTheme] = useState("system");
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your preferences and account settings.</p>
      </div>

      <div className="space-y-6">
        
        {/* Appearance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-600" /> Appearance
          </h2>
          <div className="flex gap-4">
            <button onClick={() => setTheme("light")} className={`flex-1 py-4 px-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <Sun className="w-6 h-6" />
              <span className="font-semibold text-sm">Light</span>
            </button>
            <button onClick={() => setTheme("dark")} className={`flex-1 py-4 px-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <Moon className="w-6 h-6" />
              <span className="font-semibold text-sm">Dark</span>
            </button>
            <button onClick={() => setTheme("system")} className={`flex-1 py-4 px-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'system' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <Globe className="w-6 h-6" />
              <span className="font-semibold text-sm">System</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" /> Notifications
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Push Notifications</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts on new defects and reports.</p>
            </div>
            <button 
              onClick={() => setNotifications(!notifications)} 
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Account & Security */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Security
          </h2>
          <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 mb-4 transition-colors">
            Change Password
          </button>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={logout} className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-3 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
