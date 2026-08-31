import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Cpu, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function InspectionResultPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const targetId = id || queryId;

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInspectionDetail() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };

        let fetchUrl = `/api/v1/quality/inspections/${targetId}`;
        if (!targetId) {
          // Fallback: Fetch latest inspection from history
          const resHist = await fetch('/api/v1/quality/history', { headers });
          if (resHist.ok) {
            const histData = await resHist.json();
            if (histData && histData.length > 0) {
              const latestId = histData[0].id || histData[0].productId;
              fetchUrl = `/api/v1/quality/inspections/${latestId}`;
            }
          }
        }

        const res = await fetch(fetchUrl, { headers });
        if (res.status === 404) {
          setError('Inspection not found.');
          setInspection(null);
        } else if (!res.ok) {
          setError('Unable to load inspection.');
          setInspection(null);
        } else {
          const data = await res.json();
          setInspection(data);
        }
      } catch (err) {
        console.error("Failed to fetch inspection detail:", err);
        setError('Unable to load inspection.');
      } finally {
        setLoading(false);
      }
    }

    fetchInspectionDetail();
  }, [targetId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS':
      case 'Passed':
        return <span className="px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> PASS</span>;
      case 'MANUAL_REVIEW':
        return <span className="px-3 py-1 bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5"/> MANUAL REVIEW</span>;
      case 'FAIL':
      case 'Defective':
      default:
        return <span className="px-3 py-1 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> FAIL</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 bg-[#EF4444] text-white rounded text-[11px] font-bold">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 bg-[#F97316] text-white rounded text-[11px] font-bold">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 bg-[#FACC15] text-black rounded text-[11px] font-bold">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 bg-[#3B82F6] text-white rounded text-[11px] font-bold">LOW</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[11px] font-bold">NONE</span>;
    }
  };

  return (
    <DashboardLayout
      title="Inspection Result Detail"
      subtitle="VisionInspect AI Phase 8.1.1 — PostgreSQL Persisted Inspection Analysis"
    >
      <div className="space-y-6 max-w-4xl">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading inspection...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Please select a valid inspection record from the history table.</p>
            <button
              onClick={() => navigate('/quality/inspection-history')}
              className="mt-4 px-4 py-2 bg-[#1F2937] hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Return to Inspection History
            </button>
          </div>
        )}

        {!loading && !error && inspection && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* AI Prediction Header Card */}
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">AI Prediction Detail</h2>
                  <p className="text-xs text-gray-400">
                    {inspection.ai_model?.model_name} • {inspection.ai_model?.model_version} ({inspection.inference_time_ms} ms)
                  </p>
                </div>
              </div>

              {getStatusBadge(inspection.status)}
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Inspection Code</span>
                <p className="text-sm font-bold text-white font-mono">{inspection.inspection_code}</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Product Code</span>
                <p className="text-sm font-bold text-white font-mono">{inspection.product?.product_code}</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Primary Defect</span>
                <p className="text-sm font-bold text-white">{inspection.primary_defect}</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">AI Confidence</span>
                <p className="text-sm font-bold text-[#2563EB] font-mono">{inspection.confidence_score}%</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Severity Level</span>
                <div className="mt-1">{getSeverityBadge(inspection.overall_severity)}</div>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Severity Score</span>
                <p className="text-sm font-bold text-[#FACC15] font-mono">{inspection.overall_score} / 100</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Production Line</span>
                <p className="text-sm font-bold text-white">{inspection.production_line?.line_code}</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Inspected Timestamp</span>
                <p className="text-xs font-bold text-gray-300 font-mono">{inspection.inspected_at}</p>
              </div>
            </div>

            {/* Confidence Score Visual Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-semibold uppercase">Confidence Score Meter</span>
                <span className="text-blue-400 font-bold font-mono">{inspection.confidence_score}%</span>
              </div>
              <div className="w-full bg-[#1F2937] h-3 rounded-full overflow-hidden border border-gray-800">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${Math.min(100, inspection.confidence_score)}%` }}></div>
              </div>
            </div>

            {/* Decision Reason */}
            <div className="bg-[#1F2937] p-4 rounded-xl border border-gray-800 space-y-1 text-xs">
              <span className="font-bold text-gray-300 uppercase">Decision Reason / Recommendation:</span>
              <p className="text-gray-300">{inspection.decision_reason}</p>
            </div>

            {/* Defect Bounding Boxes List */}
            {inspection.defects && inspection.defects.length > 0 && (
              <div className="space-y-2 border-t border-[#1F2937] pt-4 text-xs">
                <span className="font-bold text-white uppercase text-[11px]">Detected Bounding Boxes ({inspection.defects.length}):</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inspection.defects.map((def, idx) => (
                    <div key={idx} className="bg-[#1F2937]/60 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{def.defect_name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          Box: [{def.bounding_box.x_min}, {def.bounding_box.y_min}, {def.bounding_box.width}, {def.bounding_box.height}]
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-black/60 text-[#2563EB] font-mono font-bold rounded">
                        {def.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => navigate('/quality/inspection-history')}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F2937] hover:bg-gray-700 text-xs font-bold text-gray-200 border border-gray-700 rounded-xl transition-all cursor-pointer"
              >
                <span>Back to History</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
