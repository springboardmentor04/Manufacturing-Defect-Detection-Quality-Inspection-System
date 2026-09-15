"use client";

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { useAnalytics } from '@/lib/analytics-context';

export function SupervisorCharts() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="h-[350px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
        <div className="h-[350px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  // Transform daily stats for area chart
  const trendData = data.daily_stats.map(stat => ({
    date: stat.date,
    inspected: stat.total,
    defects: stat.failed
  }));

  const defectCategories = data.defects_by_category || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Inspection Trend</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInspected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="inspected" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorInspected)" name="Total Inspected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Top Defect Categories</h3>
        <div className="h-[250px] w-full flex items-center">
          {defectCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={defectCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {defectCategories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-1/2 pl-4 space-y-3">
                {defectCategories.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-slate-600 dark:text-slate-300">{cat.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{cat.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 italic">
              No defect data available for this period.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
