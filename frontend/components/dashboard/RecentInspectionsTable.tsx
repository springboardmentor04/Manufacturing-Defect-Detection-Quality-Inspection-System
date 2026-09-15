"use client";

import { useState } from "react";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

export type Inspection = {
  inspection_id: string;
  dataset_category: string;
  status: string;
  upload_time: string;
  inspection_result?: string;
  confidence?: number;
  defect_type?: string;
  defect_category?: string;
  severity?: string;
};


export function RecentInspectionsTable({ data }: { data: Inspection[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const filteredData = data.filter(item => {
    const matchesSearch = item.dataset_category.toLowerCase().includes(searchTerm.toLowerCase()) || item.inspection_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || item.inspection_result === filterStatus || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg">Recent Inspections</h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ID or Product..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="All">All Status</option>
            <option value="PASS">Passed</option>
            <option value="FAIL">Failed</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
          </select>
          
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Inspection ID</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Product Name</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Status</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Defect / Category</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Confidence</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Severity</th>
              <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredData.length > 0 ? (
              filteredData.map((item, idx) => (
                <tr key={idx} onClick={() => router.push(`/dashboard/engineer/history/${item.inspection_id}`)} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-mono font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.inspection_id}</td>
                  <td className="px-6 py-4 capitalize">{item.dataset_category.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", 
                      item.inspection_result === 'PASS' || item.status === 'Completed' ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                      item.inspection_result === 'FAIL' || item.status === 'Failed' ? "border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400" : 
                      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-400"
                    )}>
                      {item.inspection_result || item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {item.defect_type ? (
                      <div className="flex flex-col">
                        <span>{item.defect_type}</span>
                        {item.defect_category && <span className="text-xs text-slate-400">{item.defect_category}</span>}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono">{item.confidence ? `${item.confidence}%` : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-medium px-2 py-1 rounded border", 
                      item.severity?.toUpperCase() === 'CRITICAL' ? "border-red-200 text-red-600 bg-red-50 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400" : 
                      item.severity?.toUpperCase() === 'HIGH' ? "border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400" : 
                      item.severity?.toUpperCase() === 'MEDIUM' ? "border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400" :
                      "border-slate-200 text-slate-500 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {item.severity || 'None'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs" suppressHydrationWarning>
                    {new Date(item.upload_time).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 text-slate-300 mb-2" />
                    <p>No inspections found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
        <span className="text-sm text-slate-500">Showing 1 to {filteredData.length} of {filteredData.length} entries</span>
        <div className="flex gap-1">
          <button className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium">1</button>
          <button className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
