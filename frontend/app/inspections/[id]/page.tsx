"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { inspectionsService } from '@/services/inspections';
import { getAssetUrl } from '@/services/api';
import { Inspection } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Cpu, 
  RotateCcw, 
  ArrowLeft, 
  X, 
  Loader2, 
  Clock, 
  Layers, 
  User as UserIcon,
  Tag
} from 'lucide-react';
import { formatDefectType } from '@/utils/formatters';

export default function InspectionResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const [showOverride, setShowOverride] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState('PASS');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const [activeDefect, setActiveDefect] = useState<any>(null);

  const fetchInspection = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setFetchError(null);
      const data = await inspectionsService.getOne(Number(id));
      setInspection(data);
    } catch (error: any) {
      console.error('[InspectionDetailPage] Failed to load inspection:', error);
      let errorMsg = 'Failed to load inspection record.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setFetchError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  const onImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError('Please provide an override rationale.');
      return;
    }

    try {
      setSubmittingOverride(true);
      setOverrideError(null);
      await inspectionsService.overrideDecision(
        Number(id),
        overrideDecision,
        overrideReason.trim()
      );
      setShowOverride(false);
      setOverrideReason('');
      await fetchInspection();
    } catch (error: any) {
      console.error('[InspectionDetailPage] Override failed:', error);
      let errorMsg = 'Failed to submit override.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setOverrideError(errorMsg);
    } finally {
      setSubmittingOverride(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-80 gap-3">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-sm font-medium text-slate-600">Loading inspection details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (fetchError || !inspection) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <AlertTriangle className="text-rose-500 mx-auto mb-3" size={40} />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Inspection Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{fetchError || 'The requested inspection record does not exist.'}</p>
          <Link
            href="/inspections"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Inspections
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Normalize decisions and detections
  const aiDecision =
    inspection.quality_decision?.ai_decision ||
    inspection.ai_decision ||
    (inspection.detections && inspection.detections.length > 0 ? 'FAIL' : 'PASS');
  const finalDecision =
    inspection.quality_decision?.final_decision ||
    inspection.final_decision ||
    aiDecision;
  const humanDecision =
    inspection.quality_decision?.human_decision ||
    inspection.human_decision;

  const normalizedDetections = (inspection.detections || inspection.bounding_boxes || []).map((d: any) => {
    const x1 = d.bbox_x1 ?? d.box?.[0] ?? 0;
    const y1 = d.bbox_y1 ?? d.box?.[1] ?? 0;
    const x2 = d.bbox_x2 ?? d.box?.[2] ?? 0;
    const y2 = d.bbox_y2 ?? d.box?.[3] ?? 0;
    const rawConf = d.confidence ?? d.conf ?? 0;
    const conf = rawConf <= 1.0 ? rawConf * 100 : rawConf;
    const type = d.defect_type ?? d.label ?? 'Defect';
    return { ...d, x1, y1, x2, y2, conf, type };
  });

  const imageUrl = getAssetUrl(inspection.image_path || `/api/inspections/${inspection.id}/image`);
  const processedImageUrl = inspection.processed_image_path ? getAssetUrl(inspection.processed_image_path) : null;

  const isEngineerOrAdmin = user && ['ADMIN', 'QUALITY_ENGINEER'].includes(
    (user.role || '').toString().trim().replace(/\s+/g, '_').toUpperCase()
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/inspections"
              className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Back to inspections"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Inspection #{inspection.id}
              </h1>
              <p className="text-xs text-slate-500">
                Logged on {new Date(inspection.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEngineerOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setOverrideDecision(finalDecision === 'PASS' ? 'FAIL' : 'PASS');
                  setShowOverride(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                Override Decision
              </button>
            )}
          </div>
        </div>

        {/* Quality status overview bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Assessment</p>
              <p className="text-lg font-bold mt-0.5 text-slate-900">{aiDecision}</p>
            </div>
            {aiDecision === 'PASS' ? (
              <CheckCircle2 className="text-emerald-500" size={28} />
            ) : (
              <XCircle className="text-rose-500" size={28} />
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Decision</p>
              <p className="text-lg font-bold mt-0.5 text-slate-900">{finalDecision}</p>
            </div>
            {finalDecision === 'PASS' ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                ACCEPTED
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-full border border-rose-200">
                REJECTED
              </span>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Defects Detected</p>
              <p className="text-lg font-bold mt-0.5 text-slate-900">{normalizedDetections.length}</p>
            </div>
            <Tag className="text-blue-500" size={24} />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inference Time</p>
              <p className="text-lg font-bold mt-0.5 text-slate-900 font-mono">
                {inspection.processing_time_ms ? `${Number(inspection.processing_time_ms).toFixed(1)} ms` : '-'}
              </p>
            </div>
            <Clock className="text-slate-400" size={24} />
          </div>
        </div>

        {/* Override Note banner if overridden */}
        {humanDecision && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm flex items-start gap-3 shadow-xs">
            <RotateCcw className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">Manual Decision Override Applied: {humanDecision}</p>
              <p className="text-xs mt-0.5 text-amber-800">
                Reason: {inspection.override_reason || 'Quality Engineer verified defect parameters.'}
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Image Viewer & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Optical Image Viewer */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Cpu size={18} className="text-blue-600" />
                Optical Image & Bounding Boxes
              </h2>
              <span className="text-xs font-medium text-slate-500">
                Model: {inspection.model_version || 'YOLOv8'}
              </span>
            </div>

            <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[380px]">
              <img
                ref={imgRef}
                src={processedImageUrl || imageUrl}
                alt={`Inspection #${inspection.id}`}
                className="max-h-[540px] w-auto object-contain rounded"
                onLoad={onImageLoad}
              />

              {/* Dynamic Bounding Box Highlights */}
              {imgDims.w > 0 &&
                normalizedDetections.map((defect: any, idx: number) => {
                  const left = (defect.x1 / imgDims.w) * 100;
                  const top = (defect.y1 / imgDims.h) * 100;
                  const width = ((defect.x2 - defect.x1) / imgDims.w) * 100;
                  const height = ((defect.y2 - defect.y1) / imgDims.h) * 100;

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveDefect(defect)}
                      className="absolute border-2 border-rose-500 bg-rose-500/25 cursor-pointer hover:bg-rose-500/40 transition-all group"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      title={`${defect.type} (${defect.conf.toFixed(1)}%)`}
                    >
                      <span className="absolute -top-6 left-0 bg-rose-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                        {formatDefectType(defect.type)} {defect.conf.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Selected defect popover info */}
            {activeDefect && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{formatDefectType(activeDefect.type)}</p>
                  <p className="text-slate-500 mt-0.5">
                    Confidence: <span className="font-semibold text-slate-800">{activeDefect.conf.toFixed(1)}%</span> | Bounding Box: [{activeDefect.x1.toFixed(0)}, {activeDefect.y1.toFixed(0)}, {activeDefect.x2.toFixed(0)}, {activeDefect.y2.toFixed(0)}]
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDefect(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Inspection Metadata and Defects Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4">Inspection Specifications</h2>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Inspection ID:</span>
                  <span className="font-mono font-bold text-slate-800">#{inspection.id}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-semibold text-slate-900">{inspection.product?.name || `Product #${inspection.product_id}`}</span>
                </div>
                {inspection.batch_id && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Batch ID:</span>
                    <span className="font-mono text-slate-800">Batch #{inspection.batch_id}</span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Operator ID:</span>
                  <span className="font-mono text-slate-800">User #{inspection.operator_id || 1}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Quality Decision:</span>
                  <span className={`font-bold ${finalDecision === 'PASS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {finalDecision}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Defect Breakdown</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-full text-slate-700">
                  {normalizedDetections.length} Total
                </span>
              </h2>

              {normalizedDetections.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">Clean Part (No Defects)</p>
                  <p className="text-xs text-slate-400">Surface verified defect-free by optical inspection.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                  {normalizedDetections.map((defect: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setActiveDefect(defect)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        activeDefect === defect
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-800 text-sm">{formatDefectType(defect.type)}</p>
                        <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          {defect.conf.toFixed(1)}% conf
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Box: [{defect.x1.toFixed(0)}, {defect.y1.toFixed(0)}, {defect.x2.toFixed(0)}, {defect.y2.toFixed(0)}]
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Override Modal */}
        {showOverride && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Manual Quality Override</h2>
                    <p className="text-xs text-slate-500">Record supervisory decision override</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverride(false)}
                  disabled={submittingOverride}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
                {overrideError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Override Failed</p>
                      <p className="mt-0.5">{overrideError}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Decision <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="override-decision-select"
                    value={overrideDecision}
                    onChange={(e) => setOverrideDecision(e.target.value)}
                    disabled={submittingOverride}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all bg-white"
                  >
                    <option value="PASS">PASS (Accept Component)</option>
                    <option value="FAIL">FAIL (Reject Component)</option>
                    <option value="REVIEW">REVIEW (Pending Senior Inspection)</option>
                    <option value="REWORK">REWORK (Send to Rework Station)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Override Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="override-reason-input"
                    value={overrideReason}
                    onChange={(e) => {
                      setOverrideReason(e.target.value);
                      if (overrideError) setOverrideError(null);
                    }}
                    disabled={submittingOverride}
                    rows={3}
                    required
                    placeholder="Describe engineering rationale or secondary measurement..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowOverride(false)}
                    disabled={submittingOverride}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOverride}
                    className="px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {submittingOverride ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving Override...
                      </>
                    ) : (
                      'Save Override'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
