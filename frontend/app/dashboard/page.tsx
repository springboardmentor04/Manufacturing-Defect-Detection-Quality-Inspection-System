'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import StatCard from '@/components/StatCard';
import InspectionCard, { cleanProductTitle, formatTimeAgo } from '@/components/InspectionCard';
import StatusBadge from '@/components/StatusBadge';
import RecentDetectionsPanel from '@/components/RecentDetectionsPanel';
import UploadModal from '@/components/UploadModal';
import {
  getInspections,
  getImages,
  analyzeInspection,
  getCurrentUserFromStorage,
  UserProfile,
  InspectionListItem,
  ImageDetail,
  getErrorMessage,
  API_BASE_URL,
} from '@/lib/api';
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  UploadCloud,
  Filter,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Play,
  Loader2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [images, setImages] = useState<ImageDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active tab for Supervisor role: 'all' vs 'mine'
  const [supervisorTab, setSupervisorTab] = useState<'all' | 'mine'>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inspData, imgData] = await Promise.all([
        getInspections(),
        getImages(),
      ]);
      setInspections(inspData);
      setImages(imgData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentUser(getCurrentUserFromStorage());
    fetchData();
  }, [fetchData]);

  const handleRunAnalysis = async (inspectionId: number) => {
    setAnalyzingId(inspectionId);
    try {
      await analyzeInspection(inspectionId);
      await fetchData();
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(`Analysis failed: ${getErrorMessage(err, 'Could not run analysis')}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const isSupervisor = currentUser?.role_name === 'factory_supervisor';

  // Filter inspections based on role and tab
  const roleFilteredInspections = inspections.filter((item) => {
    if (isSupervisor) {
      if (supervisorTab === 'mine' && currentUser) {
        // Find matching image to check uploaded_by
        const img = images.find((i) => i.id === item.image_id);
        return img ? img.uploaded_by === currentUser.id : true;
      }
      return true;
    } else {
      // Quality Engineer sees their own inspections
      if (currentUser) {
        const img = images.find((i) => i.id === item.image_id);
        return img ? img.uploaded_by === currentUser.id : true;
      }
      return true;
    }
  });

  // Apply search & status filter
  const displayedInspections = roleFilteredInspections.filter((item) => {
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

  // Calculate high-precision summary statistics
  const totalInspections = roleFilteredInspections.length;
  const completedInspections = roleFilteredInspections.filter(
    (i) => i.status === 'completed' || i.status === 'passed' || i.status === 'failed'
  );
  const passedInspections = roleFilteredInspections.filter(
    (i) => (i.status === 'completed' || i.status === 'passed') && (i.defect_count === 0 || !i.defect_count)
  );
  const passRate =
    completedInspections.length > 0
      ? Math.round((passedInspections.length / completedInspections.length) * 100)
      : 100;

  // Calculate defects found today
  const today = new Date().toISOString().split('T')[0];
  const defectsToday = roleFilteredInspections.reduce((acc, curr) => {
    const itemDate = curr.created_at ? curr.created_at.split('T')[0] : '';
    if (itemDate === today) {
      return acc + (curr.defect_count || 0);
    }
    return acc + (curr.defect_count || 0);
  }, 0);

  const pendingReviewCount = roleFilteredInspections.filter(
    (i) => i.status === 'queued' || i.status === 'pending' || i.status === 'needs_review'
  ).length;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <Navbar onOpenUpload={() => setIsUploadModalOpen(true)} />

          <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Header Banner with Welcome & Role Notice */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                  {isSupervisor ? (
                    <span className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" /> Plant-wide Supervisor View
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                      <UserCheck className="w-3.5 h-3.5" /> Quality Engineering Station
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  Welcome back, {currentUser?.username || 'Quality Inspector'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                  {isSupervisor
                    ? 'Monitoring automated inspection yields, cross-team quality metrics, and high-throughput defect detection queues.'
                    : 'Analyze manufacturing parts for surface defects, micro-cracks, and scratches in real time using automated computer vision.'}
                </p>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-sky-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Inspection</span>
                </button>
              </div>
            </div>

            {/* Top Stat Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <StatCard
                title="Total Inspections"
                value={totalInspections}
                subtext={isSupervisor ? 'Team payload count' : 'Your uploaded inspections'}
                icon={Layers}
                variant="blue"
              />

              <StatCard
                title="Pass Rate"
                value={`${passRate}%`}
                subtext={`${passedInspections.length} clean passes verified`}
                icon={CheckCircle2}
                variant="emerald"
                trend={{ value: passRate >= 90 ? 'Optimal' : 'Needs Attention', isPositive: passRate >= 90 }}
              />

              <StatCard
                title="Defects Found Today"
                value={defectsToday}
                subtext="Total bounding box anomalies"
                icon={AlertTriangle}
                variant="rose"
              />

              <StatCard
                title="Pending Review"
                value={pendingReviewCount}
                subtext="Queued in inference pipeline"
                icon={Clock}
                variant="amber"
              />
            </div>

            {/* Split Content Section: Left = Main Inspections, Right = Live Recent Detections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Inspections Section (2 Columns on large screens) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Filter and View Controls Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Role Tabs for Supervisor */}
                    {isSupervisor ? (
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                          onClick={() => setSupervisorTab('all')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            supervisorTab === 'all'
                              ? 'bg-sky-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          All Inspections ({inspections.length})
                        </button>
                        <button
                          onClick={() => setSupervisorTab('mine')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            supervisorTab === 'mine'
                              ? 'bg-sky-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          My Uploads
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Scan className="w-5 h-5 text-sky-400" />
                        <h2 className="text-base font-bold text-slate-100">
                          Inspection Workspace
                        </h2>
                      </div>
                    )}

                    {/* View Switcher & Refresh */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={fetchData}
                        title="Refresh Inspections"
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>

                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'grid'
                              ? 'bg-slate-800 text-sky-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('table')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'table'
                              ? 'bg-slate-800 text-sky-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title="Table View"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search and Status Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-800/80">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by filename or ID..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    {/* Status Filter Dropdown */}
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
                </div>

                {/* Main Inspection Grid / Table */}
                {isLoading && inspections.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs">Loading inspection records...</p>
                  </div>
                ) : displayedInspections.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-sky-400 flex items-center justify-center mx-auto">
                      <Scan className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">No inspections match the filter</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try clearing your search query or upload new image payloads using the upload button.
                    </p>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                    >
                      Upload New Part
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid Layout */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {displayedInspections.map((item) => (
                      <InspectionCard
                        key={item.id}
                        inspection={{
                          id: item.id,
                          image_id: item.image_id,
                          filename: item.filename,
                          filepath: item.filepath,
                          status: item.status,
                          defect_count: item.defect_count,
                          created_at: item.created_at,
                          uploader_username: item.uploader_username,
                        }}
                        onRunAnalysis={handleRunAnalysis}
                        isAnalyzing={analyzingId === item.id}
                      />
                    ))}
                  </div>
                ) : (
                  /* Table Layout */
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
                            <th className="py-3.5 px-4">Date</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {displayedInspections.map((item) => {
                            const isPending = item.status === 'queued' || item.status === 'pending';
                            const isAnalyzing = analyzingId === item.id;
                            const imageUrl = item.filepath
                              ? `${API_BASE_URL}/${item.filepath}`
                              : '/placeholder-defect.png';

                            return (
                              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                                  #{item.id}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imageUrl}
                                      alt={item.filename || 'Part'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-200 max-w-[200px] truncate">
                                  {cleanProductTitle(item.filename)}
                                </td>
                                <td className="py-3.5 px-4">
                                  <StatusBadge status={item.status} defectCount={item.defect_count} size="sm" />
                                </td>
                                <td className="py-3.5 px-4">
                                  {item.defect_count !== undefined && item.defect_count > 0 ? (
                                    <span className="font-bold text-rose-400">{item.defect_count} Defects</span>
                                  ) : item.status === 'completed' ? (
                                    <span className="text-emerald-400 font-medium">0 (Clean)</span>
                                  ) : (
                                    <span className="text-slate-500">Unanalyzed</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                                  {formatTimeAgo(item.created_at)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {isPending ? (
                                    <button
                                      onClick={() => handleRunAnalysis(item.id)}
                                      disabled={isAnalyzing}
                                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 ml-auto disabled:opacity-50"
                                    >
                                      {isAnalyzing ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Running...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                          <span>Run</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <Link
                                      href={`/dashboard/inspections/${item.id}`}
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1"
                                    >
                                      <span>Details</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Recent Detections Panel */}
              <div className="space-y-6">
                <RecentDetectionsPanel onRefreshTrigger={refreshTrigger} />

                {/* Fast Action Card for Batch Processing */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Bulk Processing
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    High-Throughput Batch Inference
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Process multiple queued manufacturing inspection images in bulk through the automated YOLO detection model.
                  </p>
                  <Link
                    href="/dashboard/batch-analyze"
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-indigo-600/30 text-sky-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all"
                  >
                    <span>Open Batch Analyzer</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Global Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadCompleted={() => {
            fetchData();
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
