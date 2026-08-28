import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

// ==========================================
// PRODUCTION DATA
// ==========================================

const productionData = [
  { day: "Mon", production: 820, target: 900 },
  { day: "Tue", production: 950, target: 900 },
  { day: "Wed", production: 880, target: 900 },
  { day: "Thu", production: 1020, target: 950 },
  { day: "Fri", production: 1100, target: 1000 },
  { day: "Sat", production: 920, target: 950 },
  { day: "Sun", production: 760, target: 800 },
];

// ==========================================
// MACHINE DATA
// ==========================================

const machineData = [
  { name: "Machine A", status: "Running", efficiency: "96%" },
  { name: "Machine B", status: "Running", efficiency: "91%" },
  { name: "Machine C", status: "Maintenance", efficiency: "0%" },
  { name: "Machine D", status: "Running", efficiency: "94%" },
];

// ==========================================
// SUPERVISOR DASHBOARD
// ==========================================

export default function SupervisorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const [overviewRes, analyticsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/inspections/supervisor/overview", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/inspections/supervisor/analytics", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        if (!overviewRes.ok || !analyticsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const overviewData = await overviewRes.json();
        const analyticsData = await analyticsRes.json();

        setDashboardData(overviewData);
        setAnalyticsData(analyticsData);
      } catch (err) {
        console.error("Error fetching supervisor data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://127.0.0.1:8000/inspections/supervisor/report/download", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "production_quality_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download report");
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="ml-64 min-h-screen p-8 relative z-10">

        {/* PRODUCTION OVERVIEW */}
        <section id="production-overview" className="scroll-mt-6">
          {/* HEADER */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wider text-cyan-400">
                PRODUCTION CONTROL CENTER
              </p>
              <h1 className="mt-2 text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Production Overview
              </h1>
              <p className="mt-2 text-slate-400">
                Welcome back, {user?.full_name || "Factory Supervisor"}
              </p>
            </div>

            {/* ONLINE STATUS & ACTIONS */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownloadReport}
                className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-5 py-3 font-medium text-purple-400 transition hover:bg-purple-500/20 backdrop-blur-md flex items-center gap-2"
              >
                <span>📄</span> Download Quality Report
              </button>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <span className="text-sm font-medium text-cyan-400">
                    Production Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Units Produced" value="6,450" subtitle="+8.4% this week" icon="🏭" />
            <StatCard title="Production Efficiency" value="92.6%" subtitle="+4.2% improvement" icon="⚡" />
            <StatCard title="Active Machines" value="18" subtitle="2 machines in maintenance" icon="⚙️" />
            <StatCard title="Downtime" value="2.4%" subtitle="-1.2% this week" icon="⏱️" />
          </div>

          {/* PRODUCTION CHART */}
          <div className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl"
            >
              <h2 className="text-xl font-semibold">Production Performance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Actual production compared with daily targets
              </p>

              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="production" stroke="#22d3ee" strokeWidth={3} name="Production" dot={{ r: 5, fill: '#050816', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#22d3ee' }} />
                    <Line type="monotone" dataKey="target" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" name="Target" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PRODUCTION MONITORING */}
        <section id="production-monitoring" className="mt-8 scroll-mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Production Monitoring</h2>
                <p className="mt-1 text-sm text-slate-500">Live machine status</p>
              </div>
              <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400">
                LIVE
              </span>
            </div>

            {/* MACHINE TABLE */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-slate-500">
                    <th className="pb-4 font-medium">Machine</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium">Efficiency</th>
                    <th className="pb-4 font-medium">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {machineData.map((machine, index) => (
                    <tr key={index} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                      <td className="py-4 font-medium text-slate-300">{machine.name}</td>
                      <td className="py-4">
                        <span className={machine.status === "Running" ? "text-cyan-400 font-medium" : "text-yellow-400 font-medium"}>
                          ● {machine.status}
                        </span>
                      </td>
                      <td className="py-4 font-medium">{machine.efficiency}</td>
                      <td className="py-4">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{ width: machine.efficiency }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* INSPECTION OVERVIEW */}
        <section id="inspection-overview" className="mt-8 scroll-mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Inspection Overview (Live)</h2>
                <p className="mt-1 text-sm text-slate-500">AI-based quality inspection summary</p>
              </div>
              <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400">
                AI INSPECTION
              </span>
            </div>

            {loading ? (
              <div className="mt-6 text-center text-slate-400 py-8">Loading live data...</div>
            ) : error ? (
              <div className="mt-6 text-center text-red-400 py-8">{error}</div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm text-slate-500">TOTAL INSPECTIONS</p>
                  <p className="mt-2 text-3xl font-bold">{dashboardData?.total_inspections || 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm text-slate-500">GOOD PRODUCTS</p>
                  <p className="mt-2 text-3xl font-bold text-green-400">{dashboardData?.total_good || 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm text-slate-500">DEFECTS DETECTED</p>
                  <p className="mt-2 text-3xl font-bold text-red-400">{dashboardData?.total_defects || 0}</p>
                </div>
              </div>
            )}

            {/* INSPECTION STATUS */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-medium">AI Inspection System</p>
                  <p className="text-sm text-slate-500">Inspection service is operational</p>
                </div>
                <span className="ml-auto rounded-full bg-green-400/10 px-3 py-1 text-xs font-medium text-green-400">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* DEFECT ANALYTICS */}
        <section id="defect-analytics" className="mt-8 scroll-mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Defect Analytics</h2>
                <p className="mt-1 text-sm text-slate-500">Quality risk assessment and defect categorization</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-slate-400 py-8">Loading analytics...</div>
            ) : error ? (
              <div className="text-center text-red-400 py-8">{error}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Defect Types Pie Chart */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-4 text-center">Defect Categorization</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData?.defect_types_distribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(analyticsData?.defect_types_distribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Severity Bar Chart */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-4 text-center">Severity Scoring Reports</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.severity_distribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]}>
                          {(analyticsData?.severity_distribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              entry.name === 'Critical' ? '#ef4444' :
                                entry.name === 'High' ? '#f97316' :
                                  entry.name === 'Medium' ? '#eab308' : '#3b82f6'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Trend Monitoring */}
                <div className="col-span-1 lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-4 text-center">Defect Trend Monitoring (Last 7 Days)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData?.trend_data || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} name="Total Inspections" />
                        <Line type="monotone" dataKey="defects" stroke="#ef4444" strokeWidth={2} name="Defects Detected" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FACTORY STATUS */}
        <section id="factory-status" className="mt-8 scroll-mt-6">
          <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-purple-500/10 p-6 shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Factory Status</h2>
                <p className="mt-2 text-slate-400">Current production environment status</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <span className="text-cyan-400 font-medium">Operational</span>
                </div>
              </div>
            </div>

            {/* FACTORY STATUS CARDS */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-sm text-slate-500">FACTORY STATUS</p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">Operational</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-sm text-slate-500">DEFECT RATE</p>
                <p className="mt-2 text-2xl font-bold text-red-400">{dashboardData?.defect_rate || 0}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-sm text-slate-500">AVG AI CONFIDENCE</p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">{dashboardData?.average_confidence || 0}%</p>
              </div>
            </div>

            {/* FACTORY MESSAGE */}
            <div className="mt-6 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏭</span>
                <div>
                  <p className="font-medium">Factory Operating Normally</p>
                  <p className="text-sm text-slate-500">
                    Production systems and AI inspection services are operational.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SPACE */}
        <div className="h-16" />
      </main>
    </div>
  );
}