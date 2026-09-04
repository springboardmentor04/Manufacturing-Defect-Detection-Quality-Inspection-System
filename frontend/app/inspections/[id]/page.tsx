"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { inspectionsService } from '@/services/inspections';
import { getAssetUrl } from '@/services/api';
import { Inspection } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, ShieldAlert, Zap, Layers, RefreshCcw, ClipboardList } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { formatDefectType } from '@/utils/formatters';

export default function InspectionResultPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [showOverride, setShowOverride] = useState(false);
  const { register, handleSubmit } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeDefect, setActiveDefect] = useState<any>(null);

  const fetchInspection = async () => {
    try {
      const data = await inspectionsService.getOne(Number(id));
      setInspection(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const onImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight
      });
    }
  };

  const onOverrideSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      await inspectionsService.overrideDecision(Number(id), data.final_decision, data.override_reason);
      setShowOverride(false);
      fetchInspection();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!inspection) return <DashboardLayout>Not found</DashboardLayout>;

  // Convert image path to full URL
  const imageUrl = getAssetUrl(inspection.image_path);
  const processedImageUrl = inspection.processed_image_path ? getAssetUrl(inspection.processed_image_path) : null;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inspection #{inspection.id}</h1>
          <p className="text-slate-500">Product: {inspection.product?.name || inspection.product_id}</p>
        </div>
        <div className="flex gap-2">
          {(!inspection.human_decision) && user && ['ADMIN', 'QUALITY_ENGINEER'].includes(user.role) && (
            <button 
              onClick={() => setShowOverride(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
              Manual Override
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
            <h2 className="font-bold text-slate-800 mb-4">Inspection Image (Model: {inspection.model_version})</h2>
            <p className={`mb-3 text-sm font-medium ${inspection.model_status === 'AVAILABLE' ? 'text-emerald-700' : 'text-amber-700'}`}>
              Model status: {inspection.model_status || 'UNKNOWN'}{inspection.model_message ? ` — ${inspection.model_message}` : ''}
            </p>
            {processedImageUrl && (
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Processed preview</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{inspection.model_status === 'AVAILABLE' ? 'AI pipeline' : 'Fallback/manual review'}</span>
              </div>
            )}
            <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                ref={imgRef}
                src={processedImageUrl || imageUrl} 
                alt="Inspection" 
                className="max-h-[600px] object-contain"
                onLoad={onImageLoad}
              />
              {/* Bounding Boxes */}
              {imgDims.w > 0 && inspection.bounding_boxes?.map((box: any, idx: number) => {
                // Determine absolute coordinates. YOLO typically gives [x1, y1, x2, y2]
                const [x1, y1, x2, y2] = box.box;
                const left = (x1 / imgDims.w) * 100;
                const top = (y1 / imgDims.h) * 100;
                const width = ((x2 - x1) / imgDims.w) * 100;
                const height = ((y2 - y1) / imgDims.h) * 100;

                return (
                  <div 
                    key={idx}
                    onClick={() => setActiveDefect(box)}
                    className="absolute border-2 border-red-500 bg-red-500/20 cursor-pointer hover:bg-red-500/40 transition-colors"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`
                    }}
                  >
                    <span className="absolute -top-6 left-0 bg-red-500 text-white text-xs font-bold px-1 whitespace-nowrap z-10">
                      {box.defect_display_name || formatDefectType(box.defect_type || box.label)} {box.classification_confidence ? box.classification_confidence.toFixed(1) : box.conf.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
            
            {activeDefect && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-red-800 text-lg">{(activeDefect.defect_display_name || formatDefectType(activeDefect.defect_type || activeDefect.label)).toUpperCase()}</h3>
                    {activeDefect.product_category && (
                      <p className="text-xs text-slate-500 mb-1">Product category: {activeDefect.product_category}</p>
                    )}
                    <p className="text-sm text-red-600 font-medium">Detection Confidence: {(activeDefect.detection_confidence || activeDefect.conf).toFixed(2)}%</p>
                    {activeDefect.classification_confidence && (
                      <p className="text-sm text-red-600 font-medium">Classification Confidence: {activeDefect.classification_confidence.toFixed(2)}%</p>
                    )}
                    {activeDefect.assessment && (
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-red-900">
                        <span>Severity: {activeDefect.assessment.severity_score.toFixed(1)} ({activeDefect.assessment.severity_level})</span>
                        <span>Risk: {activeDefect.assessment.quality_risk}</span>
                        <span>Decision: {activeDefect.assessment.quality_decision}</span>
                        <span>Size: {activeDefect.area.toFixed(0)} px2</span>
                        <p className="col-span-2">{activeDefect.assessment.recommended_action}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setActiveDefect(null)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar details */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Quality Decision Summary</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">AI DECISION</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    inspection.ai_decision === 'PASS' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    inspection.ai_decision === 'FAIL' ? 'bg-red-100 text-red-800 border-red-200' :
                    inspection.ai_decision === 'REVIEW' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    inspection.ai_decision === 'REWORK' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    {inspection.ai_decision === 'PASS' ? <CheckCircle size={14} className="mr-1"/> : <AlertTriangle size={14} className="mr-1"/>}
                    {inspection.ai_decision || 'N/A'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">HUMAN REVIEW DECISION</p>
                <div className="mt-1">
                  {inspection.human_decision ? (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      inspection.human_decision === 'PASS' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      inspection.human_decision === 'FAIL' ? 'bg-red-100 text-red-800 border-red-200' :
                      inspection.human_decision === 'REVIEW' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      inspection.human_decision === 'REWORK' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {inspection.human_decision}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">Not manually overridden</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">FINAL QUALITY DECISION</p>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-black border ${
                    inspection.final_decision === 'PASS' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    inspection.final_decision === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                    inspection.final_decision === 'REVIEW' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    inspection.final_decision === 'REWORK' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {inspection.final_decision || 'N/A'}
                  </span>
                </div>
              </div>

              {inspection.override_reason && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 italic">
                  <strong>Override Justification:</strong> "{inspection.override_reason}"
                </div>
              )}
            </div>
          </div>

          {inspection.quality_assessment && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Quality Assessment</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Overall result</span><span className="font-bold">{inspection.quality_assessment.overall_result}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Quality risk</span><span className="font-bold">{inspection.quality_assessment.quality_risk}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Highest severity</span><span className="font-bold">{inspection.quality_assessment.highest_severity}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Detected defects</span><span className="font-bold">{inspection.quality_assessment.defect_count}</span></div>
                <p className="border-t pt-3 text-slate-700">{inspection.quality_assessment.recommended_action}</p>
                {inspection.quality_assessment.manual_review_required && (
                  <p className="flex gap-2 rounded-lg bg-amber-50 p-2 font-medium text-amber-800"><AlertTriangle size={16} />Manual review required: one or more detections are below 70% confidence.</p>
                )}
              </div>
            </div>
          )}

          {inspection.bounding_boxes && inspection.bounding_boxes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Defect Classification</h2>
              <div className="space-y-3 text-sm">
                {inspection.bounding_boxes.map((box, index) => (
                  <div key={`${box.label}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{box.defect_display_name || formatDefectType(box.defect_type || box.label)}</span>
                        {box.product_category && (
                          <span className="text-xs text-slate-500">Product: {box.product_category}</span>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        box.assessment?.severity_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        box.assessment?.severity_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        box.assessment?.severity_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {box.assessment?.severity_level || 'LOW'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600">
                      <span>Det. Conf: {(box.detection_confidence || box.conf).toFixed(1)}%</span>
                      <span>Cls. Conf: {box.classification_confidence ? box.classification_confidence.toFixed(1) + '%' : 'N/A'}</span>
                      <span>Risk: {box.assessment?.quality_risk || 'Low risk'}</span>
                      <span>Decision: {box.assessment?.quality_decision || 'REVIEW'}</span>
                      <span>Area: {box.area.toFixed(0)} px²</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspection.image_quality && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Image Quality</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-bold">{inspection.image_quality.status}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Dimensions</span><span>{inspection.image_quality.width} × {inspection.image_quality.height}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Brightness</span><span>{inspection.image_quality.brightness.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Contrast</span><span>{inspection.image_quality.contrast.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sharpness</span><span>{inspection.image_quality.sharpness.toFixed(1)}</span></div>
                {inspection.image_quality.warning && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-amber-800">{inspection.image_quality.warning}</p>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 text-lg mb-4 border-b pb-2">Severity Analysis</h2>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-3xl font-black text-slate-800">
                  {inspection.severity_score?.toFixed(1) || '0.0'}
                </p>
                <p className="text-sm text-slate-500 font-semibold uppercase">{inspection.severity_level || 'UNKNOWN'}</p>
              </div>
              <div className={`p-4 rounded-full ${
                inspection.severity_score && inspection.severity_score > 70 ? 'bg-red-100 text-red-600' : 
                inspection.severity_score && inspection.severity_score > 30 ? 'bg-amber-100 text-amber-600' : 
                'bg-emerald-100 text-emerald-600'
              }`}>
                <ShieldAlert size={32} />
              </div>
            </div>

            {inspection.severity_components && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600 flex items-center gap-2"><Layers size={16}/> Size</span>
                  <span className="font-bold">{inspection.severity_components.size.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600 flex items-center gap-2"><Zap size={16}/> Confidence</span>
                  <span className="font-bold">{inspection.severity_components.confidence.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600 flex items-center gap-2"><AlertTriangle size={16}/> Type</span>
                  <span className="font-bold">{inspection.severity_components.type.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600 flex items-center gap-2"><RefreshCcw size={16}/> Location</span>
                  <span className="font-bold">{inspection.severity_components.location.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><ClipboardList size={20} />Detected Defects</h2>
        {inspection.bounding_boxes?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500"><tr><th className="pb-2">Defect Type</th><th className="pb-2">Product</th><th className="pb-2">Confidence</th><th className="pb-2">Size</th><th className="pb-2">Severity</th><th className="pb-2">Risk</th><th className="pb-2">Decision</th><th className="pb-2">Recommended Action</th></tr></thead>
              <tbody>{inspection.bounding_boxes.map((defect, index) => <tr key={index} className="border-b last:border-0"><td className="py-3 font-semibold">{defect.defect_display_name || formatDefectType(defect.defect_type || defect.label)}</td><td className="py-3">{defect.product_category || 'N/A'}</td><td className="py-3">{defect.classification_confidence ? defect.classification_confidence.toFixed(1) : defect.conf.toFixed(1)}%</td><td className="py-3">{defect.area.toFixed(0)} px2</td><td className="py-3">{defect.assessment ? `${defect.assessment.severity_score.toFixed(1)} ${defect.assessment.severity_level}` : 'N/A'}</td><td className="py-3">{defect.assessment?.quality_risk || 'N/A'}</td><td className="py-3">{defect.assessment?.quality_decision || 'N/A'}</td><td className="py-3 text-slate-600">{defect.assessment?.recommended_action || 'N/A'}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="text-slate-500">No defects detected. Product is acceptable.</p>}
      </div>

      {showOverride && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Manual Override</h2>
            <p className="text-slate-600 mb-6">Override the AI's decision for this inspection. This action will be logged in the audit trail.</p>
            
            <form onSubmit={handleSubmit(onOverrideSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Final Quality Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 cursor-pointer hover:bg-emerald-50 flex items-center gap-2">
                    <input type="radio" value="PASS" {...register("final_decision", { required: true })} className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-emerald-700 block text-sm">PASS</span>
                      <span className="text-[11px] text-emerald-600">Meets acceptance</span>
                    </div>
                  </label>
                  <label className="border border-red-200 bg-red-50/50 rounded-lg p-3 cursor-pointer hover:bg-red-50 flex items-center gap-2">
                    <input type="radio" value="FAIL" {...register("final_decision", { required: true })} className="w-4 h-4 text-red-600" />
                    <div>
                      <span className="font-bold text-red-700 block text-sm">FAIL</span>
                      <span className="text-[11px] text-red-600">Reject product</span>
                    </div>
                  </label>
                  <label className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 cursor-pointer hover:bg-amber-50 flex items-center gap-2">
                    <input type="radio" value="REVIEW" {...register("final_decision", { required: true })} className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-amber-700 block text-sm">REVIEW</span>
                      <span className="text-[11px] text-amber-600">Secondary check</span>
                    </div>
                  </label>
                  <label className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 cursor-pointer hover:bg-blue-50 flex items-center gap-2">
                    <input type="radio" value="REWORK" {...register("final_decision", { required: true })} className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-blue-700 block text-sm">REWORK</span>
                      <span className="text-[11px] text-blue-600">Repair & re-inspect</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Override Reason (Required)</label>
                <textarea 
                  {...register("override_reason", { required: true, minLength: 5 })}
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                  placeholder="e.g. Defect is within acceptable tolerance threshold..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowOverride(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-70"
                >
                  {submitting ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
