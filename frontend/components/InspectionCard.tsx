'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Eye, ChevronRight, Play, Loader2, Sparkles } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '@/lib/api';

export interface InspectionCardData {
  id: number;
  image_id?: number;
  filename?: string | null;
  filepath?: string | null;
  status: string;
  defect_count?: number;
  created_at: string;
  uploader_username?: string | null;
  defect_summary?: string;
}

interface InspectionCardProps {
  inspection: InspectionCardData;
  onRunAnalysis?: (id: number) => Promise<void>;
  isAnalyzing?: boolean;
  compact?: boolean;
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function cleanProductTitle(filename?: string | null): string {
  if (!filename) return 'Inspection Item';
  // Remove unique hash prefix if present (e.g., 32-char hex + underscore)
  const cleaned = filename.replace(/^[0-9a-f]{32}_/i, '');
  // Format underscores or dashes into spaces and title-case words
  return cleaned
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ (Jpg|Jpeg|Png|Bmp|Tiff|Webp)$/i, '');
}

export function formatDefectType(defectType: string): string {
  if (!defectType) return 'Defect Anomaly';
  const parts = defectType.split('_');
  if (parts.length >= 2) {
    const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const defectName = parts.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${category} — ${defectName}`;
  }
  return defectType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InspectionCard({
  inspection,
  onRunAnalysis,
  isAnalyzing = false,
  compact = false,
}: InspectionCardProps) {
  const imageUrl = inspection.filepath
    ? `${API_BASE_URL}/${inspection.filepath}`
    : '/placeholder-defect.png';

  const productTitle = cleanProductTitle(inspection.filename);
  const isPending = inspection.status === 'queued' || inspection.status === 'pending';

  if (compact) {
    return (
      <Link
        href={`/dashboard/inspections/${inspection.id}`}
        className="flex items-center gap-3 p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/30 rounded-xl transition-all group"
      >
        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={productTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-sky-300 transition-colors">
              {productTitle}
            </h4>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(inspection.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1.5">
            <StatusBadge
              status={inspection.status}
              defectCount={inspection.defect_count}
              size="sm"
            />
            {inspection.defect_summary && (
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {inspection.defect_summary}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] group">
      <div>
        {/* Thumbnail Viewport */}
        <Link
          href={`/dashboard/inspections/${inspection.id}`}
          className="relative block w-full h-44 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden mb-3.5 group/img"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={productTitle}
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-3">
            <span className="text-xs text-sky-300 font-medium flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> View Inspection
            </span>
          </div>

          {/* Top Badge Overlay */}
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge
              status={inspection.status}
              defectCount={inspection.defect_count}
              size="sm"
            />
          </div>
        </Link>

        {/* Title & Metadata */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-slate-500">
              ID #{inspection.id}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatTimeAgo(inspection.created_at)}
            </span>
          </div>

          <Link href={`/dashboard/inspections/${inspection.id}`}>
            <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-sky-400 transition-colors" title={inspection.filename || ''}>
              {productTitle}
            </h3>
          </Link>

          {inspection.uploader_username && (
            <p className="text-[11px] text-slate-500">
              Inspector: <span className="text-slate-300 font-medium">{inspection.uploader_username}</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
        {isPending && onRunAnalysis ? (
          <button
            onClick={() => onRunAnalysis(inspection.id)}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running YOLO...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Detection</span>
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/dashboard/inspections/${inspection.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-sky-300 font-medium text-xs rounded-xl border border-slate-700 hover:border-sky-500/30 transition-all"
          >
            <span>View Overlay Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
