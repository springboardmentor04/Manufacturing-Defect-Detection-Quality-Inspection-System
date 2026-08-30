import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import api, { resolveImageUrl } from "../../api/axios";

export default function QualityReports() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/inspections/dashboard/stats"),
      api.get("/api/inspections", { params: { page: 1, page_size: 100 } }),
    ])
      .then(([statsRes, listRes]) => {
        setStats(statsRes.data);
        setItems(listRes.data.items);
      })
      .catch((err) => console.error("Error loading quality reports:", err))
      .finally(() => setLoading(false));
  }, []);

  const analyzed = items.filter((i) => i.quality_report);
  const blurry = analyzed.filter((i) => i.quality_report.blur_flag);
  const lighting = analyzed.filter((i) => i.quality_report.brightness_flag !== "ok");
  const flagged = analyzed.filter((i) => i.quality_report.blur_flag || i.quality_report.brightness_flag !== "ok");

  const criticalItems = items.filter((i) => i.severity_level === "Critical");
  const highItems = items.filter((i) => i.severity_level === "High");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Engineer Quality & Severity Reports</h2>
        <p className="text-slate-500 text-sm">
          Image acquisition quality analysis, sharpness/lighting verification, and severity assessment reports.
        </p>
      </div>

      {loading || !stats ? (
        <p className="text-slate-500">Loading quality reports...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Images Analyzed" value={analyzed.length} accent="brand" icon="🖼️" />
            <StatCard
              label="Avg Image Quality"
              value={stats.avg_quality_score != null ? `${Math.round(stats.avg_quality_score)}/100` : "—"}
              accent="teal"
              icon="✨"
            />
            <StatCard
              label="Avg Severity Score"
              value={stats.avg_severity_score != null ? stats.avg_severity_score : "—"}
              accent="amber"
              icon="⚡"
            />
            <StatCard label="Critical Defects" value={criticalItems.length} accent="red" icon="🚨" />
          </div>

          {/* Action Required: Critical & High Defects */}
          {criticalItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 shadow-sm">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2 text-sm">
                <span>🚨</span> Critical Defects Requiring Rejection Workflow
              </h3>
              <div className="divide-y divide-red-100">
                {criticalItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-2.5">
                    <img
                      src={resolveImageUrl(item.heatmap_url || item.image_url)}
                      alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-cover border border-red-200"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-xs capitalize">{item.product_name}</p>
                      <p className="text-[11px] text-red-600 font-medium">Defect: {item.defect_type || "Structural Defect"}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                        Score {item.severity_score}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">{item.quality_recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Quality Flagged for Retake */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Image Quality Verification (Blur/Lighting Flagged)</h3>
            {flagged.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No image quality issues detected — all uploaded images passed resolution, blur, and lighting checks.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {flagged.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3">
                    <img
                      src={resolveImageUrl(item.image_url)}
                      alt={item.product_name}
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm capitalize">{item.product_name}</p>
                      <p className="text-xs text-slate-500 italic mt-0.5">{item.quality_report.recommendation}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {item.quality_report.quality_score}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}