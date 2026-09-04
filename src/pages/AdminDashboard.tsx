import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { fetchUserList, updateUserRole } from '../services/api';
import { QualityEngineerDashboard } from './QualityEngineerDashboard';
import { FactorySupervisorDashboard } from './FactorySupervisorDashboard';
import { Settings, Users, Shield, Cpu, RefreshCw, Layers, Sliders, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SUPERVISOR' | 'ENGINEER' | 'USER_MGMT' | 'SETTINGS'>('SUPERVISOR');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('quality_engineer');
  const [selectedLine, setSelectedLine] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUserList();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      const updated = await updateUserRole(userId, selectedRole, selectedLine);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setEditingUserId(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 py-4">
      
      {/* Admin Suite Header */}
      <div className="glass-dark p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 w-fit mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Master Admin Suite • Full Platform Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Administration & Role Orchestration</h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Access master engineering station, supervisor analytics, user authorization logs, and AI model calibrations.
          </p>
        </div>

        {/* Master View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl text-xs font-semibold border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('SUPERVISOR')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'SUPERVISOR' ? 'bg-purple-600 text-white shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Supervisor View
          </button>
          <button
            onClick={() => setActiveTab('ENGINEER')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'ENGINEER' ? 'bg-purple-600 text-white shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Engineering Station
          </button>
          <button
            onClick={() => setActiveTab('USER_MGMT')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'USER_MGMT' ? 'bg-purple-600 text-white shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'SETTINGS' ? 'bg-purple-600 text-white shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            AI Engine Config
          </button>
        </div>
      </div>

      {/* Render Sub Views based on Active Tab */}
      {activeTab === 'SUPERVISOR' && <FactorySupervisorDashboard />}
      {activeTab === 'ENGINEER' && <QualityEngineerDashboard />}

      {/* User Management Tab */}
      {activeTab === 'USER_MGMT' && (
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">User Access Control & Plant Role Manager</h3>
              <p className="text-xs text-slate-500 font-medium">View registered personnel, edit roles, and reassign assembly lines</p>
            </div>

            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                User role updated!
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Assigned Line</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{u.fullName}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="py-3 px-3">
                      {editingUserId === u.id ? (
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                          className="px-2 py-1 rounded-xl glass-input text-xs font-semibold"
                        >
                          <option value="quality_engineer">Quality Engineer</option>
                          <option value="factory_supervisor">Factory Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-purple-500/10 text-purple-800 border border-purple-500/20' :
                          u.role === 'factory_supervisor' ? 'bg-blue-500/10 text-blue-800 border border-blue-500/20' : 'bg-teal-500/10 text-teal-800 border border-teal-500/20'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {editingUserId === u.id ? (
                        <input
                          type="text"
                          value={selectedLine}
                          onChange={(e) => setSelectedLine(e.target.value)}
                          className="px-2.5 py-1 rounded-xl glass-input text-xs font-semibold w-40"
                        />
                      ) : (
                        u.assignedLine || 'Assembly Line A1'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {editingUserId === u.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUpdateRole(u.id)}
                            className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1 bg-white/60 text-slate-700 rounded-full text-xs font-bold hover:bg-white/80 transition-colors border border-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setSelectedRole(u.role);
                            setSelectedLine(u.assignedLine || 'Assembly Line A1');
                          }}
                          className="px-3 py-1 text-xs font-bold text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-full transition-colors"
                        >
                          Edit Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Engine Config Tab */}
      {activeTab === 'SETTINGS' && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="border-b border-slate-200/60 pb-3">
            <h3 className="text-base font-bold text-slate-800">AI Computer Vision Model Configuration</h3>
            <p className="text-xs text-slate-500 font-medium">Model information and system parameters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">Active Model Architecture</label>
              <div className="px-3.5 py-2.5 rounded-2xl bg-white/60 border border-white/80 font-mono text-xs font-bold text-slate-800">
                YOLO Unified 20 Epochs (runs/detect/unified_20ep/weights/best.pt)
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                This is the trained model used for all inspections. Model switching is not available in this version.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">Inference Confidence Threshold</label>
              <div className="px-3.5 py-2.5 rounded-2xl bg-white/60 border border-white/80 font-mono text-xs font-bold text-slate-800">
                0.25 (25%)
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                The confidence threshold is configured at system startup and applies to all inspections.
              </p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-xs font-medium text-blue-900">
              <strong>System Info:</strong> This deployment uses a single trained model. To switch models or adjust thresholds, please contact your system administrator.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
