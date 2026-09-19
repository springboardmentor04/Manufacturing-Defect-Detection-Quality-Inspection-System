"use client";

import { ImageIcon, AlertOctagon, Check, X, Clock } from "lucide-react";

import Link from "next/link";

import { getFullImageUrl } from "@/lib/api";

export type Inspection = {
  inspection_id: string;
  dataset_category: string;
  status: string;
  upload_time: string;
  image_path: string;
  inspection_result?: string;
  confidence?: number;
  defect_type?: string;
  defect_category?: string;
  severity?: string;
  bounding_boxes?: number[][];
  segmentation_masks?: number[][][];
  processing_time?: number;
  error_message?: string;
};

export function DetectionPreview({ data }: { data: Inspection }) {
  const imageUrl = getFullImageUrl(data?.image_path);
  const isCompleted = data?.status === 'Completed';
  const isPendingOrProcessing = data?.status === 'Pending' || data?.status === 'Processing';

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Latest Inspection</h3>
        <span className="text-xs font-mono text-slate-500">{data?.inspection_id || 'N/A'}</span>
      </div>
      
      <div className="relative aspect-square bg-slate-950 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? (
          <img src={imageUrl} alt={data?.dataset_category || "Inspection"} className="max-w-full max-h-full rounded-lg object-contain shadow-xl border border-slate-800" />
        ) : (
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <Clock className="w-5 h-5 animate-spin" /> No image preview
          </div>
        )}
        
        {/* Segmentation Overlay */}
        {data?.segmentation_masks && data.segmentation_masks.length > 0 && (
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full rounded-lg pointer-events-none">
            {data.segmentation_masks.map((polygon, i) => (
              <polygon 
                key={i}
                points={polygon.map((p) => `${p[0]},${p[1]}`).join(' ')}
                fill="rgba(239, 68, 68, 0.4)"
                stroke="rgb(239, 68, 68)"
                strokeWidth="0.005"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}
        
        {/* Bounding Box Overlay */}
        {(!data?.segmentation_masks || data.segmentation_masks.length === 0) && data?.bounding_boxes && data.bounding_boxes.map((box, i) => {
          const [x1, y1, x2, y2] = box;
          return (
            <div 
              key={i}
              className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
              style={{
                left: `${x1 * 100}%`,
                top: `${y1 * 100}%`,
                width: `${(x2 - x1) * 100}%`,
                height: `${(y2 - y1) * 100}%`
              }}
            />
          );
        })}
      </div>

      <div className="p-6 space-y-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white capitalize">{(data?.dataset_category || 'General').replace('_', ' ')}</h4>
            {isPendingOrProcessing ? (
              <p className="text-sm text-blue-500 font-medium flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4 animate-spin" /> AI analyzing image...
              </p>
            ) : data?.status === 'Failed' ? (
              <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                <AlertOctagon className="w-4 h-4" /> Processing Failed
              </p>
            ) : data?.inspection_result === 'FAIL' ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-red-500 font-medium flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4" /> {data.defect_type || 'Defect'} Detected
                </p>
                {data.defect_category && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 ml-5">
                    Category: {data.defect_category}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <Check className="w-4 h-4" /> No Defects
              </p>
            )}
          </div>
          <div className={`px-3 py-1 rounded-lg font-bold text-sm border ${
            data?.inspection_result === 'PASS' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' 
              : data?.inspection_result === 'FAIL'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
          }`}>
            {data?.inspection_result || data?.status || 'Pending'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-1">Confidence</p>
            <p className="font-mono font-bold text-slate-900 dark:text-white">
              {data?.confidence !== undefined ? `${data.confidence}%` : 'N/A'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-1">Severity</p>
            <p className={`font-mono font-bold ${data?.severity && data.severity !== 'None' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
              {data?.severity || 'N/A'}
            </p>
          </div>
        </div>

        {data?.upload_time && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
            <Clock className="w-4 h-4" /> 
            <span>Upload Time: <strong className="text-slate-700 dark:text-slate-300">
              {(() => {
                try { return new Date(data.upload_time).toLocaleString(); }
                catch { return data.upload_time; }
              })()}
            </strong></span>
          </div>
        )}

        {data?.error_message && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3 rounded-xl text-xs text-red-700 dark:text-red-400">
            {data.error_message}
          </div>
        )}

        {data?.inspection_result === 'FAIL' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex-1">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1 uppercase tracking-wider">Action Recommended</p>
            <p className="text-sm text-amber-900 dark:text-amber-200">Review defect details. Consider routing to manual inspection.</p>
          </div>
        )}
        
        {data?.inspection_id && (
          <div className="flex gap-2 mt-auto pt-4">
            <Link href={`/dashboard/engineer/history/${data.inspection_id}`} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm text-center">
              Review Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
