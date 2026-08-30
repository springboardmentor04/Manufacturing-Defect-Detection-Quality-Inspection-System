import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api, { resolveImageUrl } from "../../api/axios";

const statusStyles = {
  pass: "bg-emerald-50 text-emerald-600",
  fail: "bg-red-50 text-red-600",
  pending: "bg-amber-50 text-amber-600",
  processing: "bg-blue-50 text-blue-600",
};

export default function InspectionHistory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const fetchData = () => {
    setLoading(true);
    api
      .get("/api/inspections", {
        params: { page: 1, page_size: 50, ...(statusFilter ? { status: statusFilter } : {}) },
      })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [statusFilter]);

  const toggleHeatmap = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inspection History</h2>
          <p className="text-slate-500 text-sm">{total} total inspection(s)</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          No inspections found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const showHeatmap = expanded[item.id] && item.heatmap_url;
            const hasPrediction = item.status === "pass" || item.status === "fail";
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="relative">
                  <img
                    src={resolveImageUrl(showHeatmap ? item.heatmap_url : item.image_url)}
                    alt={item.product_name}
                    className="w-full h-40 object-cover"
                  />
                  {item.heatmap_url && (
                    <button
                      onClick={() => toggleHeatmap(item.id)}
                      className="absolute top-2 right-2 text-[11px] font-medium bg-white/90 hover:bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm"
                    >
                      {showHeatmap ? "Original" : "Heatmap"}
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-slate-800 text-sm">{item.product_name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyles[item.status]}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  {item.batch_number && <p className="text-xs text-slate-500">Batch: {item.batch_number}</p>}
                  {item.defect_type && (
                    <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      {item.defect_type.replace(/_/g, " ")}
                    </span>
                  )}
                  {hasPrediction && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>Confidence: <span className="font-semibold text-slate-700">{Math.round((item.confidence_score || 0) * 100)}%</span></span>
                      {item.quality_report && (
                        <span>Quality: <span className="font-semibold text-slate-700">{item.quality_report.quality_score}/100</span></span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                  {item.notes && <p className="text-xs text-slate-500 mt-2 italic">"{item.notes}"</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}