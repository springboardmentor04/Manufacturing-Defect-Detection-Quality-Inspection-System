"use client";

import { motion } from "framer-motion";
import { ReportsTable } from "@/components/supervisor/ReportsTable";
import { ExportCenter } from "@/components/supervisor/ExportCenter";

export default function QualityEngineerReportsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1600px] mx-auto pb-10"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inspection Reports</h1>
        <p className="text-slate-500 mt-1">Export, view, and analyze your detailed inspection reports.</p>
      </div>

      <div className="space-y-6">
        <ExportCenter />
        <ReportsTable />
      </div>
    </motion.div>
  );
}
