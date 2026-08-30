import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../api/axios";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SEVERITY_COLORS = {
  Critical: "#dc2626", // Red
  High: "#ea580c",     // Orange
  Medium: "#f59e0b",   // Amber
  Low: "#10b981",      // Green
};

const PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#14b8a6"];

export default function DefectTrends() {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/analytics/defect-trends")
      .then((res) => setTrendsData(res.data))
      .catch((err) => console.error("Error loading defect trends:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">Loading defect analytics trends...</div>
      </DashboardLayout>
    );
  }

  const dailyTrends = trendsData?.daily_trends || [];
  const defectTypes = trendsData?.defect_types || [];
  const severityDist = trendsData?.severity_distribution || [];

  const totalDefects = defectTypes.reduce((acc, curr) => acc + curr.count, 0);
  const topDefect = defectTypes.length > 0 ? defectTypes[0].type.replace(/_/g, " ") : "None";

  const criticalCount = severityDist.find((s) => s.level === "Critical")?.count || 0;
  const criticalPct = totalDefects > 0 ? Math.round((criticalCount / totalDefects) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Defect Analytics & Trends</h2>
        <p className="text-slate-500 text-sm">
          Manufacturing defect frequency monitoring, severity classification, and operational defect trends.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Defects Flagged" value={totalDefects} icon="⚠️" />
        <StatCard title="Top Defect Category" value={topDefect} icon="🔍" />
        <StatCard title="Critical Severity Ratio" value={`${criticalPct}%`} icon="🚨" />
        <StatCard title="Monitored Categories" value={defectTypes.length} icon="📊" />
      </div>

      {/* Defect Trends Over Time Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-1">Defect Frequency & Severity Trend Over Time</h3>
        <p className="text-xs text-slate-500 mb-4">Daily inspection defect count and average severity score timeline</p>
        {dailyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="failed" name="Defects (Fail)" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" />
              <Area type="monotone" dataKey="passed" name="Pass Rate" stroke="#10b981" fillOpacity={1} fill="url(#colorPassed)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="p-8 text-center text-slate-400">No time-series data recorded yet.</div>
        )}
      </div>

      {/* Charts Grid: Defect Types & Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Type Distribution Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Defect Type Classification Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Distribution of defect categories (scratch, crack, contamination, pitting)</p>
          {defectTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={defectTypes} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <XAxis dataKey="type" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value} instances`, "Count"]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {defectTypes.map((_, idx) => (
                    <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="p-8 text-center text-slate-400">No defect types classified yet.</div>
          )}
        </div>

        {/* Severity Level Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Defect Severity Level Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Severity Framework Breakdown (Critical, High, Medium, Low)</p>
          {severityDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={severityDist}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {severityDist.map((entry, idx) => (
                    <Cell key={idx} fill={SEVERITY_COLORS[entry.level] || PALETTE[idx % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="p-8 text-center text-slate-400">No severity metrics recorded yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
