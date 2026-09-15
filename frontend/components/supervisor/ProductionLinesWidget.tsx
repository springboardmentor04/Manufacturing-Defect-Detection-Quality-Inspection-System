"use client";

import { Activity, AlertTriangle, Settings2, TrendingUp, TrendingDown } from "lucide-react";
import { productionLines } from "@/lib/mock-data";

export function ProductionLinesWidget() {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 h-full flex flex-col">
      <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-500" /> Real-time Line Status
      </h3>
      
      <div className="space-y-4 flex-1">
        {productionLines.map((line) => (
          <div key={line.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{line.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  {line.status === "Running" ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Running</span>
                    </>
                  ) : (
                    <>
                      <Settings2 className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Maintenance</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{line.output.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span></p>
                <p className="text-xs text-red-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                  <AlertTriangle className="w-3 h-3" /> {line.defects} defects
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${line.efficiency > 90 ? 'bg-emerald-500' : line.efficiency > 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${line.efficiency}%` }}
                ></div>
              </div>
              <div className="flex items-center gap-1 w-12 justify-end">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{line.efficiency}%</span>
                {line.trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
