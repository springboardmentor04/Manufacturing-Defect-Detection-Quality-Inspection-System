import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function IncidentCenter() {
  const [incidents, setIncidents] = useState([
    {
      id: "INC-3091",
      severity: "Critical",
      title: "Line B Defect Spike (> 3.5% reject rate)",
      location: "Inspection Line B (Bottles)",
      time: "10 mins ago",
      status: "Open",
      assignedTo: "Unassigned",
      description: "Multiple consecutive micro-cracks detected on bottle necks. Exceeds max allowable defect threshold.",
    },
    {
      id: "INC-3089",
      severity: "High",
      title: "Lighting Intensity Drift Warning",
      location: "Inspection Line A (Screws)",
      time: "45 mins ago",
      status: "Under Investigation",
      assignedTo: "Sarah Jenkins (QE)",
      description: "LUX sensor reports 15% drop in lighting brightness, affecting CLAHE contrast calculation.",
    },
    {
      id: "INC-3085",
      severity: "Medium",
      title: "Capsule Dent Clustering",
      location: "Inspection Line C (Capsules)",
      time: "2 hours ago",
      status: "Line Corrected",
      assignedTo: "Michael Chang (Tech)",
      description: "Batch 402 showed minor outer dent clustering. Conveyor feeder adjusted.",
    },
  ]);

  const [lineHalted, setLineHalted] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [assigneeName, setAssigneeName] = useState("");

  const handleStatusChange = (id, newStatus) => {
    setIncidents(
      incidents.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );
  };

  const handleAssignTask = (e) => {
    e.preventDefault();
    if (!assignModal || !assigneeName.trim()) return;
    setIncidents(
      incidents.map((inc) =>
        inc.id === assignModal.id ? { ...inc, assignedTo: assigneeName, status: "Under Investigation" } : inc
      )
    );
    setAssignModal(null);
    setAssigneeName("");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>🚨</span> Critical Incident Command Center
          </h2>
          <p className="text-slate-500 text-sm">
            Monitor real-time critical quality alerts, assign line response tickets, and trigger line halts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLineHalted(!lineHalted)}
            className={`px-4 py-2 font-bold text-sm rounded-lg shadow transition-colors flex items-center gap-2 ${
              lineHalted
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white animate-pulse"
            }`}
          >
            <span>{lineHalted ? "▶️ Resume Line B" : "🛑 EMERGENCY LINE B STOP"}</span>
          </button>
        </div>
      </div>

      {lineHalted && (
        <div className="mb-6 p-4 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-between shadow-lg animate-bounce">
          <span className="flex items-center gap-2">
            <span>🚨</span> EMERGENCY LINE B STOP TRIGGERED BY SUPERVISOR — CONVEYOR FEEDER HALTED
          </span>
          <button
            onClick={() => setLineHalted(false)}
            className="px-3 py-1 bg-white text-red-700 rounded text-xs font-extrabold uppercase hover:bg-red-50"
          >
            Reset Stop Trigger
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Incidents" value="3 open" accent="red" icon="⚠️" />
        <StatCard label="Critical Alarms (24h)" value="1 trigger" accent="amber" icon="🚨" />
        <StatCard label="Avg Incident Resolution" value="18 mins" accent="teal" icon="⏱️" />
        <StatCard label="Line Uptime Status" value="98.2%" accent="green" icon="⚡" />
      </div>

      {/* Incident List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📡</span> Live Triggered Incidents Stream
          </span>
          <span className="text-xs text-slate-400 font-mono">Updated 10s ago</span>
        </h3>

        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`p-4 rounded-xl border transition-all ${
                inc.severity === "Critical"
                  ? "bg-red-50/50 border-red-200"
                  : inc.severity === "High"
                  ? "bg-amber-50/50 border-amber-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      inc.severity === "Critical"
                        ? "bg-red-600 text-white"
                        : inc.severity === "High"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    {inc.severity}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">{inc.id}</span>
                  <span className="text-xs text-slate-500">• {inc.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  <select
                    value={inc.status}
                    onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                    className="text-xs font-semibold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Line Corrected">Line Corrected</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 text-sm mb-1">{inc.title}</h4>
              <p className="text-xs text-slate-600 mb-3">{inc.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500">📍 Location: <strong>{inc.location}</strong></span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    Assigned: <strong className="text-brand-700">{inc.assignedTo}</strong>
                  </span>
                  <button
                    onClick={() => setAssignModal(inc)}
                    className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded border border-brand-200 text-[11px]"
                  >
                    👤 Assign Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-lg">Assign Ticket #{assignModal.id}</h3>
            <p className="text-xs text-slate-500">{assignModal.title}</p>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assignee Name (Engineer / Tech)</label>
                <input
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Senior QE)"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow"
                >
                  Assign & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
