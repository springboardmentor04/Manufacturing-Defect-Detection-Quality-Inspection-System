import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import StatusPieChart from "../../components/charts/StatusPieChart";
import CategoryBarChart from "../../components/charts/CategoryBarChart";
import ImageGallery from "../../components/ImageGallery";
import api, { resolveImageUrl } from "../../api/axios";
import { Link } from "react-router-dom";

export default function QEDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/inspections/dashboard/stats"),
      api.get("/api/inspections", { params: { page: 1, page_size: 5 } }),
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
      <h2 className="text-xl font-bold text-slate-800 mb-1">Quality Engineer Dashboard</h2>
      <p className="text-slate-500 text-sm mb-6">
        Upload product images and track your inspection results.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Total Inspections" value={stats.total_inspections} accent="brand" icon="📊" />
            <StatCard label="Pending Review" value={stats.pending} accent="amber" icon="⏳" />
            <StatCard label="Passed" value={stats.passed} accent="green" icon="✅" />
            <StatCard label="Failed" value={stats.failed} accent="red" icon="⚠️" />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Status Breakdown</h3>
              <StatusPieChart data={stats.status_breakdown} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Inspections by Product</h3>
              <CategoryBarChart data={stats.category_breakdown} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Recent Uploads</h3>
              <Link to="/upload" className="text-sm text-brand-600 font-medium hover:underline">
                + Upload New Image
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No inspections yet. Upload your first product image to get started.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={item.product_name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{item.product_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.status === "pass"
                          ? "bg-emerald-50 text-emerald-600"
                          : item.status === "fail"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">All Inspection Images</h3>
            <ImageGallery items={allImages} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}