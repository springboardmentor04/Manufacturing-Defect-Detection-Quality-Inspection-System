import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { 
  Box, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  AlertTriangle, 
  Activity, 
  Layers, 
  Clock, 
  Filter, 
  Download,
  Server,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function SupervisorDashboard() {
  const [overview, setOverview] = useState({
    total_products: 0,
    passed_inspections: 0,
    failed_inspections: 0,
    manual_reviews: 0,
    pass_rate_pct: 100.0,
    defect_rate_pct: 0.0,
    ai_accuracy_pct: 98.6
  });

  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState({
    status_distribution: [
      { name: 'Passed', value: 0, color: '#22C55E' },
      { name: 'Manual Review', value: 0, color: '#FACC15' },
      { name: 'Critical Defect', value: 0, color: '#EF4444' }
    ],
    top_defects: []
  });

  const [trends, setTrends] = useState([
    { day: 'Mon', defects: 0, passed: 0 },
    { day: 'Tue', defects: 0, passed: 0 },
    { day: 'Wed', defects: 0, passed: 0 },
    { day: 'Thu', defects: 0, passed: 0 },
    { day: 'Fri', defects: 0, passed: 0 },
    { day: 'Sat', defects: 0, passed: 0 },
    { day: 'Sun', defects: 0, passed: 0 },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSupervisorData() {
      try {
        const token = localStorage.getItem('token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resOverview, resReports, resAnalytics, resTrends] = await Promise.all([
          fetch('/api/v1/supervisor/overview', { headers }),
          fetch('/api/v1/supervisor/reports', { headers }),
          fetch('/api/v1/supervisor/quality-analytics', { headers }),
          fetch('/api/v1/supervisor/defect-trends', { headers })
        ]);

        if (resOverview.ok) {
          const data = await resOverview.json();
          setOverview(data);
        }
        if (resReports.ok) {
          const data = await resReports.json();
          setReports(data);
        }
        if (resAnalytics.ok) {
          const data = await resAnalytics.json();
          setAnalytics(data);
        }
        if (resTrends.ok) {
          const data = await resTrends.json();
          setTrends(data);
        }
      } catch (err) {
        console.warn("Failed to fetch live supervisor telemetry from database:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorData();
  }, []);

  return (
    <DashboardLayout
      title="Supervisor Dashboard"
      subtitle="VisionInspect AI Phase 7.1 — Live PostgreSQL Production Overview & Telemetry"
    >
      <div className="space-y-8">
        
        {/* KPI Cards (4 Mandatory) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Products / Inspections */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Inspections</span>
              <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">{overview.total_products.toLocaleString()}</div>
            <p className="text-xs text-gray-400">Total units evaluated in DB</p>
          </div>

          {/* Card 2: Passed Inspections */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Passed Inspections</span>
              <div className="p-3 bg-[#22C55E]/10 rounded-xl text-[#22C55E]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#22C55E] tracking-tight">{overview.passed_inspections.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{overview.pass_rate_pct}% Pass Rate</p>
          </div>

          {/* Card 3: Failed Inspections */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Failed Inspections</span>
              <div className="p-3 bg-[#EF4444]/10 rounded-xl text-[#EF4444]">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#EF4444] tracking-tight">{overview.failed_inspections.toLocaleString()}</div>
            <p className="text-xs text-gray-400">{overview.defect_rate_pct}% Defect Rate</p>
          </div>

          {/* Card 4: AI Model Accuracy */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Model Accuracy</span>
              <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">{overview.ai_accuracy_pct}%</div>
            <p className="text-xs text-gray-400">YOLOv8s Phase 4.4 benchmark</p>
          </div>

        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Weekly Defect Trend (Line Chart) */}
          <div className="lg:col-span-2 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Weekly Defect Trend</h2>
                <p className="text-xs text-gray-400">Line chart tracking weekly defect occurrences in PostgreSQL</p>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }}
                  />
                  <Line type="monotone" dataKey="defects" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} name="Defects" />
                  <Line type="monotone" dataKey="passed" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} name="Passed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Inspection Status Distribution (Pie Chart) */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Inspection Status Ratio</h2>
              <p className="text-xs text-gray-400">Status ratio from PostgreSQL DB</p>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.status_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#22C55E' : '#EF4444')} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-around text-xs border-t border-[#1F2937] pt-3">
              {analytics.status_distribution.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#22C55E' }}></div>
                  <span className="text-gray-300 font-medium">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Recent Inspection Reports Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Recent Inspection Reports</h2>
              <p className="text-xs text-gray-400">Live PostgreSQL Database Query Records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Product ID</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Inspection Result</th>
                  <th className="px-4 py-3 rounded-r-xl">AI Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {reports.map((row, index) => (
                  <tr key={index} className="hover:bg-[#1F2937]/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-white font-semibold">{row.productId}</td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium">{row.productName}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        row.status === 'Passed'
                          ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                          : (row.status === 'Failed' ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30' : 'bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30')
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-200">{row.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
