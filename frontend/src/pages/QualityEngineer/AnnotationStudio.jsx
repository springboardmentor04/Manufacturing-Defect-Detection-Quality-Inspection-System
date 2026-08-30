import React, { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";

export default function AnnotationStudio() {
  const [selectedSample, setSelectedSample] = useState(0);
  const [defectType, setDefectType] = useState("scratch");
  const [severityLevel, setSeverityLevel] = useState("High");
  const [overrideNote, setOverrideNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const samples = [
    {
      id: "INSP-9021",
      product: "Fastener Screw M8",
      detectedType: "scratch",
      aiConfidence: "94.2%",
      status: "Flagged False Positive",
      image: "Screw Surface Sample",
      boxes: [{ x: 30, y: 40, width: 45, height: 35, label: "Surface Scratch" }],
    },
    {
      id: "INSP-9022",
      product: "Pharma Capsule Gel",
      detectedType: "deformation",
      aiConfidence: "87.5%",
      status: "Pending Re-labeling",
      image: "Capsule Sample",
      boxes: [{ x: 50, y: 25, width: 30, height: 40, label: "Outer Dent" }],
    },
    {
      id: "INSP-9023",
      product: "Glass Bottle Neck",
      detectedType: "crack",
      aiConfidence: "98.1%",
      status: "Needs QA Sign-off",
      image: "Bottle Rim Sample",
      boxes: [{ x: 20, y: 15, width: 60, height: 50, label: "Micro Crack" }],
    },
  ];

  const current = samples[selectedSample];

  const handleSubmitOverride = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>🏷️</span> Defect Annotation & Correction Studio
          </h2>
          <p className="text-slate-500 text-sm">
            Manually annotate bounding boxes, correct AI false positives, and submit verified training samples.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-3 py-1.5 rounded-full border border-brand-200">
            QA Sign-off Mode
          </span>
        </div>
      </div>

      {submitted && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✅ Annotation override submitted to retraining dataset queue.</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Enqueued</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Annotations" value="12 items" accent="amber" icon="⏳" />
        <StatCard label="Corrected False Positives" value="38 items" accent="brand" icon="🎯" />
        <StatCard label="QA Approved Sign-offs" value="142 items" accent="green" icon="✅" />
        <StatCard label="Model Feedback Queue" value="25 samples" accent="teal" icon="📥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sample Selection Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>📥</span> Review Queue ({samples.length})
          </h3>
          <div className="space-y-2">
            {samples.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setSelectedSample(idx)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedSample === idx
                    ? "bg-brand-50/80 border-brand-400 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-bold text-slate-800">{item.id}</span>
                  <span className="text-xs text-brand-600 font-semibold">{item.aiConfidence}</span>
                </div>
                <p className="text-xs font-medium text-slate-700">{item.product}</p>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="capitalize text-slate-500">AI: {item.detectedType}</span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas & Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">{current.product}</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {current.id} • Confidence: {current.aiConfidence}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg">
                  ✏️ Draw Bounding Box
                </button>
                <button className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg">
                  🗑️ Clear Boxes
                </button>
              </div>
            </div>

            {/* Interactive Canvas Simulation */}
            <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-center relative h-72 border border-slate-800">
              <div className="w-64 h-64 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
                <div className="w-36 h-36 border-4 border-slate-600 rounded-full flex items-center justify-center relative">
                  <div className="w-8 h-1 bg-amber-400 rotate-12"></div>
                </div>

                {/* Simulated Bounding Box Overlay */}
                <div className="absolute top-16 left-20 w-28 h-20 border-2 border-dashed border-emerald-400 bg-emerald-500/20 rounded flex items-center justify-center cursor-move shadow-lg">
                  <span className="text-[10px] font-mono text-emerald-200 bg-slate-900/80 px-1 py-0.5 rounded absolute -top-5 left-0">
                    [{defectType.toUpperCase()}] 96.0%
                  </span>
                </div>
              </div>
            </div>

            {/* Annotation Override Form */}
            <form onSubmit={handleSubmitOverride} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Corrected Defect Type</label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="scratch">Scratch</option>
                    <option value="crack">Crack</option>
                    <option value="pitting">Pitting</option>
                    <option value="contamination">Contamination</option>
                    <option value="deformation">Deformation</option>
                    <option value="none">No Defect (False Positive)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Assigned Severity Level</label>
                  <select
                    value={severityLevel}
                    onChange={(e) => setSeverityLevel(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Critical">Critical (Reject)</option>
                    <option value="High">High (Rework)</option>
                    <option value="Medium">Medium (Inspect)</option>
                    <option value="Low">Low (Pass)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Engineer Override Rationale</label>
                <textarea
                  rows="2"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Explain why AI bounding box or classification was adjusted..."
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg shadow transition-colors flex items-center gap-2"
                >
                  <span>✍️</span> Submit Correction & Sign Off
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
