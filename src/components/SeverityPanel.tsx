import React from 'react';
import { Eye } from 'lucide-react';
import { InspectionRecord } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface SeverityPanelProps {
  inspectionResult: InspectionRecord | null;
  onOpenReport: (record: InspectionRecord) => void;
  isInspecting: boolean;
}

export const SeverityPanel: React.FC<SeverityPanelProps> = ({ inspectionResult, onOpenReport, isInspecting }) => {
  if (!inspectionResult) {
    return null;
  }

  const defect = inspectionResult.defects[0];
  const sizeContribution = ((defect?.sizeScore || 50) * 0.3).toFixed(1);
  const locationContribution = ((defect?.locationScore || 50) * 0.25).toFixed(1);
  const typeContribution = (75 * 0.25).toFixed(1);
  const confidenceContribution = ((defect?.confidence || 85) * 0.2).toFixed(1);

  return (
    <div id="section-defects" className="bg-white/50 p-4 rounded-2xl border border-white/80 space-y-3 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800">
        <span>Defect Classification & Multi-Factor Severity Score</span>
        <div className="flex items-center gap-2">
          <SeverityBadge level={inspectionResult.severityLevel} score={inspectionResult.severityScore} />
          <span className="font-mono text-teal-700 font-extrabold text-sm">
            Score: {inspectionResult.severityScore.toFixed(1)} / 100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Size (30%)</span>
          <span className="font-bold text-slate-800">+{sizeContribution}</span>
        </div>
        <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Location (25%)</span>
          <span className="font-bold text-slate-800">+{locationContribution}</span>
        </div>
        <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Type (25%)</span>
          <span className="font-bold text-slate-800">+{typeContribution}</span>
        </div>
        <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Confidence (20%)</span>
          <span className="font-bold text-slate-800">+{confidenceContribution}</span>
        </div>
      </div>

      <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Recommendation: <strong className="text-slate-800">
            {inspectionResult.passFail === 'PASS' ? 'Approve for Packaging' : 'Quarantine Product & Trigger Rework'}
          </strong>
        </span>

        <button
          type="button"
          onClick={() => onOpenReport(inspectionResult)}
          className="text-teal-700 font-bold hover:underline flex items-center gap-1"
          disabled={isInspecting}
        >
          <Eye className="w-3.5 h-3.5" />
          Full Quality Report
        </button>
      </div>
    </div>
  );
};
