"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/lib/analytics-context';
export function DefectAnalyticsCharts() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
        <div className="h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Defects by Severity</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.defects_by_severity} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis type="number" axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Defects by Shift</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.shift_performance} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="shift" axisLine={false} tickLine={false} dy={10} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="defects" fill="#6366f1" radius={[4, 4, 0, 0]} name="Defects Found" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
