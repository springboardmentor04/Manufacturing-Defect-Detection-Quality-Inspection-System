"use client";

import { defectTrends, defectCategories } from "@/lib/mock-data";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell
} from "recharts";
import { Download } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <Download className="w-4 h-4" /> Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px]">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Defect Trends (YTD)</h2>
            <p className="text-sm text-slate-500">Monthly breakdown of detected defects vs total inspected</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={defectTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="defects" name="Defects Found" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="inspected" name="Total Inspected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px]">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Defect Distribution by Category</h2>
            <p className="text-sm text-slate-500">Breakdown of specific defect types</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectCategories} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {defectCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
