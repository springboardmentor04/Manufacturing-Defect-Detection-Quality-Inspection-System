import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
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

export default function DefectTrendsPage() {
  const [trends, setTrends] = useState([]);
  const [analytics, setAnalytics] = useState({
    status_distribution: [],
    top_defects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrendData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resTrends, resAnalytics] = await Promise.all([
          fetch('/api/v1/supervisor/defect-trends', { headers }),
          fetch('/api/v1/supervisor/quality-analytics', { headers })
        ]);

        if (resTrends.ok) {
          const dataTrends = await resTrends.json();
          setTrends(dataTrends);
        }
        if (resAnalytics.ok) {
          const dataAnalytics = await resAnalytics.json();
          setAnalytics(dataAnalytics);
        }
      } catch (err) {
        console.error("Failed to fetch defect trend telemetry:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, []);

  return (
    <DashboardLayout
      title="Defect Trends"
      subtitle="VisionInspect AI Phase 8.1.2 — PostgreSQL Defect Telemetry & Anomaly Distribution"
    >
      <div className="space-y-8">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading defect trends...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Could not retrieve defect telemetry records from database.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Weekly Defect Trend Line Chart */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#EF4444]" />
                    <span>Weekly Defect Trend (Line Chart)</span>
                  </h2>
                  <p className="text-xs text-gray-400">Weekly defect volume tracking from PostgreSQL database</p>
                </div>
              </div>

              {trends.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">No inspection data available for defect trends.</p>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                      <Line type="monotone" dataKey="defects" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} name="Defects" />
                      <Line type="monotone" dataKey="passed" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} name="Passed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 2-Column Grid: Defect Bar Chart & Defect Severity Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Category Bar Chart */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Defects by Category (Bar Chart)</h2>
                  <p className="text-xs text-gray-400">PostgreSQL defect diagnostics frequency breakdown</p>
                </div>
                {analytics.top_defects.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No defect categories recorded yet.</p>
                ) : (
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.top_defects} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                        <YAxis dataKey="category" type="category" stroke="#9CA3AF" fontSize={11} width={120} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                        <Bar dataKey="count" fill="#2563EB" radius={[0, 8, 8, 0]} name="Occurrences" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Status Distribution Pie Chart */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Inspection Defect Status (Pie Chart)</h2>
                  <p className="text-xs text-gray-400">Pass vs Manual Review vs Critical Defect ratio</p>
                </div>
                {analytics.status_distribution.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No inspection status distribution recorded.</p>
                ) : (
                  <div className="h-72 w-full pt-2 flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie data={analytics.status_distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                          {analytics.status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#22C55E' : '#EF4444')} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#FFF' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex items-center space-x-4 text-xs pt-2">
                      {analytics.status_distribution.map((item) => (
                        <div key={item.name} className="flex items-center space-x-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#22C55E' }}></span>
                          <span className="text-gray-300 font-medium">{item.name} ({item.value.toLocaleString()})</span>
                        </div>
                      ))}
                    </div>
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
