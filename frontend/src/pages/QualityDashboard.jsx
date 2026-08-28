import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import ImageUpload from "../components/ImageUpload";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

const defectData = [
  { day: "Mon", defects: 12 },
  { day: "Tue", defects: 18 },
  { day: "Wed", defects: 9 },
  { day: "Thu", defects: 15 },
  { day: "Fri", defects: 11 },
  { day: "Sat", defects: 7 },
  { day: "Sun", defects: 5 },
];

export default function QualityDashboard() {

  // ==========================================
  // USER
  // ==========================================

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // ==========================================
  // REPORT DOWNLOAD
  // ==========================================

  const downloadReport = async (inspectionId) => {
    try {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        alert("Please login again.");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/inspections/${inspectionId}/report`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inspection_${inspectionId}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Report download error:", error);
      alert(error.message || "Failed to download report");
    }
  };

  // ==========================================
  // STATE
  // ==========================================

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH INSPECTIONS
  // ==========================================

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        setError("Authentication token not found. Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/inspections/",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.");
        }
        throw new Error(`Failed to fetch inspections (${response.status})`);
      }

      const data = await response.json();
      setInspections(data);

    } catch (err) {
      console.error("Inspection fetch error:", err);
      setError(err.message || "Failed to load inspection history");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    fetchInspections();
  }, []);

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  // ==========================================
  // DASHBOARD VALUES
  // ==========================================

  const totalInspections = inspections.length;

  const completedInspections = inspections.filter(
    (i) => i.preprocessing_status === "COMPLETED"
  ).length;

  const defectCount = inspections.filter(
    (i) => i.inspection_result === "FAIL" || i.prediction === "DEFECT"
  ).length;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <main id="dashboard" className="ml-64 min-h-screen p-8 relative z-10">

        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wider text-cyan-400">QUALITY CONTROL CENTER</p>
            <h1 className="mt-2 text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Quality Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Welcome back, {user?.full_name || "Quality Engineer"}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <span className="text-sm font-medium text-cyan-400">System Online</span>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Inspections"
            value={totalInspections}
            subtitle="Uploaded inspections"
            icon="🔍"
          />
          <StatCard
            title="Processed Images"
            value={completedInspections}
            subtitle="Preprocessing completed"
            icon="✅"
          />
          <StatCard
            title="Defects Found"
            value={defectCount}
            subtitle="Flagged by CNN model"
            icon="⚠️"
          />
          <StatCard
            title="Pass Rate"
            value={
              totalInspections > 0
                ? `${(((totalInspections - defectCount) / totalInspections) * 100).toFixed(1)}%`
                : "N/A"
            }
            subtitle="Good products detected"
            icon="🤖"
          />
        </div>

        {/* DEFECT TRENDS + ANIMATION */}
        <div id="defect-trends" className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* CHART */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Defect Detection Trends</h2>
              <p className="mt-1 text-sm text-slate-500">
                AI detected defects over the last 7 days
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={defectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="defects"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#050816', stroke: '#22d3ee', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#22d3ee' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI INSPECTION CORE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-purple-500/10 p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">AI Inspection Core</h2>
            <p className="mt-2 text-sm text-slate-400">Real-time vision inspection system</p>

            <div className="flex h-64 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative flex h-40 w-40 items-center justify-center rounded-full border border-cyan-400/30 shadow-[0_0_80px_rgba(34,211,238,0.2)]"
              >
                <div className="absolute h-32 w-32 rounded-full border border-cyan-400/20" />
                <div className="absolute h-20 w-20 rounded-full border border-cyan-400/30" />
                <div className="h-8 w-8 rounded-full bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)]" />
              </motion.div>
            </div>

            <div className="flex justify-between border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-slate-500">MODEL STATUS</p>
                <p className="mt-1 text-sm font-medium text-cyan-400">Operational</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">DEFECTS FOUND</p>
                <p className="mt-1 text-sm text-red-400 font-semibold">{defectCount}</p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* IMAGE UPLOAD / AI INSPECTION */}
        <section id="inspections" className="mt-8">
          <ImageUpload />
        </section>

        {/* INSPECTION HISTORY TABLE */}
        <section
          id="reports"
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Inspection Reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                Recently completed AI inspections
              </p>
            </div>
            <button
              onClick={fetchInspections}
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-400/20"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-8 py-8 text-center text-slate-400">
              Loading inspection reports...
            </div>
          )}

          {/* Empty */}
          {!loading && !error && inspections.length === 0 && (
            <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <p className="text-4xl">📷</p>
              <p className="mt-4 text-slate-400">No inspection reports found.</p>
              <p className="mt-2 text-sm text-slate-500">
                Upload an inspection image to generate a report.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && inspections.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-slate-500">
                    <th className="pb-4 font-medium">ID</th>
                    <th className="pb-4 font-medium">Prediction</th>
                    <th className="pb-4 font-medium">Result</th>
                    <th className="pb-4 font-medium">Severity</th>
                    <th className="pb-4 font-medium">Confidence</th>
                    <th className="pb-4 font-medium">Preprocessing</th>
                    <th className="pb-4 font-medium">Created</th>
                    <th className="pb-4 font-medium">Report</th>
                  </tr>
                </thead>

                <tbody>
                  {inspections.map((inspection) => (
                    <tr
                      key={inspection.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.03]"
                    >
                      {/* ID */}
                      <td className="py-4">
                        <span className="font-medium text-slate-300">#{inspection.id}</span>
                      </td>

                      {/* PREDICTION (CNN output) */}
                      <td className="py-4">
                        <span
                          className={
                            inspection.prediction === "DEFECT"
                              ? "rounded-full bg-red-400/10 border border-red-400/20 px-3 py-1 text-xs font-medium text-red-400"
                              : "rounded-full bg-green-400/10 border border-green-400/20 px-3 py-1 text-xs font-medium text-green-400"
                          }
                        >
                          {inspection.prediction || "N/A"}
                        </span>
                      </td>

                      {/* RESULT (PASS / FAIL) */}
                      <td className="py-4">
                        <span
                          className={
                            inspection.inspection_result === "FAIL"
                              ? "rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400"
                              : "rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-400"
                          }
                        >
                          {inspection.inspection_result === "FAIL" ? "❌ FAIL" : "✅ PASS"}
                        </span>
                      </td>

                      {/* SEVERITY */}
                      <td className="py-4">
                        {inspection.severity_level ? (
                          <span className={`text-xs font-semibold ${inspection.severity_level === 'Critical' ? 'text-red-500' :
                              inspection.severity_level === 'High' ? 'text-orange-500' :
                                inspection.severity_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                            }`}>
                            {inspection.severity_level} ({inspection.severity_score})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>

                      {/* CONFIDENCE */}
                      <td className="py-4">
                        <span className="text-sm font-medium text-cyan-400">
                          {inspection.confidence != null
                            ? `${inspection.confidence}%`
                            : "N/A"}
                        </span>
                      </td>

                      {/* PREPROCESSING */}
                      <td className="py-4">
                        {inspection.preprocessing_status === "COMPLETED" ? (
                          <span className="rounded-full bg-green-400/10 border border-green-400/20 px-3 py-1 text-xs font-medium text-green-400">
                            ✅ DONE
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-xs font-medium text-yellow-400">
                            ⏳ {inspection.preprocessing_status || "PENDING"}
                          </span>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="py-4 text-sm text-slate-400">
                        {formatDate(inspection.created_at)}
                      </td>

                      {/* DOWNLOAD */}
                      <td className="py-4">
                        <button
                          onClick={() => downloadReport(inspection.id)}
                          className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-400 transition hover:bg-cyan-400/20"
                        >
                          📄 PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}