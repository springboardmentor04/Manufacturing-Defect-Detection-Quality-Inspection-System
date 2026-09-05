'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  getCurrentUserFromStorage,
  getDefectTrends,
  getDefectTypeBreakdown,
  getSeverityDistribution,
  UserProfile,
  DefectTrendItem,
  DefectTypeBreakdownItem,
  SeverityDistributionData,
} from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ShieldAlert,
  Calendar,
  AlertOctagon,
  RefreshCw,
  Layers,
  ArrowLeft,
  Flame,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function ManufacturingAnalyticsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [trends, setTrends] = useState<DefectTrendItem[]>([]);
  const [breakdown, setBreakdown] = useState<DefectTypeBreakdownItem[]>([]);
  const [severityDist, setSeverityDist] = useState<SeverityDistributionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Role Gate check: Only factory_supervisor is permitted
  useEffect(() => {
    const user = getCurrentUserFromStorage();
    setCurrentUser(user);
    if (!user) {
      setIsAuthorized(false);
      return;
    }
    if (user.role_name !== 'factory_supervisor') {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
  }, []);

  const loadAnalytics = async () => {
    if (isAuthorized === false) return;
    setIsLoading(true);
    try {
      const [trendData, breakdownData, sevData] = await Promise.all([
        getDefectTrends(period, startDate, endDate),
        getDefectTypeBreakdown(startDate, endDate),
        getSeverityDistribution(startDate, endDate),
      ]);
      setTrends(trendData || []);
      setBreakdown(breakdownData || []);
      setSeverityDist(sevData || null);
    } catch (err: any) {
      console.error('Error fetching manufacturing analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAnalytics();
    }
  }, [isAuthorized, period, startDate, endDate]);

  if (isAuthorized === false) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="flex-1 p-8 flex items-center justify-center">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md text-center space-y-4 shadow-2xl">
                <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl w-fit mx-auto border border-rose-500/20">
                  <AlertOctagon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The Manufacturing Analytics Dashboard is restricted to the <strong className="text-purple-400">factory_supervisor</strong> role only. Quality engineers are redirected to the Overview workspace.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Color palette for charts
  const TYPE_COLORS = ['#38bdf8', '#818cf8', '#fb7185', '#f59e0b', '#34d399', '#a78bfa', '#f43f5e'];

  const severityChartData = [
    { name: 'Critical (80-100)', count: severityDist?.critical_count || 0, fill: '#f43f5e' },
    { name: 'High (60-79)', count: severityDist?.high_count || 0, fill: '#f97316' },
    { name: 'Medium (40-59)', count: severityDist?.medium_count || 0, fill: '#f59e0b' },
    { name: 'Low (0-39)', count: severityDist?.low_count || 0, fill: '#10b981' },
  ];

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <BarChart3 className="w-4 h-4" /> Supervisor Executive Telemetry
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  Manufacturing Analytics
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Deep-dive operational trend analysis, yield distributions, defect root causes, and severity distributions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={loadAnalytics}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Refresh Analytics"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Toolbar: Daily/Weekly Toggle & Date Range */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Timeframe:</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Daily vs Weekly Granularity Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setPeriod('daily')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    period === 'daily'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Daily Breakdown
                </button>
                <button
                  onClick={() => setPeriod('weekly')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    period === 'weekly'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Weekly Rollup
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-24 text-center text-slate-400 space-y-3">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Aggregating time-series telemetry and distributions...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Defect & Yield Trends Over Time */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-5 h-5 text-sky-400" />
                      <div>
                        <h3 className="font-bold text-slate-100 text-base">
                          Defect Trends & Inspection Volumes Over Time
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {period === 'daily' ? 'Day-by-day' : 'Week-by-week'} throughput comparing total parts inspected, pass yield, and defects logged.
                        </p>
                      </div>
                    </div>
                  </div>

                  {trends.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No inspection activity recorded in this date range.
                    </div>
                  ) : (
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="period_label" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Line
                            type="monotone"
                            dataKey="total_inspections"
                            name="Total Inspected"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="pass_count"
                            name="Passed (0 Defects)"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="fail_count"
                            name="Failed (Defects)"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="total_defects"
                            name="Defects Localized"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Grid: Defect Type Breakdown (Left) + Severity Distribution (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Defect Type Breakdown */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-slate-100 text-base">Defect Type Breakdown</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {breakdown.reduce((acc, b) => acc + b.count, 0)} total anomalies
                      </span>
                    </div>

                    {breakdown.length === 0 ? (
                      <div className="py-16 text-center text-slate-500 text-xs">
                        Zero defects recorded in this time window.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={breakdown}
                              layout="vertical"
                              margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                              <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                              <YAxis
                                dataKey="defect_type"
                                type="category"
                                stroke="#94a3b8"
                                fontSize={11}
                                width={110}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f172a',
                                  borderColor: '#334155',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                }}
                                formatter={(value: any, name: any, item: any) => [
                                  `${value} occurrences (Avg Sev: ${item.payload.avg_severity_score})`,
                                  'Defect Count',
                                ]}
                              />
                              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {breakdown.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Defect Type Summary Table */}
                        <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold">
                              <tr>
                                <th className="py-2.5 px-3">Defect Classification</th>
                                <th className="py-2.5 px-3">Frequency</th>
                                <th className="py-2.5 px-3 text-right">Avg Severity Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {breakdown.map((item, idx) => (
                                <tr key={item.defect_type} className="hover:bg-slate-800/40">
                                  <td className="py-2 px-3 font-semibold text-slate-200 capitalize">
                                    {item.defect_type.replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-300">
                                    {item.count}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-orange-400">
                                    {item.avg_severity_score}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Severity Distribution */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-rose-400" />
                        <h3 className="font-bold text-slate-100 text-base">Severity Tier Distribution</h3>
                      </div>
                      <span className="text-xs text-slate-400">Milestone 3 Weights</span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={severityChartData}
                          margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {severityChartData.map((entry, index) => (
                              <Cell key={`sev-cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Quick Metric Cards for Severity Tiers */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">Critical</span>
                        <span className="text-xl font-black text-rose-300 font-mono">
                          {severityDist?.critical_count ?? 0}
                        </span>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-orange-400 font-bold uppercase block">High</span>
                        <span className="text-xl font-black text-orange-300 font-mono">
                          {severityDist?.high_count ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Medium</span>
                        <span className="text-xl font-black text-amber-300 font-mono">
                          {severityDist?.medium_count ?? 0}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Low</span>
                        <span className="text-xl font-black text-emerald-300 font-mono">
                          {severityDist?.low_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
