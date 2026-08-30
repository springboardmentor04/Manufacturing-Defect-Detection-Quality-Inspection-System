import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import api, { resolveImageUrl } from "../../api/axios";

export default function ProductionMonitoring() {
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inspRes, statsRes] = await Promise.all([
          api.get("/api/inspections", { params: { page: 1, page_size: 15 } }),
          api.get("/api/inspections/dashboard/stats"),
        ]);
        setInspections(inspRes.data.items);
        setStats(statsRes.data);

        // Filter active critical/high severity alerts
        const alerts = inspRes.data.items.filter(
          (i) => i.severity_level === "Critical" || i.severity_level === "High"
        );
        setActiveAlerts(alerts);
      } catch (err) {
        console.error("Error loading production monitoring data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Live poll every 10 sec
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">Connecting to real-time inspection stream...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>🏭</span> Production Line Real-Time Monitor
          </h2>
          <p className="text-slate-500 text-sm">
            Live inspection event stream, critical quality defect alerts, and operational throughput monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Feed Active
        </div>
      </div>

      {/* Critical Alert Banner if Critical defects exist */}
      {activeAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-sm">Quality Defect Alert: {activeAlerts.length} High-Severity Defect(s) Flagged</p>
              <p className="text-xs text-red-700">Immediate supervisor review or production pause recommended.</p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-3 py-1 rounded-md">
            Critical Action Required
          </span>
        </div>
      )}

      {/* Production KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Plant Inspections" value={stats?.total_inspections || 0} icon="📦" />
        <StatCard title="Passed Items" value={stats?.passed || 0} icon="✅" />
        <StatCard title="Flagged Defects" value={stats?.failed || 0} icon="❌" />
        <StatCard title="Avg Inference Speed" value="124 ms" icon="⚡" />
      </div>

      {/* Live Stream Grid & Feed Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Flagged Inspection Cards */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>Recent Defect Detections</span>
            <span className="text-xs font-normal text-slate-400">Live</span>
          </h3>

          <div className="space-y-3">
            {inspections
              .filter((i) => i.status === "fail")
              .slice(0, 4)
              .map((item) => (
                <div key={item.id} className="p-3 bg-red-50/50 rounded-lg border border-red-100 flex items-center gap-3">
                  <img
                    src={resolveImageUrl(item.heatmap_url || item.image_url)}
                    alt={item.product_name}
                    className="w-14 h-14 object-cover rounded border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.product_name}</p>
                    <p className="text-[11px] text-red-600 font-semibold uppercase">{item.defect_type || "Defect Detected"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <span>Sev: <strong className="text-red-700">{item.severity_score || 0}</strong></span>
                      <span>Level: <strong>{item.severity_level || "Critical"}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            {inspections.filter((i) => i.status === "fail").length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No defective items detected in recent stream.</p>
            )}
          </div>
        </div>

        {/* Live Stream Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Inspection Stream Log</h3>
            <span className="text-xs text-slate-400">Auto-refreshing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Defect Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {inspections.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 capitalize">
                      {item.product_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          item.status === "pass"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.defect_type ? item.defect_type.replace(/_/g, " ") : "-"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {item.severity_score !== null && item.severity_score !== undefined
                        ? `${item.severity_score} (${item.severity_level})`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {item.quality_recommendation ? (
                        <span className="truncate max-w-[180px] inline-block">
                          {item.quality_recommendation}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
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