'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import UploadModal from '@/components/UploadModal';
import { getInspections, InspectionListItem, API_BASE_URL } from '@/lib/api';
import { cleanProductTitle, formatTimeAgo } from '@/components/InspectionCard';
import {
  Scan,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
  Play,
  RefreshCw,
  Search,
  UploadCloud,
  Layers,
} from 'lucide-react';

export default function InspectionsListPage() {
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchInspectionsList = async () => {
    setIsLoading(true);
    try {
      const data = await getInspections();
      setInspections(data);
    } catch (err: any) {
      console.error('Failed to load inspections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectionsList();
  }, []);

  const filteredInspections = inspections.filter((item) => {
    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'passed' && (item.status !== 'completed' || (item.defect_count || 0) > 0)) {
        return false;
      }
      if (statusFilter === 'failed' && (item.status !== 'completed' || (item.defect_count || 0) === 0)) {
        return false;
      }
      if (statusFilter === 'pending' && item.status !== 'queued' && item.status !== 'pending') {
        return false;
      }
      if (statusFilter === 'needs_review' && item.status !== 'needs_review') {
        return false;
      }
      if (statusFilter === 'rejected' && item.status !== 'rejected') {
        return false;
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filenameMatch = (item.filename || '').toLowerCase().includes(q);
      const idMatch = String(item.id).includes(q);
      return filenameMatch || idMatch;
    }

    return true;
  });

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

          <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Scan className="w-4 h-4" /> Comprehensive Vision Archive
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                  Inspection Logs & Defects Registry
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Complete repository of processed manufacturing images with YOLO defect detections and quality tags.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchInspectionsList}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Refresh records"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Part</span>
                </button>

                <Link
                  href="/dashboard/batch-analyze"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-sky-400 font-semibold text-xs rounded-xl border border-slate-700 hover:border-sky-500/30 transition-all flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  <span>Batch Analyze</span>
                </Link>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by part filename or inspection ID..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
                <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-slate-900">All Statuses</option>
                  <option value="passed" className="bg-slate-900">Passed (0 Defects)</option>
                  <option value="failed" className="bg-slate-900">Failed (Defects Found)</option>
                  <option value="pending" className="bg-slate-900">Pending / Queued</option>
                  <option value="needs_review" className="bg-slate-900">Needs Review</option>
                  <option value="rejected" className="bg-slate-900">Quality Rejected</option>
                </select>
              </div>
            </div>

            {/* Inspection Records Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Thumbnail</th>
                      <th className="py-3.5 px-4">Product Name</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Defect Count</th>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                            <span>Loading inspection records...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredInspections.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertTriangle className="w-8 h-8 text-slate-600" />
                            <p className="text-slate-300 font-semibold">No inspection records found</p>
                            <p className="text-xs text-slate-600">Upload a part to create an inspection record.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInspections.map((insp) => {
                        const imageUrl = insp.filepath
                          ? `${API_BASE_URL}/${insp.filepath}`
                          : '/placeholder-defect.png';

                        return (
                          <tr key={insp.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                              #{insp.id}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imageUrl}
                                  alt={insp.filename || 'Part'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-200 max-w-[220px] truncate">
                              {cleanProductTitle(insp.filename)}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={insp.status} defectCount={insp.defect_count} size="sm" />
                            </td>
                            <td className="py-3.5 px-4">
                              {insp.defect_count !== undefined && insp.defect_count > 0 ? (
                                <span className="font-bold text-rose-400">
                                  {insp.defect_count} Defect{insp.defect_count > 1 ? 's' : ''}
                                </span>
                              ) : insp.status === 'completed' ? (
                                <span className="text-emerald-400 font-semibold">0 (Passed)</span>
                              ) : (
                                <span className="text-slate-500 font-mono">Queued</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                              {formatTimeAgo(insp.created_at)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/dashboard/inspections/${insp.id}`}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-sky-300 font-semibold rounded-xl border border-slate-700 transition-all inline-flex items-center gap-1"
                              >
                                <span>View Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Global Upload Modal */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadCompleted={fetchInspectionsList}
        />
      </div>
    </ProtectedRoute>
  );
}
