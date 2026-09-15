"use client";

import { Activity, AlertTriangle, Settings2, PowerOff, Zap } from "lucide-react";
import { useAnalytics } from "@/lib/analytics-context";

export function EnhancedProductionLines() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.production_lines.map((line) => (
        <div key={line.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{line.name}</h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                {line.status === "Running" ? (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold border border-emerald-200/50 dark:border-emerald-900/50">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Running
                  </span>
                ) : line.status === "Maintenance" ? (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-xs font-semibold border border-amber-200/50 dark:border-amber-900/50">
                    <Settings2 className="w-3 h-3" /> Maintenance
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-xs font-semibold border border-slate-200 dark:border-slate-700">
                    <PowerOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
            </div>
            <Activity className={`w-6 h-6 ${line.status === 'Running' ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold mb-0.5 uppercase tracking-wide">Output</p>
              <p className="font-bold text-slate-900 dark:text-white text-lg">{line.output.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-0.5 uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Defects</p>
              <p className="font-bold text-red-700 dark:text-red-400 text-lg">{line.defects}</p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500"/> Efficiency</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{line.efficiency}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${line.efficiency > 90 ? 'bg-emerald-500' : line.efficiency > 70 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                  style={{ width: `${line.efficiency}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">Machine Health</span>
              <span className={`text-xs font-bold ${line.status === 'Running' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {line.status === 'Running' ? 'Optimal' : 'Needs Attention'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
