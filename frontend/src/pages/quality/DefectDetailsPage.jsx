import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Target, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, Loader2, HelpCircle } from 'lucide-react';

export default function DefectDetailsPage() {
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
          setError('Unable to load inspection details.');
          setInspection(null);
        } else {
          const data = await res.json();
          setInspection(data);
        }
      } catch (err) {
        console.error("Failed to fetch defect details:", err);
        setError('Unable to load inspection details.');
      } finally {
        setLoading(false);
      }
    }

    fetchInspectionDetail();
  }, [targetId]);

  const activeBbox = inspection?.defects && inspection.defects.length > 0 ? inspection.defects[0] : null;

  return (
    <DashboardLayout
      title="Defect Details"
      subtitle="VisionInspect AI Phase 8.3 — Bounding Box Coordinates & Diagnostic Analysis"
    >
      <div className="space-y-6">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading inspection details...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Please select a valid inspection record from history.</p>
          </div>
        )}

        {!loading && !error && inspection && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Bounding Box Details Frame */}
            <div className="lg:col-span-6 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#FACC15]" />
                  <span>Bounding Box Telemetry</span>
                </h2>
                <span className="text-xs font-mono text-gray-400">Code: {inspection.inspection_code}</span>
              </div>

              {activeBbox ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-400 uppercase font-semibold text-[10px]">Primary Defect Label</span>
                    <p className="text-base font-bold text-white">{activeBbox.defect_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1F2937]/50 p-3 rounded-xl border border-gray-800 space-y-1">
                      <span className="text-gray-400 uppercase font-semibold text-[10px]">Confidence Score</span>
                      <p className="text-sm font-bold text-[#2563EB] font-mono">{activeBbox.confidence}%</p>
                    </div>

                    <div className="bg-[#1F2937]/50 p-3 rounded-xl border border-gray-800 space-y-1">
                      <span className="text-gray-400 uppercase font-semibold text-[10px]">Severity Level</span>
                      <p className="text-sm font-bold text-[#FACC15]">{inspection.overall_severity}</p>
                    </div>
                  </div>

                  <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-400 uppercase font-semibold text-[10px]">ROI Bounding Box Coordinates</span>
                    <p className="text-sm font-mono text-gray-200">
                      X-Min: <strong>{activeBbox.bounding_box.x_min}</strong>, Y-Min: <strong>{activeBbox.bounding_box.y_min}</strong>, Width: <strong>{activeBbox.bounding_box.width}</strong>, Height: <strong>{activeBbox.bounding_box.height}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 bg-[#1F2937]/40 rounded-xl border border-gray-800">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-[#22C55E] mb-2" />
                  <p className="text-xs font-semibold">No defect bounding boxes detected (PASSED Component).</p>
                </div>
              )}
            </div>

            {/* Diagnostic Analysis & Root Cause */}
            <div className="lg:col-span-6 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#1F2937] pb-3">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                <span>Diagnostic Analysis & Decision Reason</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Decision Reason / Recommendation:</span>
                  <p className="text-gray-200">{inspection.decision_reason || "Not available"}</p>
                </div>

                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Root Cause Analysis:</span>
                  <p className="text-gray-200">{inspection.root_cause || "Not available"}</p>
                </div>

                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Suggested Engineering Action:</span>
                  <p className="text-gray-200 font-semibold">{inspection.suggested_action || "Not available"}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => navigate(`/quality/quality-report/${inspection.inspection_code}`)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <span>View Quality Report</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
