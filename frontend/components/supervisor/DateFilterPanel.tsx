"use client";

import { useState } from "react";
import { Calendar, Download, RefreshCcw } from "lucide-react";


export function DateFilterPanel() {
  const [activeFilter, setActiveFilter] = useState("Today");
  const [isLoading, setIsLoading] = useState(false);

  const filters = ["Today", "Last 7 Days", "Last Month", "Custom Range"];

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = () => {
    setIsExporting(true);
    
    // Generate real CSV data
    import("@/lib/mock-data").then(({ extensiveReports }) => {
      const headers = ["ID", "Batch ID", "Product", "Date", "Inspector", "Confidence", "Severity", "Status"];
      const rows = extensiveReports.map(r => 
        [r.id, r.batchId, r.product, new Date(r.date).toLocaleDateString(), r.inspector, `${r.confidence.toFixed(1)}%`, r.severity, r.status]
      );
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `visioninspect_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
    });
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm mb-8">
      
      <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <Calendar className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              activeFilter === filter 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full md:w-auto justify-center"
          disabled={isLoading}
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 
          {isLoading ? 'Updating...' : 'Refresh'}
        </button>
        <button 
          onClick={handleExportClick}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-md w-full md:w-auto justify-center disabled:opacity-70"
        >
          <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} /> 
          {isExporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

    </div>
  );
}
