"use client";

import { motion } from "framer-motion";
import { Package, CheckCircle, XCircle, ShieldCheck, Activity, Cpu, Clock, Factory } from "lucide-react";
import { useAnalytics } from "@/lib/analytics-context";

export function SupervisorKPIs() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        {Array(8).fill(0).map((_, idx) => (
          <div key={idx} className="h-28 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  const { kpis } = data;

  const passedCount = Math.round(kpis.total_inspections * (kpis.pass_rate / 100));
  const failedCount = kpis.total_inspections - passedCount;

  const kpiData = [
    { title: "Total Inspections", val: kpis.total_inspections.toLocaleString(), icon: Package, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Products Passed", val: passedCount.toLocaleString(), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
    { title: "Products Failed", val: failedCount.toLocaleString(), icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
    { title: "Overall Quality", val: `${kpis.pass_rate}%`, icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { title: "Processing/Pending", val: kpis.processing.toLocaleString(), icon: Activity, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
    { title: "Critical Defects", val: kpis.critical_defects.toLocaleString(), icon: Factory, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { title: "Avg AI Confidence", val: `94.2%`, icon: Cpu, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
    { title: "Avg Inspect Time", val: "1.4s", icon: Clock, color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/30" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
      {kpiData.map((kpi, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color} w-max mb-3`}>
            <kpi.icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{kpi.val}</h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-1">{kpi.title}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
