'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BoundingBoxCanvas from '@/components/BoundingBoxCanvas';
import { inspectApi } from '@/lib/api';
import { InspectionResult, DefectItem } from '@/types';

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInspectionData() {
      if (!inspectionId) return;
      try {
        setLoading(true);
        const data = await inspectApi.getDetails(inspectionId);
        setInspection(data);
      } catch (err: any) {
        console.error('Failed to load inspection detail:', err);
        setError('Failed to load inspection records for the given ID.');
      } finally {
        setLoading(false);
      }
    }

    loadInspectionData();
  }, [inspectionId]);

  const handleGeneratePDF = async () => {
    if (!inspectionId) return;
    setGeneratingReport(true);
    try {
      const report = await inspectApi.generateReport(inspectionId);
      // Open PDF in a new tab for printing/download
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const reportPath = report.download_url;
      if (!reportPath) {
        throw new Error('Report download URL is not available.');
      }
      const pdfUrl = `${apiBase.replace('/api/v1', '')}${reportPath}`;
      window.open(pdfUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to generate PDF report:', err);
      alert('Error generating PDF report. Ensure backend report engine is configured.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PASS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAIL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'FLAGGED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-mono">Retrieving inspection record...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
          <div className="glass-panel p-8 rounded-2xl border border-red-500/30 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Record Not Found</h2>
            <p className="text-slate-400 text-sm mb-6">{error || 'Unable to locate inspection telemetry.'}</p>
            <button
              onClick={() => router.push('/history')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
            >
              &larr; Back to Inspection Logs
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
              <span className="cursor-pointer hover:text-white" onClick={() => router.push('/history')}>
                Logs
              </span>
              <span>/</span>
              <span className="text-blue-400">{inspection.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-3">
              <span>Inspection Evaluation</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold border ${getStatusBadge(
                  inspection.status
                )}`}
              >
                {inspection.status}
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleGeneratePDF}
              disabled={generatingReport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {generatingReport ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export Executive PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Timestamp</span>
            <p className="text-xs font-mono text-slate-200 mt-1">
              {new Date(inspection.created_at).toLocaleString()}
            </p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Total Anomalies</span>
            <p className="text-base font-mono font-bold text-white mt-1">{inspection.defects.length}</p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Peak Severity Score</span>
            <p className="text-base font-mono font-bold text-blue-400 mt-1">{inspection.severity_score}/100</p>
          </div>
          <div className="glass-card p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Max Severity Level</span>
            <p className="text-base font-mono font-bold text-amber-400 mt-1 uppercase">{inspection.severity_level}</p>
          </div>
        </div>

        {/* Viewport and Defect Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xs font-mono font-semibold uppercase text-slate-300 tracking-wider mb-4">
                Annotated Visual Viewport
              </h2>
              <BoundingBoxCanvas
                imageUrl={inspection.image_url}
                defects={inspection.defects}
                selectedDefectId={selectedDefect?.id}
                onSelectDefect={(defect) => setSelectedDefect(defect)}
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-full flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-mono font-semibold uppercase text-slate-300 tracking-wider mb-4">
                  4-Factor Severity Analysis
                </h2>

                {selectedDefect ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white capitalize">{selectedDefect.defect_type}</span>
                        <span className="font-mono text-xs text-amber-400 font-bold uppercase">
                          {selectedDefect.severity_level}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 mt-3 pt-3 border-t border-slate-800">
                        <div>Size: <span className="text-slate-200">{selectedDefect.size_mm2} mm²</span></div>
                        <div>Confidence: <span className="text-slate-200">{Math.round(selectedDefect.confidence * 100)}%</span></div>
                        <div>Location: <span className="text-slate-200">{selectedDefect.location_type}</span></div>
                        <div>Score: <span className="text-blue-400 font-bold">{selectedDefect.severity_score}/100</span></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                      <span className="font-mono text-[10px] uppercase text-slate-500 block mb-1">
                        Mathematical Formula
                      </span>
                      <p className="font-mono text-[11px] text-blue-300">
                        Score = (0.35 × Size) + (0.25 × Type) + (0.25 × Location) + (0.15 × Confidence)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Click any anomaly on the bounding box canvas to review its 4-factor breakdown.
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500 text-center">
                Inspection ID: {inspection.id}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
