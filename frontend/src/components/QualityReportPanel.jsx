import React from "react";

function Bar({ label, value, max, color, suffix = "" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">
          {value}
          {suffix}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function QualityReportPanel({ report }) {
  if (!report) return null;

  const scoreColor = report.quality_score >= 70 ? "#10b981" : report.quality_score >= 45 ? "#d97706" : "#e11d48";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Image Quality Report</h3>
        <span
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{ color: scoreColor, backgroundColor: `${scoreColor}1A` }}
        >
          {report.quality_score}/100
        </span>
      </div>

      <div className="space-y-3">
        <Bar label="Sharpness" value={report.sharpness_score} max={300} color="#3b6cf0" />
        <Bar label="Brightness" value={report.brightness_mean} max={255} color="#d97706" />
        <Bar label="Contrast" value={report.contrast_std} max={70} color="#0d9488" />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-800">
            {report.width}×{report.height}
          </p>
          <p>Resolution</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">{report.file_size_kb} KB</p>
          <p>File Size</p>
        </div>
        <div>
          <p className={`font-semibold ${report.brightness_flag === "ok" ? "text-emerald-600" : "text-amber-600"}`}>
            {report.brightness_flag === "ok" ? "Good" : report.brightness_flag}
          </p>
          <p>Lighting</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 italic mt-4 border-t border-slate-100 pt-3">{report.recommendation}</p>
    </div>
  );
}