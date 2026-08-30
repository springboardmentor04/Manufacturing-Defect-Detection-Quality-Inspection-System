import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function AiCalibration() {
  const [preset, setPreset] = useState("standard");
  const [claheClip, setClaheClip] = useState(2.5);
  const [blurKernel, setBlurKernel] = useState(5);
  const [minDefectArea, setMinDefectArea] = useState(35);
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.72);
  const [selectedCategory, setSelectedCategory] = useState("screw");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const categories = [
    { id: "screw", name: "Metal Fasteners / Screws", refCount: 120, status: "Calibrated" },
    { id: "bottle", name: "Glass Bottles", refCount: 95, status: "Calibrated" },
    { id: "capsule", name: "Pharma Capsules", refCount: 150, status: "Drift Detected" },
    { id: "grid", name: "Grid Mesh Components", refCount: 80, status: "Calibrated" },
    { id: "tile", name: "Ceramic Tiles", refCount: 110, status: "Needs Retraining" },
  ];

  const handleApplyPreset = (type) => {
    setPreset(type);
    if (type === "strict") {
      setClaheClip(3.5);
      setBlurKernel(3);
      setMinDefectArea(15);
      setAnomalyThreshold(0.60);
    } else if (type === "tolerant") {
      setClaheClip(1.5);
      setBlurKernel(7);
      setMinDefectArea(65);
      setAnomalyThreshold(0.85);
    } else {
      setClaheClip(2.5);
      setBlurKernel(5);
      setMinDefectArea(35);
      setAnomalyThreshold(0.72);
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>⚙️</span> AI Calibration & Sensitivity Studio
          </h2>
          <p className="text-slate-500 text-sm">
            Tune computer vision anomaly thresholds, image preprocessing filters, and category baseline references.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>💾</span> Deploy Thresholds
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between animate-fade-in">
          <span>✅ Calibration parameters successfully updated and deployed to inspection line.</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Deployed</span>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Model Mode" value={preset.toUpperCase()} accent="brand" icon="🎛️" />
        <StatCard label="Anomaly Threshold" value={anomalyThreshold.toFixed(2)} accent="teal" icon="🎯" />
        <StatCard label="Min Defect Contour" value={`${minDefectArea} px²`} accent="amber" icon="📐" />
        <StatCard label="Categories Calibrated" value="5 / 5" accent="green" icon="✅" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Controls Column */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 space-y-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span>🎚️</span> Parameter Controls
          </h3>

          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
              Preset Modes
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["strict", "standard", "tolerant"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleApplyPreset(type)}
                  className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    preset === type
                      ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* CLAHE Clip Limit */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">CLAHE Contrast Limit</span>
              <span className="font-bold text-brand-600">{claheClip}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={claheClip}
              onChange={(e) => setClaheClip(parseFloat(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Enhances local contrast for micro-scratch detection.</p>
          </div>

          {/* Gaussian Blur Kernel */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">Gaussian Blur Kernel</span>
              <span className="font-bold text-brand-600">{blurKernel} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="2"
              value={blurKernel}
              onChange={(e) => setBlurKernel(parseInt(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Reduces high-frequency image noise before contour analysis.</p>
          </div>

          {/* Anomaly Score Cutoff */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">Anomaly Score Threshold</span>
              <span className="font-bold text-brand-600">{anomalyThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.95"
              step="0.01"
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(parseFloat(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Scores above threshold trigger an inspection failure flag.</p>
          </div>

          {/* Min Contour Area */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">Min Defect Contour Area</span>
              <span className="font-bold text-brand-600">{minDefectArea} px²</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={minDefectArea}
              onChange={(e) => setMinDefectArea(parseInt(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Ignores sub-pixel specs below this area size.</p>
          </div>
        </div>

        {/* Live Preview Sandbox */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="flex items-center gap-2">
                <span>🖼️</span> Interactive Threshold Sandbox Preview
              </span>
              <span className="text-xs text-slate-400">Category: {selectedCategory.toUpperCase()}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-400 mb-2">Original Input Feed</p>
                <div className="h-56 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-600 flex items-center justify-center relative">
                    <div className="w-3 h-12 bg-amber-400 rounded-full rotate-45 animate-pulse"></div>
                  </div>
                  <span className="text-xs text-slate-400 mt-3">Raw Metal Fastener Specimen</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-brand-400 mb-2">Calibrated Detection Mask</p>
                <div className="h-56 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-brand-500/50 relative overflow-hidden">
                  <div className="w-24 h-24 rounded-full border-4 border-brand-500 flex items-center justify-center relative bg-brand-950/40">
                    <div className="w-4 h-14 bg-red-500/80 rounded-full rotate-45 border-2 border-red-400 shadow-lg shadow-red-500/50"></div>
                  </div>
                  <span className="text-xs text-emerald-400 mt-3 font-mono">
                    Defect Detected: 48 px² (Score: {(anomalyThreshold + 0.12).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Computed Latency: <strong className="text-slate-800 font-mono">118 ms</strong></span>
              <span>Estimated Precision: <strong className="text-emerald-600 font-mono">97.4%</strong></span>
              <span>Estimated Recall: <strong className="text-emerald-600 font-mono">96.8%</strong></span>
            </div>
          </div>

          {/* Reference Category Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>📚</span> Product Category Reference Profiles
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Product Category</th>
                    <th className="px-4 py-3">Baseline Reference Images</th>
                    <th className="px-4 py-3">Calibration Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedCategory === cat.id ? "bg-brand-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{cat.refCount} samples</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            cat.status === "Calibrated"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cat.status === "Drift Detected"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {cat.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
                          Select Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
