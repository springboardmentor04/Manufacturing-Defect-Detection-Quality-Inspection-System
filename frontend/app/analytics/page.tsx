"use client";

import { useEffect, useState, type ReactNode } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { analyticsService } from '@/services/analytics';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Eye, ShieldAlert, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDefectType } from '@/utils/formatters';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6'];

interface ChartItem { name: string; value: number; }
interface TrendItem {
  date: string;
  inspection_volume: number;
  passed: number;
  failed: number;
  review: number;
  rework: number;
  rejected: number;
  defects: number;
  defect_rate: number;
  pass_rate: number;
  average_severity: number;
}
interface AnalyticsData {
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  review_inspections: number;
  rework_inspections: number;
  pass_rate: number;
  fail_rate: number;
  review_rate: number;
  rework_rate: number;
  total_defects: number;
  average_confidence: number;
  critical_defects: number;
  high_severity_defects: number;
  medium_severity_defects: number;
  low_severity_defects: number;
  trends: TrendItem[];
  defects_by_category: ChartItem[];
  defects_by_severity: ChartItem[];
  trend_direction: string;
  average_severity: number;
  recommended_actions: string[];
  major_quality_issues: string[];
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('LAST_7_DAYS');
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        setStats(await analyticsService.getSummary(period) as AnalyticsData);
      } catch (loadError) {
        console.error('Failed to load analytics', loadError);
        setError('Analytics could not be loaded. Check the backend connection and authentication.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manufacturing Quality Analytics</h1>
          <p className="text-slate-500">Production quality trends, defect distributions, and 4-state quality decisions.</p>
        </div>
        <select aria-label="Analytics time period" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODAY">Today</option><option value="LAST_7_DAYS">Last 7 days</option><option value="LAST_30_DAYS">Last 30 days</option>
        </select>
      </div>
      {loading ? <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div> : error || !stats ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error || 'No analytics data available.'}</div> : <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <Metric icon={ClipboardCheck} label="Total Inspections" value={stats.total_inspections} tone="blue" />
          <Metric icon={CheckCircle2} label="PASS" value={`${stats.passed_inspections} (${Number(stats.pass_rate || 0).toFixed(1)}%)`} tone="green" />
          <Metric icon={AlertTriangle} label="FAIL" value={`${stats.failed_inspections} (${Number(stats.fail_rate || 0).toFixed(1)}%)`} tone="red" />
          <Metric icon={Eye} label="REVIEW" value={`${stats.review_inspections ?? 0} (${Number(stats.review_rate || 0).toFixed(1)}%)`} tone="amber" />
          <Metric icon={Target} label="REWORK" value={`${stats.rework_inspections ?? 0} (${Number(stats.rework_rate || 0).toFixed(1)}%)`} tone="blue" />
          <Metric icon={ShieldAlert} label="Avg Confidence" value={`${Number(stats.average_confidence || 0).toFixed(1)}%`} tone="indigo" />
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <SmallMetric label="Critical Defects" value={stats.critical_defects} /><SmallMetric label="High Severity" value={stats.high_severity_defects} /><SmallMetric label="Medium Severity" value={stats.medium_severity_defects} /><SmallMetric label="Low Severity" value={stats.low_severity_defects} />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Quality Decisions Breakdown Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)}/>
                <YAxis allowDecimals={false}/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="passed" fill="#10b981" name="PASS"/>
                <Bar dataKey="failed" fill="#dc2626" name="FAIL"/>
                <Bar dataKey="review" fill="#f59e0b" name="REVIEW"/>
                <Bar dataKey="rework" fill="#3b82f6" name="REWORK"/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Inspection Volume and Defect Rate">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)}/>
                <YAxis yAxisId="left" allowDecimals={false}/>
                <YAxis yAxisId="right" orientation="right" unit="%"/>
                <Tooltip/>
                <Legend/>
                <Line yAxisId="left" type="monotone" dataKey="inspection_volume" stroke="#2563eb" strokeWidth={2} name="Inspection volume"/>
                <Line yAxisId="right" type="monotone" dataKey="defect_rate" stroke="#dc2626" strokeWidth={2} name="Defect rate"/>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Defects by Category">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.defects_by_category.map(item => ({ ...item, displayName: formatDefectType(item.name) }))} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" allowDecimals={false}/>
                <YAxis type="category" dataKey="displayName" width={110}/>
                <Tooltip formatter={(val, name, item) => [val, (item && (item.payload as any)?.name) || name]}/>
                <Bar dataKey="value" fill="#2563eb" name="Defects"/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Defects by Severity">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.defects_by_severity} dataKey="value" nameKey="name" outerRadius={90} label>
                  {stats.defects_by_severity.map((entry: ChartItem, index: number) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="border border-slate-200 bg-white p-5 shadow-sm rounded-lg">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><BarChart3 size={20}/>Operational Quality Insights</h2>
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Defect trend direction:</span> <span className="capitalize font-bold text-slate-900">{stats.trend_direction}</span></p>
              <p><span className="font-semibold">Average severity score:</span> <span className="font-bold text-slate-900">{Number(stats.average_severity || 0).toFixed(1)} / 100</span></p>
              <p><span className="font-semibold">PASS Rate:</span> <span className="font-bold text-emerald-700">{Number(stats.pass_rate || 0).toFixed(1)}%</span></p>
              <p><span className="font-semibold">FAIL Rate:</span> <span className="font-bold text-red-700">{Number(stats.fail_rate || 0).toFixed(1)}%</span></p>
              <p><span className="font-semibold">REVIEW Rate:</span> <span className="font-bold text-amber-700">{Number(stats.review_rate || 0).toFixed(1)}%</span></p>
              <p><span className="font-semibold">REWORK Rate:</span> <span className="font-bold text-blue-700">{Number(stats.rework_rate || 0).toFixed(1)}%</span></p>
              <p><span className="font-semibold">Top recurring defect:</span> <span className="font-bold text-slate-900">{stats.defects_by_category[0]?.name ? formatDefectType(stats.defects_by_category[0].name) : 'None'}</span></p>
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-5 shadow-sm rounded-lg">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><ShieldAlert size={20}/>Recommended Quality Actions</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {stats.recommended_actions.map((action: string) => <li key={action} className="border-l-2 border-blue-500 pl-3">{action}</li>)}
            </ul>
            {stats.major_quality_issues.length > 0 && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{stats.major_quality_issues.join(' ')}</div>}
          </div>
        </div>
      </div>}
    </DashboardLayout>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string | number; tone: string }) { const colors: Record<string, string> = { blue: 'text-blue-600 bg-blue-50', green: 'text-emerald-600 bg-emerald-50', red: 'text-red-600 bg-red-50', amber: 'text-amber-600 bg-amber-50', indigo: 'text-indigo-600 bg-indigo-50' }; return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`rounded-md p-2 ${colors[tone]}`}><Icon size={18}/></span></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></div>; }
function SmallMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-800">{value}</p></div>; }
function ChartCard({ title, children }: { title: string; children: ReactNode }) { return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-800">{title}</h2><div className="h-72">{children}</div></div>; }
