"use client";

import { teamPerformance } from "@/lib/mock-data";
import { Users, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export function TeamPerformanceTable() {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-blue-500"/> Team Performance</h3>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              className="w-full sm:w-48 pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Inspections</th>
              <th className="px-6 py-4">Accuracy</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {teamPerformance.map((emp, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                  <div className="text-xs text-slate-500">{emp.id}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{emp.role}</td>
                <td className="px-6 py-4 font-bold">{emp.inspections.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{emp.accuracy}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", 
                    emp.status === 'Active' ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-400" : "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {emp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
