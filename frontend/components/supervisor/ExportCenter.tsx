"use client";

import { useState } from "react";
import { Download, Mail, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAnalytics } from "@/lib/analytics-context";

export function ExportCenter() {
  const { data } = useAnalytics();
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const exports = [
    { title: "Production Summary (PDF)", icon: FileText, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-900/50" },
    { title: "Quality Analytics (Excel)", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-900/50" },
    { title: "Defect Report (CSV)", icon: Download, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-900/50" },
    { title: "Email Executive Summary", icon: Mail, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-900/50" },
  ];

  const handleExport = (idx: number) => {
    setExportingId(idx);
    
    // Simulate slight delay for realism
    setTimeout(() => {
      if (idx === 0) {
        // PDF Export -> Use browser print to PDF
        window.print();
      } 
      else if (idx === 1 || idx === 2) {
        // Excel/CSV Export -> Generate Real CSV from data
        if (!data) {
           setExportingId(null);
           return;
        }
        let csvContent = "";
        
        if (idx === 1) { // Quality Analytics
          const headers = ["Date", "Total", "Passed", "Failed", "Pass Rate"];
          const rows = data.daily_stats.map(r => {
            const passRate = r.total > 0 ? ((r.passed / r.total) * 100).toFixed(1) : 0;
            return [r.date, r.total, r.passed, r.failed, `${passRate}%`];
          });
          csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        } else { // Defect Report
          const headers = ["Severity Level", "Defect Count"];
          const rows = data.defects_by_severity.map(r => [r.name, r.value]);
          csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `visioninspect_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      else if (idx === 3) {
        // Email Summary
        const subject = encodeURIComponent("VisionInspect Factory Summary");
        const body = encodeURIComponent("Attached is the daily production summary and quality metrics for the factory floor.");
        window.location.href = `mailto:admin@factory.com?subject=${subject}&body=${body}`;
      }

      setExportingId(null);
      setSuccessId(idx);
      setTimeout(() => setSuccessId(null), 2000);
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {exports.map((item, i) => {
        const isExporting = exportingId === i;
        const isSuccess = successId === i;
        
        return (
          <motion.button
            key={i}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport(i)}
            disabled={isExporting || isSuccess}
            className={`flex items-center gap-4 p-4 rounded-2xl border ${item.bg} ${item.border} text-left transition-colors`}
          >
            <div className={`p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm ${isSuccess ? 'text-emerald-500' : item.color}`}>
              {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <item.icon className={`w-5 h-5 ${isExporting ? 'animate-pulse' : ''}`} />}
            </div>
            <span className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
              {isExporting ? "Exporting..." : isSuccess ? "Success!" : item.title}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
