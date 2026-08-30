import React, { useState } from "react";
import { resolveImageUrl } from "../api/axios";

const statusConfig = {
  pass: { label: "PASS", classes: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  fail: { label: "FAIL", classes: "bg-red-50 text-red-600 border-red-200" },
  pending: { label: "PENDING", classes: "bg-amber-50 text-amber-600 border-amber-200" },
  processing: { label: "PROCESSING", classes: "bg-blue-50 text-blue-600 border-blue-200" },
};

const severityConfig = {
  Critical: { label: "Critical", bg: "bg-red-600", text: "text-red-700", border: "border-red-200", badgeBg: "bg-red-50" },
  High: { label: "High", bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-200", badgeBg: "bg-orange-50" },
  Medium: { label: "Medium", bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-200", badgeBg: "bg-amber-50" },
  Low: { label: "Low", bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", badgeBg: "bg-emerald-50" },
};

export default function DefectResultCard({ inspection }) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  if (!inspection) return null;

  const cfg = statusConfig[inspection.status] || statusConfig.pending;
  const hasPrediction = inspection.status === "pass" || inspection.status === "fail";
  const sevLevel = inspection.severity_level || "Low";
  const sevCfg = severityConfig[sevLevel] || severityConfig.Low;

  const details = inspection.severity_details || {
    size_score: 0,
    location_score: 0,
    defect_type_score: 0,
    confidence_score_pct: Math.round((inspection.confidence_score || 0) * 100),
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">Defect & Severity Assessment</h3>
          <p className="text-xs text-slate-500">{inspection.product_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPrediction && inspection.severity_score !== null && inspection.severity_score !== undefined && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sevCfg.badgeBg} ${sevCfg.text} ${sevCfg.border}`}>
              Severity {inspection.severity_score} ({sevLevel})
            </span>
          )}
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.classes}`}>{cfg.label}</span>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-200 mb-4 bg-slate-900">
        <img
          src={resolveImageUrl(showHeatmap && inspection.heatmap_url ? inspection.heatmap_url : inspection.image_url)}
          alt={inspection.product_name}
          className="w-full max-h-72 object-contain bg-slate-900"
        />
        {inspection.heatmap_url && (
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            className="absolute top-2 right-2 text-xs font-semibold bg-white/90 hover:bg-white text-slate-800 px-3 py-1 rounded-full border border-slate-200 shadow-md transition-all"
          >
            {showHeatmap ? "📷 Show Original" : "🔥 Show Heatmap"}
          </button>
        )}
      </div>

      {hasPrediction ? (
        <>
          {inspection.defect_type && (
            <div className="mb-4 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-xs font-medium text-slate-600">Detected Defect Type:</span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100/80 border border-red-200 px-2.5 py-0.5 rounded-full">
                {inspection.defect_type.replace(/_/g, " ")}
              </span>
            </div>
          )}

          {/* Core Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">{Math.round((inspection.confidence_score || 0) * 100)}%</p>
              <p className="text-[11px] text-slate-500">Confidence</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">{((inspection.anomaly_ratio || 0) * 100).toFixed(2)}%</p>
              <p className="text-[11px] text-slate-500">Anomaly Area</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">{inspection.bounding_boxes?.length || 0}</p>
              <p className="text-[11px] text-slate-500">Flagged Regions</p>
            </div>
          </div>

          {/* Severity Framework Parameter Breakdown */}
          {inspection.status === "fail" && (
            <div className="mb-4 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-700">Severity Parameter Breakdown:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500">Defect Size (30%):</span>
                  <span className="font-semibold text-slate-800">{details.size_score}</span>
                </div>
                <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500">Location (25%):</span>
                  <span className="font-semibold text-slate-800">{details.location_score}</span>
                </div>
                <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500">Defect Type (25%):</span>
                  <span className="font-semibold text-slate-800">{details.defect_type_score}</span>
                </div>
                <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500">Confidence (20%):</span>
                  <span className="font-semibold text-slate-800">{details.confidence_score_pct}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation Banner */}
          {inspection.quality_recommendation && (
            <div className={`p-3 rounded-lg border text-xs font-medium ${sevCfg.badgeBg} ${sevCfg.text} ${sevCfg.border}`}>
              <span className="font-bold">Recommended Action: </span>
              {inspection.quality_recommendation}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">{inspection.notes || "Awaiting analysis..."}</p>
      )}

      {inspection.model_used && (
        <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">
          Detection Model: <span className="font-mono text-slate-600">{inspection.model_used}</span>
        </p>
      )}
    </div>
  );
}