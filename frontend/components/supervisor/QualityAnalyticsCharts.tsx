"use client";

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/lib/analytics-context';

export function QualityAnalyticsCharts() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
        <div className="h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  // Transform daily stats to percentages for quality analytics
  const qualityData = data.daily_stats.map(stat => {
    const total = stat.total || 1; // avoid division by zero
    const passRate = (stat.passed / total) * 100;
    const failRate = (stat.failed / total) * 100;
    return {
      date: stat.date,
      passRate: parseFloat(passRate.toFixed(1)),
      failRate: parseFloat(failRate.toFixed(1)),
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Daily Pass Rate</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData} margin={{ left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Overall Pass Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Daily Fail Rate Trend</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={qualityData} margin={{ left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="failRate" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorScrap)" name="Fail Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
