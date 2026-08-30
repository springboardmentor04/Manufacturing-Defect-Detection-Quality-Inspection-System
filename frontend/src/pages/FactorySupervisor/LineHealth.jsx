import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function LineHealth() {
  const [selectedLine, setSelectedLine] = useState("line-a");

  const lines = [
    {
      id: "line-a",
      name: "Line A — Fasteners & Screws",
      cameraFps: "60 FPS",
      luxLevel: "1,240 LUX",
      sensorStatus: "Optimal",
      latency: "118 ms",
      uptime: "99.8%",
      cameraTemp: "38.2 °C",
      lastCalibrated: "2 hours ago",
    },
    {
      id: "line-b",
      name: "Line B — Glass Bottles",
      cameraFps: "58 FPS",
      luxLevel: "1,110 LUX",
      sensorStatus: "Warning Drift",
      latency: "135 ms",
      uptime: "97.4%",
      cameraTemp: "42.5 °C",
      lastCalibrated: "18 hours ago",
    },
    {
      id: "line-c",
      name: "Line C — Pharma Capsules",
      cameraFps: "60 FPS",
      luxLevel: "1,300 LUX",
      sensorStatus: "Optimal",
      latency: "112 ms",
      uptime: "99.9%",
      cameraTemp: "36.8 °C",
      lastCalibrated: "4 hours ago",
    },
  ];

  const current = lines.find((l) => l.id === selectedLine);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>⚡</span> Production Line & Hardware Health
          </h2>
          <p className="text-slate-500 text-sm">
            Live IoT camera telemetry, lighting sensors, edge compute latency, and predictive maintenance signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200">
            IoT Edge Sensors Online
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Avg Processing SLA" value="121 ms" accent="brand" icon="⚡" />
        <StatCard label="Camera Frame Rate" value="60 FPS" accent="teal" icon="📹" />
        <StatCard label="Lighting Uniformity" value="98.5%" accent="amber" icon="💡" />
        <StatCard label="Active Inspection Lines" value="3 / 3" accent="green" icon="🏭" />
      </div>

      {/* Line Selector Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {lines.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelectedLine(l.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedLine === l.id
                ? "bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/20"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{l.name}</span>
              <span
                className={`w-3 h-3 rounded-full ${
                  l.sensorStatus === "Optimal" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
            </div>
            <p className={`text-xs ${selectedLine === l.id ? "text-brand-100" : "text-slate-500"}`}>
              Latency: {l.latency} • FPS: {l.cameraFps}
            </p>
          </button>
        ))}
      </div>

      {/* Telemetry Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-6">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>🎛️</span> Edge Hardware Telemetry — {current.name}
            </span>
            <span className="text-xs text-slate-400 font-mono">Sensors Live</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Camera Frame Rate</p>
              <p className="text-lg font-bold text-slate-800 font-mono">{current.cameraFps}</p>
              <span className="text-[10px] text-emerald-600">Stable Stream</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Lighting Intensity</p>
              <p className="text-lg font-bold text-slate-800 font-mono">{current.luxLevel}</p>
              <span className="text-[10px] text-amber-600">LUX Sensor</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Inference Latency</p>
              <p className="text-lg font-bold text-brand-600 font-mono">{current.latency}</p>
              <span className="text-[10px] text-slate-400">Target &lt; 200ms</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Camera Enclosure Temp</p>
              <p className="text-lg font-bold text-slate-800 font-mono">{current.cameraTemp}</p>
              <span className="text-[10px] text-emerald-600">Normal Range</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Line Uptime SLA</p>
              <p className="text-lg font-bold text-emerald-600 font-mono">{current.uptime}</p>
              <span className="text-[10px] text-slate-400">30-day Avg</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Last Calibration</p>
              <p className="text-sm font-bold text-slate-800">{current.lastCalibrated}</p>
              <span className="text-[10px] text-brand-600">Auto-Check Passed</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Live Compute Latency Graph (ms)</span>
              <span className="text-emerald-400 font-mono">118ms current</span>
            </div>
            <div className="h-16 flex items-end gap-1.5 pt-2">
              {[120, 115, 122, 118, 124, 119, 112, 128, 117, 120, 121, 118, 125, 116, 118].map((val, idx) => (
                <div key={idx} className="flex-1 bg-brand-500 rounded-t hover:bg-brand-400 transition-all" style={{ height: `${(val / 150) * 100}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Log */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>🛠️</span> Preventive Maintenance Log
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Camera Lens Cleaned</span>
                <span className="text-slate-400">Today, 08:00</span>
              </div>
              <p className="text-slate-500">Inspection Line A optical enclosure wiped with isopropyl alcohol.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>LUX Sensor Recalibration</span>
                <span className="text-slate-400">Yesterday</span>
              </div>
              <p className="text-slate-500">Re-zeroed ambient lighting sensor for Line B LED strobe matrix.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Firmware Update v2.4</span>
                <span className="text-slate-400">3 days ago</span>
              </div>
              <p className="text-slate-500">Edge TPU accelerator drivers updated to v2.4.1.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
