import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api, { resolveImageUrl } from "../../api/axios";

const statusStyles = {
  pass: "bg-emerald-50 text-emerald-600 border-emerald-200",
  fail: "bg-red-50 text-red-600 border-red-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  processing: "bg-blue-50 text-blue-600 border-blue-200",
};

const severityStyles = {
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function InspectionReports() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [selectedInspection, setSelectedInspection] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadInspections = () => {
    setLoading(true);
    const params = { page: 1, page_size: 60 };
    if (statusFilter) params.status = statusFilter;
    if (severityFilter) params.severity_level = severityFilter;
    if (searchTerm) params.product_name = searchTerm;

    api
      .get("/api/inspections", { params })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => console.error("Error loading inspections:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInspections();
  }, [statusFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInspections();
  };

  const toggleHeatmap = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quality Inspection Reports</h2>
          <p className="text-slate-500 text-sm">
            Plant-wide inspection records, defect localization heatmaps, and severity scoring reports ({total} total).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Severity Level:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical (80-100)</option>
            <option value="High">High (60-79)</option>
            <option value="Medium">Medium (40-59)</option>
            <option value="Low">Low (0-39)</option>
          </select>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none w-full"
          />
          <button
            type="submit"
            className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Grid of Inspection Cards */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading inspection reports...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const showHeatmap = expanded[item.id] && item.heatmap_url;
            const hasPrediction = item.status === "pass" || item.status === "fail";
            const sevLevel = item.severity_level || "Low";

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="relative bg-slate-900">
                    <img
                      src={resolveImageUrl(showHeatmap ? item.heatmap_url : item.image_url)}
                      alt={item.product_name}
                      className="w-full h-44 object-contain bg-slate-900"
                    />
                    {item.heatmap_url && (
                      <button
                        onClick={() => toggleHeatmap(item.id)}
                        className="absolute top-2 right-2 text-[11px] font-semibold bg-white/90 hover:bg-white text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm"
                      >
                        {showHeatmap ? "Original" : "Heatmap"}
                      </button>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[item.status]}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-slate-800 text-sm capitalize truncate">{item.product_name}</h4>
                      {item.severity_score !== null && item.severity_score !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityStyles[sevLevel]}`}>
                          {item.severity_score} ({sevLevel})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Inspector: {item.uploaded_by_name || "System"}</p>

                    {item.defect_type && (
                      <div className="mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          {item.defect_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}

                    {hasPrediction && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600 mb-2">
                        <div>Conf: <strong className="text-slate-800">{Math.round((item.confidence_score || 0) * 100)}%</strong></div>
                        <div>Quality: <strong className="text-slate-800">{item.quality_report?.quality_score || 0}/100</strong></div>
                      </div>
                    )}

                    {item.quality_recommendation && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-slate-50/80 p-2 rounded border border-slate-100">
                        "{item.quality_recommendation}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => setSelectedInspection(item)}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              No inspection reports match the selected filters.
            </div>
          )}
        </div>
      )}

      {/* Detailed Modal View */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedInspection(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{selectedInspection.product_name} Inspection</h3>
            <p className="text-xs text-slate-500 mb-4">Inspection ID: {selectedInspection.id}</p>

            <img
              src={resolveImageUrl(selectedInspection.heatmap_url || selectedInspection.image_url)}
              alt="Inspection detail"
              className="w-full h-56 object-contain bg-slate-900 rounded-lg mb-4"
            />

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Status:</span>
                <span className="font-bold uppercase text-slate-800">{selectedInspection.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Severity Score & Level:</span>
                <span className="font-bold text-red-600">{selectedInspection.severity_score} ({selectedInspection.severity_level})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Defect Type:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedInspection.defect_type || "None"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Model Used:</span>
                <span className="font-mono text-slate-600">{selectedInspection.model_used || "Default"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">Recommended Action:</p>
                <p className="text-slate-600">{selectedInspection.quality_recommendation || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}