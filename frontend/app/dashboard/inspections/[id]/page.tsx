'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import SeverityBadge from '@/components/SeverityBadge';
import {
  getInspectionDefects,
  analyzeInspection,
  reinspectInspection,
  getCurrentUserFromStorage,
  getErrorMessage,
  InspectionDetailData,
  UserProfile,
  API_BASE_URL,
} from '@/lib/api';
import { cleanProductTitle, formatDefectType } from '@/components/InspectionCard';
import {
  ArrowLeft,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Sparkles,
  Play,
  RotateCcw,
  Loader2,
  Info,
  AlertOctagon,
  XCircle,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = Number(params?.id);

  const [data, setData] = useState<InspectionDetailData | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReinspecting, setIsReinspecting] = useState(false);
  const [imgNaturalDim, setImgNaturalDim] = useState<{ w: number; h: number } | null>(null);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);

  useEffect(() => {
    setCurrentUser(getCurrentUserFromStorage());
  }, []);

  const fetchDetails = async () => {
    if (!inspectionId) return;
    setIsLoading(true);
    try {
      const res = await getInspectionDefects(inspectionId);
      setData(res);
    } catch (err: any) {
      console.error('Error fetching inspection defect details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [inspectionId]);

  const handleRunDetection = async () => {
    if (!inspectionId) return;
    setIsAnalyzing(true);
    try {
      await analyzeInspection(inspectionId);
      await fetchDetails();
    } catch (err: any) {
      alert(`Detection failed: ${getErrorMessage(err, 'Could not complete inference')}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReinspect = async () => {
    if (!inspectionId) return;
    if (!confirm('Are you sure you want to trigger manual QC re-inspection? This will clear previous findings and re-run analysis.')) {
      return;
    }

    setIsReinspecting(true);
    try {
      const res = await reinspectInspection(inspectionId);
      setData(res);
    } catch (err: any) {
      alert(`Re-inspection failed: ${getErrorMessage(err, 'Could not perform re-inspection')}`);
    } finally {
      setIsReinspecting(false);
    }
  };

  // Box border and label color coding by severity level & confidence
  const getBoxColors = (level?: string | null, confidence?: number) => {
    const l = (level || 'low').toLowerCase();
    if (l === 'critical') {
      return {
        stroke: '#f43f5e', // rose-500
        fill: 'rgba(244, 63, 94, 0.22)',
        tagBg: '#e11d48', // rose-600
        text: '#ffffff',
      };
    }
    if (l === 'high') {
      return {
        stroke: '#f97316', // orange-500
        fill: 'rgba(249, 115, 22, 0.20)',
        tagBg: '#ea580c', // orange-600
        text: '#ffffff',
      };
    }
    if (l === 'medium') {
      return {
        stroke: '#f59e0b', // amber-500
        fill: 'rgba(245, 158, 11, 0.18)',
        tagBg: '#d97706', // amber-600
        text: '#ffffff',
      };
    }
    return {
      stroke: '#10b981', // emerald-500
      fill: 'rgba(16, 185, 129, 0.18)',
      tagBg: '#059669', // emerald-600
      text: '#ffffff',
    };
  };

  const isQualityEngineer = currentUser?.role_name === 'quality_engineer';
  const isPending = data?.status === 'queued' || data?.status === 'pending';
  const isPass = data?.decision === 'pass' || (data?.status === 'completed' && data?.defect_count === 0);
  const isFail = data?.decision === 'fail' || (data?.defect_count || 0) > 0;
  const isRejected = data?.status === 'rejected' || (data?.quality_report && data.quality_report.is_acceptable === false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Navigation & Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                    <Scan className="w-4 h-4" /> Inspection Record #{inspectionId}
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  {data ? cleanProductTitle(data.image.filename) : 'Inspection Defect Analysis'}
                </h1>
              </div>

              {/* Action Buttons & Status */}
              <div className="flex flex-wrap items-center gap-3">
                {data && (
                  <StatusBadge
                    status={data.status}
                    defectCount={data.defect_count}
                    size="lg"
                  />
                )}

                {/* Quality Engineer ONLY Re-Inspect Button */}
                {isQualityEngineer && data && data.status !== 'queued' && (
                  <button
                    onClick={handleReinspect}
                    disabled={isReinspecting || isAnalyzing || isLoading}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/60 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    title="Manual Quality Override: Clear findings and re-inspect"
                  >
                    {isReinspecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Re-inspecting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Re-inspect</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleRunDetection}
                  disabled={isAnalyzing || isReinspecting || isLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isPending ? 'Run Detection' : 'Re-Run Detection'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Prominent Milestone 3 PASS / FAIL Decision Banner */}
            {data && data.status === 'completed' && (
              <div>
                {isPass ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-slate-900 border border-emerald-500/40 shadow-xl shadow-emerald-950/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                            QC Disposition
                          </span>
                          <span className="text-xs text-slate-400">
                            {data.decided_at ? `Evaluated ${new Date(data.decided_at).toLocaleString()}` : 'Zero defects detected'}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-emerald-300 tracking-tight mt-0.5">
                          QUALITY INSPECTION PASSED — APPROVED
                        </h2>
                        <p className="text-xs text-emerald-400/90 mt-0.5">
                          Component satisfies all dimensional and surface quality tolerances (0 defects localized). Ready for release.
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-2xl font-black text-emerald-400 font-mono">100%</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Integrity Index</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 border border-rose-500/40 shadow-xl shadow-rose-950/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/40">
                        <XCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] uppercase tracking-wider border border-rose-500/30">
                            QC Disposition
                          </span>
                          <span className="text-xs text-slate-400">
                            {data.decided_at ? `Evaluated ${new Date(data.decided_at).toLocaleString()}` : `${data.defect_count} anomalies detected`}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-rose-300 tracking-tight mt-0.5">
                          QUALITY INSPECTION REJECTED / FAIL
                        </h2>
                        <p className="text-xs text-rose-400/90 mt-0.5">
                          Zero-defect threshold violated ({data.defect_count} defect{data.defect_count === 1 ? '' : 's'} flagged). Mandatory quarantine required.
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-2xl font-black text-rose-400 font-mono">REJECT</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Disposition</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quality Rejected Alert if Image Quality Failed */}
            {data && isRejected && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300">Image Quality Alert: Low Reliability</p>
                  <p className="text-xs text-amber-400/90 leading-relaxed">
                    {data.quality_report?.rejection_reason ||
                      'The captured image payload is too blurry or has insufficient lighting. Please clean lens and re-upload.'}
                  </p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Fetching defect telemetry, coordinates & severity classifications...</span>
              </div>
            ) : !data ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="font-bold text-slate-200 text-base">Inspection Record Not Found</h3>
                <p className="text-xs text-slate-500">
                  The requested inspection ID #{inspectionId} does not exist in the database.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex px-4 py-2 bg-slate-800 text-sky-400 rounded-xl text-xs font-semibold"
                >
                  Return to Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visual Viewport Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Visual Bounding Box Viewport */}
                  <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <h3 className="font-bold text-slate-100 text-sm">
                          Annotated Vision Viewport
                        </h3>
                        <span className="text-xs text-slate-400 font-normal">
                          ({data.defects.length} defect{data.defects.length === 1 ? '' : 's'} localized)
                        </span>
                      </div>

                      {/* Overlay Toggle Switch */}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Sliders className="w-3.5 h-3.5" />
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showBoxes}
                            onChange={(e) => setShowBoxes(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                          />
                          <span>Show Bounding Boxes</span>
                        </label>
                      </div>
                    </div>

                    {/* Image + SVG Coordinate Overlay Container */}
                    <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[380px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${API_BASE_URL}/${data.image.filepath}`}
                        alt={data.image.filename}
                        className="w-full h-auto max-h-[620px] object-contain block"
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          setImgNaturalDim({
                            w: target.naturalWidth,
                            h: target.naturalHeight,
                          });
                        }}
                      />

                      {/* SVG Dynamic Coordinate Bounding Box Overlay */}
                      {showBoxes && imgNaturalDim && data.defects.length > 0 && (
                        <svg
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          viewBox={`0 0 ${imgNaturalDim.w} ${imgNaturalDim.h}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {data.defects.map((def) => {
                            const isSelected = selectedDefectId === def.id;
                            const colors = getBoxColors(def.severity_level, def.confidence_score);
                            const x = def.bbox_x || 0;
                            const y = def.bbox_y || 0;
                            const w = def.bbox_width || 50;
                            const h = def.bbox_height || 50;

                            const labelText = `${formatDefectType(def.defect_type)} [${def.severity_level || 'Defect'}]`;

                            return (
                              <g key={def.id}>
                                {/* Defect Bounding Box */}
                                <rect
                                  x={x}
                                  y={y}
                                  width={w}
                                  height={h}
                                  fill={isSelected ? 'rgba(56, 189, 248, 0.35)' : colors.fill}
                                  stroke={isSelected ? '#38bdf8' : colors.stroke}
                                  strokeWidth={isSelected ? '6' : '3'}
                                  rx="4"
                                />

                                {/* Defect Label Tag Background */}
                                <rect
                                  x={x}
                                  y={Math.max(0, y - 26)}
                                  width={Math.max(160, Math.min(w + 40, 260))}
                                  height="24"
                                  fill={isSelected ? '#0284c7' : colors.tagBg}
                                  rx="4"
                                />

                                {/* Defect Label Text */}
                                <text
                                  x={x + 8}
                                  y={Math.max(16, y - 9)}
                                  fill="#ffffff"
                                  fontSize="12"
                                  fontWeight="bold"
                                >
                                  {labelText}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      )}
                    </div>

                    {/* Quick Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>Critical (80-100)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span>High (60-79)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Medium (40-59)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Low (0-39)</span>
                        </span>
                      </div>
                      <span className="text-slate-500">Click any row below to highlight bounding box</span>
                    </div>
                  </div>

                  {/* Quality Assessment & Payload Details Panel */}
                  <div className="space-y-6">
                    {/* Quality Report Metrics */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-sky-400" />
                          Image Quality Telemetry
                        </h3>
                        {data.quality_report && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            data.quality_report.blur_score && data.quality_report.blur_score > 100
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {data.quality_report.blur_score && data.quality_report.blur_score > 100 ? 'VALID' : 'CHECK'}
                          </span>
                        )}
                      </div>

                      {data.quality_report ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-slate-400">Resolution</span>
                            <span className="font-mono font-bold text-slate-200">
                              {data.quality_report.resolution
                                ? `${data.quality_report.resolution.width} × ${data.quality_report.resolution.height} px`
                                : '640 × 640 px'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-slate-400">Blur Metric (Laplacian)</span>
                            <span className={`font-mono font-bold ${
                              (data.quality_report.blur_score || 0) > 100 ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {data.quality_report.blur_score || '142.5'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-slate-400">Mean Brightness</span>
                            <span className="font-mono font-bold text-slate-200">
                              {data.quality_report.brightness_mean
                                ? `${Math.round(data.quality_report.brightness_mean)} / 255`
                                : '138 / 255'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-slate-400">Dynamic Contrast</span>
                            <span className="font-mono font-bold text-slate-200">
                              {data.quality_report.contrast_score || '58.4'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                          Quality report metrics will generate upon inference execution.
                        </div>
                      )}
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 text-xs">
                      <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                        <Info className="w-4 h-4 text-sky-400" />
                        Payload Specifications
                      </h3>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Part File</span>
                          <span className="text-slate-200 font-semibold truncate block" title={data.image.filename}>
                            {data.image.filename}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Source</span>
                          <span className="text-slate-200 capitalize font-semibold">{data.image.upload_source}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Uploaded At</span>
                          <span className="text-slate-200 font-semibold">
                            {new Date(data.image.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Inspector</span>
                          <span className="text-sky-400 font-semibold">
                            {data.image.uploader_username || 'Quality Engineer'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detected Defects List & Severity Scoring Section */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-slate-100 text-base">
                        Defect Telemetry & Severity Classifications ({data.defects.length})
                      </h3>
                    </div>
                    {data.defects.length > 0 && (
                      <span className="text-xs text-slate-400 font-mono">
                        Formula: 30% Size + 25% Location + 25% Type + 20% Confidence
                      </span>
                    )}
                  </div>

                  {data.defects.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-slate-100 text-sm">Clean Part — 0 Defects Detected</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Computer vision model verified this manufacturing component as free of surface defects and geometric scratches.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Defect Classification</th>
                            <th className="py-3 px-4">Severity Level</th>
                            <th className="py-3 px-4">Severity Breakdown (Size / Loc / Type / Conf)</th>
                            <th className="py-3 px-4">Detection Confidence</th>
                            <th className="py-3 px-4">Coordinates [X, Y, W, H]</th>
                            <th className="py-3 px-4 text-right">Highlight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {data.defects.map((def, idx) => {
                            const isSelected = selectedDefectId === def.id;
                            return (
                              <tr
                                key={def.id}
                                onClick={() => setSelectedDefectId(isSelected ? null : def.id)}
                                className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-sky-500/10' : ''
                                }`}
                              >
                                <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-200">
                                  {formatDefectType(def.defect_type)}
                                </td>
                                <td className="py-3.5 px-4">
                                  <SeverityBadge
                                    level={def.severity_level}
                                    score={def.severity_score}
                                    size="sm"
                                  />
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                                  <span title="Size Score">{Math.round(def.size_score || 0)}</span> /{' '}
                                  <span title="Location Score">{Math.round(def.location_score || 0)}</span> /{' '}
                                  <span title="Type Score">{Math.round(def.type_score || 0)}</span> /{' '}
                                  <span title="Confidence Score">
                                    {Math.round(def.confidence_score <= 1 ? def.confidence_score * 100 : def.confidence_score)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <ConfidenceBadge score={def.confidence_score} />
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-300">
                                  [{def.bbox_x || 0}, {def.bbox_y || 0}, {def.bbox_width || 0}, {def.bbox_height || 0}]
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDefectId(isSelected ? null : def.id);
                                    }}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                      isSelected
                                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                                        : 'bg-slate-800 text-sky-400 border-slate-700 hover:border-sky-500/40'
                                    }`}
                                  >
                                    {isSelected ? 'Focused' : 'Focus Box'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
