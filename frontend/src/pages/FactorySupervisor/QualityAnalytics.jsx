import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../api/axios";

export default function QualityAnalytics() {
  const [metrics, setMetrics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/analytics/quality-metrics"),
      api.get("/api/analytics/category-performance"),
    ])
      .then(([metricsRes, catRes]) => {
        setMetrics(metricsRes.data);
        setCategories(catRes.data.categories || []);
      })
      .catch((err) => console.error("Error loading quality analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">Loading production quality analytics...</div>
      </DashboardLayout>
    );
  }

  const getRiskBadge = (rating) => {
    if (rating === "High Risk") return "bg-red-50 text-red-700 border-red-200";
    if (rating === "Medium Risk") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Production Quality Analytics</h2>
        <p className="text-slate-500 text-sm">
          Executive quality control KPIs, pass/fail metrics, product risk matrix, and operational quality insights.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Overall Quality Index"
          value={`${metrics?.quality_index || 100}/100`}
          icon="🏆"
          sub="Plant-wide health score"
        />
        <StatCard
          title="Inspection Pass Rate"
          value={`${metrics?.pass_rate_pct || 0}%`}
          icon="✅"
          sub={`${metrics?.passed_inspections || 0} passed / ${metrics?.evaluated_inspections || 0} evaluated`}
        />
        <StatCard
          title="Defect Rate"
          value={`${metrics?.defect_rate_pct || 0}%`}
          icon="❌"
          sub={`${metrics?.failed_inspections || 0} defective items`}
        />
        <StatCard
          title="Avg Defect Severity"
          value={metrics?.avg_severity_score || 0}
          icon="⚡"
          sub="Scale 0-100"
        />
      </div>

      {/* Automation & Throughput Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="text-3xl">🤖</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inspection Automation Rate</p>
            <p className="text-xl font-bold text-slate-800">{metrics?.automation_rate_pct || 98.5}%</p>
            <p className="text-[11px] text-slate-400">Automated pass/fail decision making</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="text-3xl">⚡</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Processing Latency</p>
            <p className="text-xl font-bold text-slate-800">{metrics?.avg_inspection_time_ms || 124} ms</p>
            <p className="text-[11px] text-slate-400">Real-time computer vision processing</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="text-3xl">🚨</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Critical Quality Alerts</p>
            <p className="text-xl font-bold text-red-600">{metrics?.critical_defects || 0} Critical</p>
            <p className="text-[11px] text-slate-400">Immediate action required</p>
          </div>
        </div>
      </div>

      {/* Category Quality Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Product Line Quality Matrix</h3>
            <p className="text-xs text-slate-500">Quality performance and defect risk breakdown by product category</p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
            {categories.length} Categories Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Product Category</th>
                <th className="py-3 px-4">Total Inspected</th>
                <th className="py-3 px-4">Passed</th>
                <th className="py-3 px-4">Defects</th>
                <th className="py-3 px-4">Pass Rate</th>
                <th className="py-3 px-4">Avg Severity</th>
                <th className="py-3 px-4">Model Confidence</th>
                <th className="py-3 px-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {categories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 capitalize">
                    {cat.category.replace(/_/g, " ")}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{cat.total}</td>
                  <td className="py-3.5 px-4 font-medium text-emerald-600">{cat.passed}</td>
                  <td className="py-3.5 px-4 font-medium text-red-600">{cat.failed}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{cat.pass_rate_pct}%</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{cat.avg_severity}</td>
                  <td className="py-3.5 px-4 text-slate-600">{cat.avg_confidence}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRiskBadge(cat.risk_rating)}`}>
                      {cat.risk_rating}
                    </span>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No product categories evaluated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Insights Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-bold mb-2 flex items-center gap-2">
          <span>💡</span> Operational Quality Recommendations
        </h3>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li>
            Product lines with <span className="text-amber-400 font-semibold">Defect Rate &gt; 20%</span> should undergo camera recalibration and reference model retraining.
          </li>
          <li>
            Items flagged with <span className="text-red-400 font-semibold">Critical Severity (&gt;80)</span> automatically trigger rejection workflow to prevent line outflow.
          </li>
          <li>
            Maintain reference training sample size of at least 30 good images per product category to optimize anomaly detection precision.
          </li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
