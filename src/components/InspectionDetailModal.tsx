import React from 'react';
import { InspectionRecord } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { X, CheckCircle2, AlertTriangle, FileText, Download, Calculator, Layers, ShieldCheck } from 'lucide-react';

interface InspectionDetailModalProps {
  record: InspectionRecord | null;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const defect = record.defects[0] || {
    defectType: 'Surface Scratch',
    confidence: 85,
    sizeScore: 50,
    locationScore: 60,
    boundingBox: { x: 30, y: 30, width: 20, height: 20 }
  };

  const defectTypeScore = defect.defectType === 'Surface Crack' ? 90 : defect.defectType === 'Insulation Cut' ? 75 : 40;

  // Exact Formula Calculation Components
  const sizeContribution = (defect.sizeScore * 0.30).toFixed(1);
  const locationContribution = (defect.locationScore * 0.25).toFixed(1);
  const typeContribution = (defectTypeScore * 0.25).toFixed(1);
  const confidenceContribution = (defect.confidence * 0.20).toFixed(1);

  const handleDownloadReport = () => {
    const reportData = JSON.stringify(record, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quality_Report_${record.inspectionCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="glass-card rounded-3xl max-w-3xl w-full border border-white/80 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-white/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              record.passFail === 'PASS' ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
              {record.passFail === 'PASS' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-600 font-bold">{record.inspectionCode}</span>
                <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                  record.passFail === 'PASS' ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-red-500/10 text-red-800 border border-red-500/20'
                }`}>
                  {record.passFail}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-800">{record.productName}</h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Image & Bounding Box Overlay Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">
                Defect Localization & Bounding Box
              </span>
              <div className="relative rounded-2xl overflow-hidden border border-white/80 aspect-square bg-slate-100 shadow-inner">
                <img 
                  src={record.imageUrl} 
                  alt={record.productName}
                  className="w-full h-full object-cover" 
                />
                
                {/* Bounding Box Overlay */}
                <div 
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded-xl shadow-lg animate-pulse flex items-start p-1"
                  style={{
                    left: `${defect.boundingBox.x}%`,
                    top: `${defect.boundingBox.y}%`,
                    width: `${defect.boundingBox.width}%`,
                    height: `${defect.boundingBox.height}%`
                  }}
                >
                  <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow">
                    {defect.defectType} ({defect.confidence}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Severity Scoring & Parameters */}
            <div className="space-y-4">
              <div className="bg-white/40 p-4 rounded-2xl border border-white/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Defect Classification</span>
                  <SeverityBadge level={record.severityLevel} score={record.severityScore} />
                </div>
                <p className="text-slate-600 font-medium">{record.comments || 'No inspector notes logged.'}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/60 p-2.5 rounded-xl border border-white/80">
                    <span className="text-slate-400 font-bold block text-[10px]">Factory Line</span>
                    <span className="font-bold text-slate-800">{record.factoryLine}</span>
                  </div>
                  <div className="bg-white/60 p-2.5 rounded-xl border border-white/80">
                    <span className="text-slate-400 font-bold block text-[10px]">Inspector</span>
                    <span className="font-bold text-slate-800">{record.inspectorName}</span>
                  </div>
                </div>
              </div>

              {/* Formula Breakdown Panel */}
              <div className="bg-teal-500/10 p-4 rounded-2xl border border-teal-500/20">
                <div className="flex items-center gap-2 mb-2 font-bold text-teal-900">
                  <Calculator className="w-4 h-4 text-teal-700" />
                  <span>Severity Formula Breakdown</span>
                </div>
                <p className="text-[10px] text-slate-600 mb-3 font-mono font-semibold">
                  Severity = (Size×30%) + (Location×25%) + (Type×25%) + (Confidence×20%)
                </p>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-white/80 p-2 rounded-xl border border-white flex justify-between">
                    <span className="text-slate-500 font-medium">Size ({defect.sizeScore}):</span>
                    <span className="font-bold text-teal-800">+{sizeContribution}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-white flex justify-between">
                    <span className="text-slate-500 font-medium">Location ({defect.locationScore}):</span>
                    <span className="font-bold text-teal-800">+{locationContribution}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-white flex justify-between">
                    <span className="text-slate-500 font-medium">Type ({defectTypeScore}):</span>
                    <span className="font-bold text-teal-800">+{typeContribution}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-white flex justify-between">
                    <span className="text-slate-500 font-medium">Confidence ({defect.confidence}%):</span>
                    <span className="font-bold text-teal-800">+{confidenceContribution}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-teal-500/20 flex items-center justify-between font-bold text-sm text-teal-950">
                  <span>Total Calculated Severity:</span>
                  <span className="font-mono text-teal-800">{record.severityScore.toFixed(1)} / 100</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/60 bg-white/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Timestamp: {new Date(record.timestamp).toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Quality Report JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
