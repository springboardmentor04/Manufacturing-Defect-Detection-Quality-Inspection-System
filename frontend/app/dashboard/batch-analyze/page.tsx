'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { cleanProductTitle } from '@/components/InspectionCard';
import { analyzeBatch, getErrorMessage, API_BASE_URL } from '@/lib/api';
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Scan,
  Sparkles,
  Zap,
} from 'lucide-react';

interface BatchResultItem {
  inspection_id: number;
  status: string;
  defect_count: number;
  image: {
    id: number;
    filename: string;
    filepath: string;
  };
  defects: any[];
}

interface BatchSummary {
  total_processed: number;
  total_defects_found: number;
  results: BatchResultItem[];
}

export default function BatchAnalyzePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunBatchAnalysis = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await analyzeBatch();
      setSummary(res);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Batch analysis failed'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-800 pb-6">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" /> Automated Inference Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                Batch Quality & Defect Detection Pipeline
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Execute automated YOLO model inference across all queued manufacturing payloads in parallel.
              </p>
            </div>

            {/* Action Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-2xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" /> High-Throughput Processing
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                  Run YOLO Computer Vision on All Queued Parts
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Trigger automated image preprocessing (CLAHE enhancement, denoising) followed by neural network inference to detect scratches, geometric deformities, and surface anomalies across all unprocessed parts.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleRunBatchAnalysis}
                    disabled={isRunning}
                    className="px-6 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-sky-500/25 transition-all flex items-center gap-2.5 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing Batch Queue (Running YOLO inference)...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>Run Analysis on Queued Payloads</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Results Summary */}
            {summary && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Processed</span>
                      <p className="text-3xl font-extrabold text-slate-100 mt-1">{summary.total_processed}</p>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Inspections evaluated</span>
                    </div>
                    <div className="p-3.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Defects Found</span>
                      <p className="text-3xl font-extrabold text-rose-400 mt-1">{summary.total_defects_found}</p>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Bounding anomalies marked</span>
                    </div>
                    <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-5">
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Scan className="w-4 h-4 text-sky-400" />
                    Batch Results Telemetry ({summary.results.length})
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Thumbnail</th>
                          <th className="py-3 px-4">Part Name</th>
                          <th className="py-3 px-4">Defect Count</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {summary.results.map((res) => (
                          <tr key={res.inspection_id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                              #{res.inspection_id}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`${API_BASE_URL}/${res.image.filepath}`}
                                  alt={res.image.filename}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-200 max-w-[200px] truncate">
                              {cleanProductTitle(res.image.filename)}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={res.status} defectCount={res.defect_count} size="sm" />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/dashboard/inspections/${res.inspection_id}`}
                                className="px-3 py-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold bg-slate-800 rounded-xl border border-slate-700 hover:border-sky-500/30 inline-flex items-center gap-1 transition-all"
                              >
                                <span>View Overlay</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
