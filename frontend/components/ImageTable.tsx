'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageDetail, analyzeInspection, getErrorMessage } from '@/lib/api';
import { Eye, Clock, User, Filter, ChevronLeft, ChevronRight, Image as ImageIcon, CheckCircle, AlertTriangle, Play, Loader2, ExternalLink } from 'lucide-react';

interface ImageTableProps {
  images: ImageDetail[];
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  isLoading: boolean;
  onRefresh?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${Math.max(1, seconds)} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function ImageTable({
  images,
  currentPage,
  onPageChange,
  statusFilter,
  onFilterChange,
  isLoading,
  onRefresh,
}: ImageTableProps) {
  const [selectedImage, setSelectedImage] = useState<ImageDetail | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const handleAnalyze = async (inspectionId: number) => {
    try {
      setAnalyzingId(inspectionId);
      await analyzeInspection(inspectionId);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      alert(`Analysis failed: ${getErrorMessage(err, 'Analysis failed')}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Processed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const getDefectBadge = (count: number | undefined, imageStatus: string) => {
    if (imageStatus === 'pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Unanalyzed
        </span>
      );
    }
    const c = count || 0;
    if (c === 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          0 Defects (Pass)
        </span>
      );
    } else if (c <= 2) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
          {c} Defect{c > 1 ? 's' : ''}
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
          {c} Defects
        </span>
      );
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'batch':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Batch</span>;
      case 'camera_sim':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Camera Sim</span>;
      case 'manual':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">Manual</span>;
    }
  };

  return (
    <div id="table-section" className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sky-400" />
            Inspection Image Repository
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Uploaded raw manufacturing inspection payloads with queued status tracking and defect count badges.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="processed">Processed Only</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-3 px-4">Thumbnail</th>
              <th className="py-3 px-4">Filename</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Image Status</th>
              <th className="py-3 px-4">Defects</th>
              <th className="py-3 px-4">Uploaded At</th>
              <th className="py-3 px-4">Uploaded By</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading repository records...</span>
                  </div>
                </td>
              </tr>
            ) : images.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-8 h-8 text-slate-600" />
                    <p className="text-slate-400 font-medium">No inspection images found</p>
                    <p className="text-xs text-slate-600">Upload sample files using the widget above to populate the repository.</p>
                  </div>
                </td>
              </tr>
            ) : (
              images.map((img) => {
                const thumbnailUrl = `${API_BASE_URL}/${img.filepath}`;
                const isAnalyzing = img.inspection_id ? analyzingId === img.inspection_id : false;

                return (
                  <tr key={img.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setSelectedImage(img)}
                        className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer relative group-hover:border-sky-500/50 transition-all flex items-center justify-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnailUrl}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <Eye className="w-4 h-4 text-sky-400 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>

                    {/* Filename */}
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-[200px] truncate" title={img.filename}>
                      {img.filename}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4">{getSourceBadge(img.upload_source)}</td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(img.status)}</td>

                    {/* Defects Column */}
                    <td className="py-3 px-4">
                      {getDefectBadge(img.defect_count, img.status)}
                    </td>

                    {/* Uploaded At */}
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(img.uploaded_at)}
                    </td>

                    {/* Uploaded By */}
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{img.uploader_username || `User #${img.uploaded_by}`}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {img.status === 'pending' && img.inspection_id ? (
                          <button
                            onClick={() => handleAnalyze(img.inspection_id!)}
                            disabled={isAnalyzing}
                            className="px-3 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-md transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Analyze</span>
                              </>
                            )}
                          </button>
                        ) : img.inspection_id ? (
                          <Link
                            href={`/dashboard/inspections/${img.inspection_id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-sky-300 rounded-md border border-slate-700 hover:border-sky-500/40 transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </Link>
                        ) : null}

                        <button
                          onClick={() => setSelectedImage(img)}
                          className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-950/60 hover:bg-slate-800 rounded border border-slate-800"
                          title="Quick Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing page <span className="font-semibold text-slate-200">{currentPage}</span> ({images.length} items loaded)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-medium text-slate-300">
            {currentPage}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={images.length < 20 || isLoading}
            className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 text-sm truncate">{selectedImage.filename}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-slate-100 text-xs font-semibold px-2 py-1 bg-slate-800 rounded"
              >
                Close (ESC)
              </button>
            </div>
            <div className="w-full max-h-[60vh] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_BASE_URL}/${selectedImage.filepath}`}
                alt={selectedImage.filename}
                className="max-h-[55vh] object-contain"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">IMAGE ID</span>
                <span className="text-slate-200 font-mono font-medium">#{selectedImage.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SOURCE</span>
                <span className="text-slate-200 capitalize font-medium">{selectedImage.upload_source}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STATUS</span>
                <span className="text-slate-200 capitalize font-medium">{selectedImage.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">INSPECTION QUEUE</span>
                <span className="text-sky-400 font-medium">{selectedImage.inspection_status || 'queued'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
