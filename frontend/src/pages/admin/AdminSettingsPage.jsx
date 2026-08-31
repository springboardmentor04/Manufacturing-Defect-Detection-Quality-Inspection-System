import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Settings, Lock, Bell, Shield, Key, Eye } from 'lucide-react';

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState({ name: 'Marcus Vance', email: 'm.vance@factory.ai' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [notifications, setNotifications] = useState({ emailAlerts: true, criticalAlerts: true, dailyDigest: false });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <DashboardLayout
      title="Admin Settings"
      subtitle="Security Configurations, Profile Preferences & API Telemetry Options"
    >
      <div className="space-y-6 max-w-4xl">
        
        {/* Profile Settings */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#2563EB]" />
            <span>Profile & Account Settings</span>
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-[#1F2937] border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-[#1F2937] border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 font-bold text-white rounded-xl shadow-md cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#22C55E]" />
            <span>Security & Password</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-300 mb-1">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-[#1F2937] border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block font-semibold text-gray-300 mb-1">New Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-[#1F2937] border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div className="pt-2">
              <button className="px-5 py-2.5 bg-[#1F2937] hover:bg-gray-700 font-bold text-gray-200 border border-gray-700 rounded-xl cursor-pointer">
                Update Password
              </button>
            </div>
          </div>
        </div>

        {/* API Key Placeholder & Theme Settings */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-[#FACC15]" />
            <span>API Key & Integration Configurations</span>
          </h2>
          <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
            <span className="text-gray-400 font-semibold">Active Backend API Key:</span>
            <div className="font-mono text-white font-bold bg-[#0B0F19] p-2.5 rounded-lg border border-gray-800 select-all">
              vi_live_sec_9948102839182049182049182
            </div>
            <p className="text-gray-500">Dark Theme is enforced as the enterprise standard across all portals.</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
