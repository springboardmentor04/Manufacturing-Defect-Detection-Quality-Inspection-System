import React from 'react';
import { Eye } from 'lucide-react';
import { InspectionRecord, PreprocessingOptions } from '../types';

interface InspectionViewerProps {
  activeImageUrl: string;
  preprocessing: PreprocessingOptions;
  inspectionResult: InspectionRecord | null;
  isInspecting: boolean;
  inspectionStatus: string;
}

export const InspectionViewer: React.FC<InspectionViewerProps> = ({
  activeImageUrl,
  preprocessing,
  inspectionResult,
  isInspecting,
  inspectionStatus
}) => {
  return (
    <div id="section-results" className="lg:col-span-7 space-y-6">
      <div className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Inspection Pipeline Output</span>
            <span className="text-[10px] text-teal-800 font-medium">Defect Detection Results</span>
          </div>

          {inspectionResult && (
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    inspectionResult.passFail === "PASS"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700"
  }`}
>
  {inspectionResult.passFail}
</span>
            </div>
          )}
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-300/80 aspect-video bg-slate-900 flex items-center justify-center">
        <img
  src={activeImageUrl}
  onError={(e) => {
    (e.target as HTMLImageElement).src = "/placeholder.png";
  }}
            alt="Product Preview"
            className={`w-full h-full object-contain ${preprocessing.edgeDetection ? 'invert grayscale contrast-200' : ''}`}
          />

          {isInspecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                {inspectionStatus}
              </div>
              <div className="flex items-center gap-2">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
    <span>{inspectionStatus}</span>
</div>
            </div>
          )}

          {inspectionResult && inspectionResult.defects.length > 0 && (
            <div
              className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg flex items-start p-1 transition-all"
              style={{
                left: `${inspectionResult.defects?.[0]?.boundingBox.x??0}%`,
                top: `${inspectionResult.defects?.[0]?.boundingBox.y??0}%`,
                width: `${inspectionResult.defects?.[0]?.boundingBox.width??0}%`,
                height: `${inspectionResult.defects?.[0]?.boundingBox.height??0}%`
              }}
            >
              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                {inspectionResult.defects?.[0]?.defectType} ({inspectionResult.defects?.[0]?.confidence.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {!inspectionResult && !isInspecting && (
          <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center text-xs text-slate-500 py-6 font-medium">
            No inspection results available.

Upload or select a product image, then click
"Run Inspection" to begin quality analysis.
          </div>
        )}

        {inspectionResult && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Eye className="w-3.5 h-3.5 text-teal-700" />
            <span>{inspectionResult.defects[0]?.defectType || 'No defect detected'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
