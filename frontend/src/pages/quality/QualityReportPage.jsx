import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Download, FileText, CheckCircle2, ShieldCheck, AlertCircle, HelpCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function QualityReportPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const targetId = id || queryId;

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReportDetail() {
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
          setError('Inspection report not found.');
          setInspection(null);
        } else if (!res.ok) {
          setError('Unable to load inspection report.');
          setInspection(null);
        } else {
          const data = await res.json();
          setInspection(data);
        }
      } catch (err) {
        console.error("Failed to fetch quality report:", err);
        setError('Unable to load inspection report.');
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetail();
  }, [targetId]);

  const handleDownload = () => {
    if (!inspection) return;
    const content = `VISIONINSPECT AI - QUALITY INSPECTION DIAGNOSTIC REPORT
------------------------------------------------------------
Inspection Code : ${inspection.inspection_code}
Product Code    : ${inspection.product?.product_code || 'N/A'}
Product Category: ${inspection.product?.category || 'N/A'}
Production Line : ${inspection.production_line?.line_code || 'LINE-A1'}
Inspected By    : ${inspection.inspected_by?.full_name || 'Inspector'}
Timestamp       : ${inspection.inspected_at}
------------------------------------------------------------
Result Status   : ${inspection.status}
AI Model        : ${inspection.ai_model?.model_name} (${inspection.ai_model?.model_version})
AI Confidence   : ${inspection.confidence_score}%
Primary Defect  : ${inspection.primary_defect}
Severity Level  : ${inspection.overall_severity}
Severity Score  : ${inspection.overall_score} / 100.00
------------------------------------------------------------
Decision Reason : ${inspection.decision_reason}
Root Cause      : ${inspection.root_cause || 'Not available'}
Suggested Action: ${inspection.suggested_action || 'Not available'}
------------------------------------------------------------
VisionInspect AI Phase 8.3 Persistent Database Audit Trail.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quality_Report_${inspection.inspection_code}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout
      title="Quality Report"
      subtitle="VisionInspect AI Phase 8.3 — Persistent Inspection Diagnostic Report & Export"
    >
      <div className="space-y-6 max-w-4xl">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading quality report...</p>
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
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Report Header */}
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Quality Inspection Diagnostic Report</h2>
                  <p className="text-xs text-gray-400">
                    Inspection Code: <span className="text-blue-400 font-mono font-bold">{inspection.inspection_code}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Report TXT</span>
              </button>
            </div>

            {/* Report Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Product Code</span>
                <p className="text-sm font-bold text-white font-mono">{inspection.product?.product_code}</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Result Status</span>
                <p className={`text-sm font-bold ${inspection.status === 'PASS' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {inspection.status}
                </p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">AI Confidence</span>
                <p className="text-sm font-bold text-[#2563EB] font-mono">{inspection.confidence_score}%</p>
              </div>

              <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 uppercase font-semibold text-[10px]">Severity Score</span>
                <p className="text-sm font-bold text-[#FACC15] font-mono">{inspection.overall_score} / 100</p>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="bg-[#1F2937]/50 p-5 rounded-xl border border-gray-800 space-y-3 text-xs">
              <span className="font-bold text-gray-300 uppercase">Diagnostic Analysis Summary:</span>
              <p className="text-gray-300 leading-relaxed">
                Official Quality Engineering Diagnostic Audit Report compiled for {inspection.inspection_code}. 
                Primary anomaly class: <strong>{inspection.primary_defect}</strong>. 
                Decision: <strong>{inspection.decision_reason}</strong>. 
                Inspected by {inspection.inspected_by?.full_name} on {inspection.inspected_at}.
              </p>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
