"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Trash2, Clock, AlertCircle, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { DetectionPreview } from "@/components/dashboard/DetectionPreview";
import { getApiBaseUrl } from "@/lib/api";

type Inspection = {
  inspection_id: string;
  dataset_category: string;
  engineer_name: string;
  employee_id: string;
  status: string;
  upload_time: string;
  source: string;
  ai_status?: string;
  inspection_result?: string;
  confidence?: number;
  defect_type?: string;
  severity?: string;
  completed_at?: string;
  processing_time?: number;
  bounding_boxes?: number[][];
  segmentation_masks?: number[][][];
};

export default function HistoryPage() {
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("newest");
  
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{name: string}[]>([]);

  const fetchCategories = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/dataset/categories`);
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const baseUrl = getApiBaseUrl();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort,
      });
      
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category", categoryFilter);
      
      const res = await fetch(`${baseUrl}/api/v1/inspections?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setInspections(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, categoryFilter, sort]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/inspections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchInspections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetails = async (id: string) => {
    // Fetch full details for the modal
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/inspections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedInspection(await res.json());
      } else {
        const fallback = inspections.find(item => item.inspection_id === id);
        if (fallback) setSelectedInspection(fallback as any);
      }
    } catch (err) {
      console.error("Failed to fetch inspection details", err);
      const fallback = inspections.find(item => item.inspection_id === id);
      if (fallback) setSelectedInspection(fallback as any);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> COMPLETED</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3 animate-spin"/> PROCESSING</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> FAILED</span>;
      default:
        return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> PENDING</span>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <ClientOnly>
      {/* Modal for Concise Overview */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedInspection(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/10 hover:bg-black/20 text-slate-900 dark:text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-y-auto">
              <DetectionPreview data={selectedInspection} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto pb-12 pt-6 px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inspection History</h1>
            <p className="text-slate-500 mt-1">Manage and view your past inspection records.</p>
          </div>
          <Link 
            href="/dashboard/engineer/new-inspection" 
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
          >
            + New Inspection
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full lg:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ID, Employee, Category..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            
            <select 
              value={categoryFilter} 
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none capitalize"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name.replace('_', ' ')}</option>)}
            </select>
            
            <select 
              value={sort} 
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-semibold">Inspection ID</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Engineer</th>
                  <th className="px-6 py-4 font-semibold">Upload Time</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 animate-spin" /> Loading inspections...
                      </div>
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Search className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No inspections found</h3>
                      <p className="text-slate-500">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  inspections.map((ins, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={ins.inspection_id} 
                      className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{ins.inspection_id}</span>
                      </td>
                      <td className="px-6 py-4 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {ins.dataset_category.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{ins.engineer_name}</div>
                        <div className="text-xs text-slate-500">{ins.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(ins.upload_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(ins.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleViewDetails(ins.inspection_id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Overview"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(ins.inspection_id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!isLoading && inspections.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/50">
              <div className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900 dark:text-white">{(page - 1) * limit + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-900 dark:text-white">{total}</span> results
              </div>
              
              <div className="flex items-center gap-4">
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 text-sm font-medium">Page {page} of {totalPages}</div>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </ClientOnly>
  );
}
