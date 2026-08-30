import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function BatchAnalytics() {
  const [selectedShift, setSelectedShift] = useState("all");

  const batchData = [
    { id: "BATCH-20260828-A", product: "Fastener Screw M8", shift: "Day", total: 1200, passed: 1164, failed: 36, passRate: "97.0%", scrapCost: "$144", reworkSavings: "$210" },
    { id: "BATCH-20260828-B", product: "Pharma Capsule Gel", shift: "Night", total: 2500, passed: 2420, failed: 80, passRate: "96.8%", scrapCost: "$320", reworkSavings: "$450" },
    { id: "BATCH-20260828-C", product: "Glass Bottle 500ml", shift: "Day", total: 850, passed: 812, failed: 38, passRate: "95.5%", scrapCost: "$285", reworkSavings: "$340" },
    { id: "BATCH-20260828-D", product: "Grid Mesh Panel", shift: "Night", total: 400, passed: 391, failed: 9, passRate: "97.8%", scrapCost: "$180", reworkSavings: "$270" },
  ];

  const filtered = selectedShift === "all" ? batchData : batchData.filter((b) => b.shift.toLowerCase() === selectedShift);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📦</span> Shift & Batch Performance Matrix
          </h2>
          <p className="text-slate-500 text-sm">
            Trace quality KPIs across production batches, compare Day vs Night shift yield, and estimate scrap savings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex text-xs font-semibold">
            {["all", "day", "night"].map((shift) => (
              <button
                key={shift}
                onClick={() => setSelectedShift(shift)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                  selectedShift === shift
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {shift === "all" ? "All Shifts" : `${shift} Shift`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Inspected Volume" value="4,950 units" accent="brand" icon="📦" />
        <StatCard label="Overall Pass Rate" value="96.7%" accent="green" icon="✅" />
        <StatCard label="Est. Scrap Loss" value="$929.00" accent="red" icon="💸" />
        <StatCard label="Rework ROI Savings" value="$1,270.00" accent="teal" icon="💰" />
      </div>

      {/* Shift Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>☀️</span> Day Shift Yield Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Inspected Volume</span>
              <span className="font-mono font-bold text-slate-800">2,050 units</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: "96.4%" }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Pass Rate: <strong className="text-emerald-600">96.4%</strong></span>
              <span>Rejects: <strong className="text-red-600">74 units</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🌙</span> Night Shift Yield Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Inspected Volume</span>
              <span className="font-mono font-bold text-slate-800">2,900 units</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: "96.9%" }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Pass Rate: <strong className="text-emerald-600">96.9%</strong></span>
              <span>Rejects: <strong className="text-red-600">89 units</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Traceability Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📋</span> Batch Traceability & Financial Loss Matrix
          </span>
          <span className="text-xs text-slate-400 font-mono">Real-time Batch Log</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Batch ID</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Total Inspected</th>
                <th className="px-4 py-3">Pass Rate</th>
                <th className="px-4 py-3">Scrap Cost</th>
                <th className="px-4 py-3">Rework ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-brand-600">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.product}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {b.shift} Shift
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.total} units</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-600">{b.passRate}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-600 font-semibold">{b.scrapCost}</td>
                  <td className="px-4 py-3 font-mono text-xs text-teal-600 font-semibold">{b.reworkSavings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
