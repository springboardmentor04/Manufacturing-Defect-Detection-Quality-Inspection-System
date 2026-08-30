import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function AuditLogs() {
  const [shiftNote, setShiftNote] = useState("");
  const [notesList, setNotesList] = useState([
    { id: 1, author: "Sarah Jenkins (Senior QE)", shift: "Morning Shift (06:00 - 14:00)", note: "Line A camera calibrated for M8 Screws. Threshold updated to 0.72.", timestamp: "2026-08-28 13:45" },
    { id: 2, author: "David Chen (QA Spec)", shift: "Night Shift (22:00 - 06:00)", note: "Spike in surface scratches on Glass Bottles at 03:00. Line B conveyor belt cleaned.", timestamp: "2026-08-28 05:15" },
  ]);

  const [auditLogs] = useState([
    { id: "LOG-8801", timestamp: "2026-08-28 17:30:12", user: "Quality Engineer", action: "Calibrated Anomaly Threshold", detail: "Changed Anomaly Cutoff to 0.72", status: "Verified" },
    { id: "LOG-8802", timestamp: "2026-08-28 16:45:00", user: "Quality Engineer", action: "Manual Defect Override", detail: "INSP-9021 tagged False Positive -> Pass", status: "Approved" },
    { id: "LOG-8803", timestamp: "2026-08-28 15:10:22", user: "System Engine", action: "Reference Profile Rebuild", detail: "Updated 120 baseline images for Category 'Screw'", status: "Completed" },
    { id: "LOG-8804", timestamp: "2026-08-28 14:02:18", user: "Factory Supervisor", action: "Shift Changeover Sign-off", detail: "Approved Shift 1 Quality Certificate", status: "Signed" },
  ]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!shiftNote.trim()) return;
    const newEntry = {
      id: Date.now(),
      author: "Quality Engineer (You)",
      shift: "Evening Shift (14:00 - 22:00)",
      note: shiftNote,
      timestamp: new Date().toLocaleString(),
    };
    setNotesList([newEntry, ...notesList]);
    setShiftNote("");
  };

  const handlePrintCoA = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> Digital Shift & ISO Quality Audit Log
          </h2>
          <p className="text-slate-500 text-sm">
            ISO 9001 / IATF 16949 compliant audit trail logging, shift handovers, and batch quality certificates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintCoA}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <span>🖨️</span> Print Batch Certificate (CoA)
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Audit Compliance" value="ISO 9001:2015" accent="brand" icon="🏅" />
        <StatCard label="Logged Audit Events" value="1,240 logs" accent="teal" icon="📜" />
        <StatCard label="Shift Handover Notes" value={`${notesList.length} entries`} accent="amber" icon="📝" />
        <StatCard label="Certified Batches Today" value="8 / 8" accent="green" icon="✅" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>📜</span> Compliance Audit Trail Log
            </span>
            <span className="text-xs text-slate-400 font-mono">Immutable Log Stream</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Log ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / System</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-600">{log.id}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.timestamp}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800">{log.user}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800">{log.action}</p>
                      <p className="text-[11px] text-slate-500">{log.detail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Handover Notes Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span>📝</span> Shift Handover Notes
            </h3>

            <form onSubmit={handleAddNote} className="space-y-3 mb-4">
              <textarea
                rows="3"
                value={shiftNote}
                onChange={(e) => setShiftNote(e.target.value)}
                placeholder="Write shift quality updates, camera calibration notes, or warnings..."
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
              ></textarea>
              <button
                type="submit"
                className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <span>➕</span> Post Shift Note
              </button>
            </form>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notesList.map((entry) => (
                <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="font-bold text-slate-700">{entry.author}</span>
                    <span className="text-[10px] text-slate-400">{entry.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-brand-700 font-medium">{entry.shift}</p>
                  <p className="text-slate-700 pt-1 border-t border-slate-200/60">{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
