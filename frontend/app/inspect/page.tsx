'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BoundingBoxCanvas from '@/components/BoundingBoxCanvas';
import { inspectApi } from '@/lib/api';
import { InspectionResult, DefectItem } from '@/types';

export default function InspectPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setSelectedDefect(null);
      setError(null);
    }
  };

  const handleRunInspection = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const data = await inspectApi.analyzeImage(selectedFile);
      setResult(data);
    } catch (err: any) {
      console.error('Inspection upload error:', err);
      setError(
        err.response?.data?.detail || 'Failed to process inspection image. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PASS':
      case 'PASSED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAIL':
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'FLAGGED':
      case 'NEEDS_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Live AI Surface Inspection
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload component images for real-time computer vision defect analysis and severity scoring.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Upload & Bounding Box Viewport */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono font-semibold uppercase text-slate-300 tracking-wider">
                  Inspection Viewport
                </h2>
                {result && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getStatusBadge(
                      result.status
                    )}`}
                  >
                    STATUS: {result.status}
                    {result.engine && (
                      <span className="ml-2 text-[10px] font-mono text-slate-400">Engine: {result.engine}</span>
                    )}
                  </span>
                )}
              </div>

              {/* Viewport Render Logic */}
              {previewUrl ? (
                <BoundingBoxCanvas
                  imageUrl={previewUrl}
                  defects={result ? result.defects : []}
                  selectedDefectId={selectedDefect?.id}
                  onSelectDefect={(defect) => setSelectedDefect(defect)}
                />
              ) : (
                <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl bg-slate-950/40 cursor-pointer transition-colors p-6">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Click to upload inspection image</span>
                  <span className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP up to 20MB</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}

              {/* Controls */}
              <div className="mt-6 flex items-center justify-between gap-4">
                {previewUrl && (
                  <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer transition-colors">
                    <span>Change Image</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}

                <button
                  onClick={handleRunInspection}
                  disabled={!selectedFile || loading}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Running Inference...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      <span>Analyze Surface</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Defect Telemetry & Breakdown */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-full flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-mono font-semibold uppercase text-slate-300 tracking-wider mb-4">
                  Inspection Telemetry
                </h2>

                {!result ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Upload an image and run analysis to view automated severity breakdown.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                        <span className="block text-[10px] font-mono text-slate-400">DEFECTS</span>
                        <span className="text-xl font-bold font-mono text-white">{result.defects.length}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                        <span className="block text-[10px] font-mono text-slate-400">MODEL CONFIDENCE</span>
                        <span className="text-xl font-bold font-mono text-blue-400">
                          {Math.round(result.confidence * 100)}%
                        </span>
                        {result.engine && (
                          <span className="block text-[10px] text-slate-400 mt-1">Engine: {result.engine}</span>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                        <span className="block text-[10px] font-mono text-slate-400">MAX SEVERITY</span>
                        <span className="text-sm font-bold font-mono text-amber-400 uppercase mt-1 block">
                          {result.severity_level}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                        <span className="block text-[10px] font-mono text-slate-400">SCORE</span>
                        <span className="text-xl font-bold font-mono text-blue-400">
                          {result.severity_score}
                        </span>
                      </div>
                    </div>

                    {/* Summary & Defect List */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300">
                        <p className="text-sm leading-relaxed">{result.summary}</p>
                        <p className="mt-3 text-xs text-slate-400">Recommendation: {result.recommendation}</p>
                      </div>

                      <div>
                        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider mb-3">
                          Detected Anomalies ({result.defects.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {result.defects.map((defect) => (
                          <div
                            key={defect.id}
                            onClick={() => setSelectedDefect(defect)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              selectedDefect?.id === defect.id
                                ? 'bg-blue-600/15 border-blue-500/50 text-white'
                                : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold capitalize">{defect.defect_type}</span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {defect.severity_level}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>Conf: {Math.round(defect.confidence * 100)}%</span>
                              <span>Size: {defect.size_mm2} mm²</span>
                              <span>Location: {defect.location_type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>

              {result && (
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => router.push(`/inspect/${result.id}`)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>View Full Report & Export PDF</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
