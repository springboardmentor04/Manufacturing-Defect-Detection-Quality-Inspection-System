import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { 
  Users, 
  Database, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Unable to load data.');
        }
      } catch (err) {
        console.error("Failed to fetch admin dashboard:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="VisionInspect AI Phase 8.1.4 — PostgreSQL System Governance & Analytics"
    >
      <div className="space-y-8">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading system dashboard...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Could not retrieve system dashboard metrics from database.</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* System Status Banner */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-full ${data.system_status === 'OPERATIONAL' ? 'bg-[#22C55E]' : 'bg-[#FACC15]'}`}></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  System Operational Status: <strong className={data.system_status === 'OPERATIONAL' ? 'text-[#22C55E]' : 'text-[#FACC15]'}>{data.system_status}</strong>
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                GPU Telemetry: {data.gpu_cluster_load_pct !== null ? `${data.gpu_cluster_load_pct}%` : 'Hardware telemetry unavailable'}
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Total Users */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</span>
                  <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{data.metrics.total_users} Users</div>
                <p className="text-xs text-gray-400">Registered System Accounts</p>
              </div>

              {/* Total Datasets */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Datasets</span>
                  <div className="p-3 bg-[#22C55E]/10 rounded-xl text-[#22C55E]">
                    <Database className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{data.metrics.total_datasets} Dataset</div>
                <p className="text-xs text-gray-400">MVTec Industrial Spec (5,354 frames)</p>
              </div>

              {/* Total Inspections */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Inspections</span>
                  <div className="p-3 bg-[#FACC15]/10 rounded-xl text-[#FACC15]">
                    <HardDrive className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{data.metrics.total_inspections} Logged</div>
                <p className="text-xs text-gray-400">PostgreSQL Persistent Records</p>
              </div>

              {/* AI Model mAP@0.5 */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">mAP@0.5</span>
                  <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                    <Cpu className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#22C55E] tracking-tight">{data.metrics.model_map50_pct}%</div>
                <p className="text-xs text-gray-400">YOLOv8s Phase 4.4 Benchmark</p>
              </div>

            </div>

            {/* Model Metric Benchmark Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">mAP@0.5</span>
                <p className="text-lg font-bold text-[#22C55E] font-mono">{data.metrics.model_map50_pct}%</p>
              </div>
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Precision</span>
                <p className="text-lg font-bold text-[#2563EB] font-mono">{data.metrics.model_precision_pct}%</p>
              </div>
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Recall</span>
                <p className="text-lg font-bold text-[#FACC15] font-mono">{data.metrics.model_recall_pct}%</p>
              </div>
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">F1 Score</span>
                <p className="text-lg font-bold text-white font-mono">{data.metrics.model_f1_pct}%</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Monthly Inspections Line Chart */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Monthly Inspections</h2>
                  <p className="text-xs text-gray-400">Monthly inspection volume growth from PostgreSQL</p>
                </div>
                {data.monthly_inspections.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No inspection data available for monthly chart.</p>
                ) : (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthly_inspections}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                        <YAxis stroke="#9CA3AF" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                        <Line type="monotone" dataKey="inspections" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} name="Inspections" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Users by Role Bar Chart */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Users by Role</h2>
                  <p className="text-xs text-gray-400">User distribution across system roles from PostgreSQL</p>
                </div>
                {data.users_by_role.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No role breakdown available.</p>
                ) : (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.users_by_role}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                        <XAxis dataKey="role" stroke="#9CA3AF" fontSize={11} />
                        <YAxis stroke="#9CA3AF" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                        <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
