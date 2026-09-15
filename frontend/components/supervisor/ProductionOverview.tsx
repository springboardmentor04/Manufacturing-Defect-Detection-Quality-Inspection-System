"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAnalytics } from "@/lib/analytics-context";
import { Target, TrendingUp, AlertOctagon } from 'lucide-react';

export function ProductionOverview() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 flex flex-col h-full">
        <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" /> Production Overview
        </h3>
        <div className="flex-1 min-h-[300px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  const { kpis, daily_stats } = data;
  const passedCount = Math.round(kpis.total_inspections * (kpis.pass_rate / 100));
  const failedCount = kpis.total_inspections - passedCount;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 flex flex-col h-full">
      <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500" /> Production Overview
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Total Production</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.total_inspections.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-emerald-500"/> Target vs Actual</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.pass_rate}%</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Passed Units</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{passedCount.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
          <p className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> Rejected Units</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{failedCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily_stats} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              cursor={{ fill: 'transparent' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {daily_stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={'#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
