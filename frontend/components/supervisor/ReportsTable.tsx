"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, FileText, Printer, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";

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
};

export function ReportsTable() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchInspections = useCallback(async () => {
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inspections?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setInspections(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
    
    // Auto refresh every 10 seconds to catch new inspections
    const interval = setInterval(() => {
      fetchInspections();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchInspections]);

  const filtered = inspections.filter(r => {
    const matchesSearch = 
      r.inspection_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.dataset_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.engineer_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const statusMatch = statusFilter === "All" || r.status === statusFilter;
    return matchesSearch && statusMatch;
  });

  const exportCSV = () => {
    const headers = ["Inspection ID", "Category", "Upload Date", "Inspector", "Confidence", "Severity", "Status"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(r => [
        r.inspection_id,
        r.dataset_category,
        new Date(r.upload_time).toLocaleDateString(),
        r.engineer_name,
        r.confidence ? `${r.confidence.toFixed(1)}` : "N/A",
        r.severity || "N/A",
        r.status
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inspection_reports.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDetails = (id: string) => {
    // Navigate to the history details page which works for supervisors too due to backend roles
    router.push(`/dashboard/engineer/history/${id}`);
  };

  return (
    <ClientOnly>
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" /> Inspection Reports
        </h3>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ID, Category, Inspector..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-64 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[120px]"
          >
            <option value="All">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
          </select>
          <div className="flex gap-2">
            <button onClick={fetchInspections} className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Refresh">
              <RefreshCw className={cn("w-4 h-4 text-slate-600 dark:text-slate-300", isLoading && "animate-spin")} />
            </button>
            <button onClick={exportCSV} className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Download CSV">
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button onClick={() => window.print()} className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Print to PDF">
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Inspection ID</th>
              <th className="px-6 py-4">Batch ID</th>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Inspector</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading && inspections.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">No inspections found.</td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr 
                  key={item.inspection_id} 
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                  onClick={() => openDetails(item.inspection_id)}
                >
                  <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{item.inspection_id}</td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">-</td>
                  <td className="px-6 py-4 font-medium capitalize">{item.dataset_category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-slate-500" suppressHydrationWarning>{new Date(item.upload_time).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.engineer_name}</td>
                  <td className="px-6 py-4 font-mono">{item.confidence ? `${item.confidence.toFixed(1)}%` : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-bold", 
                      item.severity === 'Critical' ? "text-red-600" : 
                      item.severity === 'High' ? "text-amber-500" : "text-slate-400"
                    )}>{item.severity || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.status === 'Completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                      item.status === 'Failed' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDetails(item.inspection_id); }}
                      className="inline-block p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </ClientOnly>
  );
}
