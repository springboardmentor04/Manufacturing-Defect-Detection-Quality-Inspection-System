"use client";

import { useAnalytics } from "@/lib/analytics-context";
import { Users, Clock } from "lucide-react";

export function ShiftPerformance() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 h-full">
        <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Shift Performance
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 h-full">
      <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" /> Shift Performance
      </h3>
      
      <div className="space-y-4">
        {data.shift_performance.map((shift, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{shift.shift} Shift</h4>
                <p className="text-xs text-slate-500 mt-0.5">Automated Analysis</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{shift.inspections.toLocaleString()}</p>
                <p className="text-xs text-slate-500">units</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2 text-center border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Quality</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{Math.round(shift.efficiency)}%</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 text-center border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-1">Defects</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{shift.defects}</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                <p className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Time</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">1.4s</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
