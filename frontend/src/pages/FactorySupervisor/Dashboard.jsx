import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import StatusPieChart from "../../components/charts/StatusPieChart";
import CategoryBarChart from "../../components/charts/CategoryBarChart";
import ImageGallery from "../../components/ImageGallery";
import api, { resolveImageUrl } from "../../api/axios";

export default function FSDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/inspections/dashboard/stats"),
      api.get("/api/inspections", { params: { page: 1, page_size: 8 } }),
      api.get("/api/inspections", { params: { page: 1, page_size: 60 } }),
    ])
      .then(([statsRes, listRes, allRes]) => {
        setStats(statsRes.data);
        setRecent(listRes.data.items);
        setAllImages(allRes.data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Production Overview</h2>
      <p className="text-slate-500 text-sm mb-6">
        Plant-wide inspection activity across all quality engineers.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
            <StatCard label="Total Inspections" value={stats.total_inspections} accent="brand" icon="📊" />
            <StatCard label="Pending Review" value={stats.pending} accent="amber" icon="⏳" />
            <StatCard label="Passed" value={stats.passed} accent="green" icon="✅" />
            <StatCard label="Failed" value={stats.failed} accent="red" icon="⚠️" />
            <StatCard label="Registered Users" value={stats.total_users ?? "—"} accent="teal" icon="🧑‍🤝‍🧑" />
            <StatCard
              label="Avg Confidence"
              value={stats.avg_confidence != null ? `${Math.round(stats.avg_confidence * 100)}%` : "—"}
              accent="teal"
              icon="🎯"
            />
            <StatCard
              label="Avg Image Quality"
              value={stats.avg_quality_score != null ? `${Math.round(stats.avg_quality_score)}/100` : "—"}
              accent="brand"
              icon="🖼️"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Status Breakdown</h3>
              <StatusPieChart data={stats.status_breakdown} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">By Product Line</h3>
              <CategoryBarChart data={stats.category_breakdown} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Defect Types</h3>
              <CategoryBarChart data={stats.defect_breakdown} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Plant-Wide Recent Inspections</h3>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm">No inspections have been submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="pb-2 pr-4">Image</th>
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4">Uploaded By</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="py-2.5 pr-4">
                          <img
                            src={resolveImageUrl(item.image_url)}
                            alt={item.product_name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-800">{item.product_name}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{item.uploaded_by_name}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              item.status === "pass"
                                ? "bg-emerald-50 text-emerald-600"
                                : item.status === "fail"
                                ? "bg-red-50 text-red-600"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">All Plant Inspection Images</h3>
            <ImageGallery items={allImages} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}