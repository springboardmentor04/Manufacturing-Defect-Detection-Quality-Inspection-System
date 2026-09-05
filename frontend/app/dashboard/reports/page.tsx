'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SeverityBadge from '@/components/SeverityBadge';
import {
  getQualitySummaryReport,
  exportQualitySummaryCsv,
  getInspections,
  getErrorMessage,
  QualitySummaryReport,
  InspectionListItem,
} from '@/lib/api';
import { cleanProductTitle } from '@/components/InspectionCard';
import {
  FileBarChart2,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Activity,
  Layers,
  ArrowRight,
  Filter,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function QualityReportsPage() {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [summary, setSummary] = useState<QualitySummaryReport | null>(null);
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, inspRes] = await Promise.all([
        getQualitySummaryReport(startDate, endDate),
        getInspections(),
      ]);
      setSummary(sumRes);
      
      // Filter itemized list by date range on client for table view
      const startMs = new Date(startDate).setHours(0, 0, 0, 0);
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);
      const filtered = (inspRes || []).filter((i) => {
        const itemMs = new Date(i.created_at).getTime();
        return itemMs >= startMs && itemMs <= endMs;
      });
      setInspections(filtered);
    } catch (err: any) {
      console.error('Error fetching quality summary report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await exportQualitySummaryCsv(startDate, endDate);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quality_summary_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${getErrorMessage(err, 'Failed to download CSV')}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full overflow-y-auto">
            {/* Header & Export Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <FileBarChart2 className="w-4 h-4" /> Quality Assurance & Compliance
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  Quality Summary Report
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Analyze manufacturing batch yields, pass/fail thresholds, and export compliance audit logs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Refresh Report"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={isExporting || isLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export as CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Date Range Picker & Preset Selector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Date Range:</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold uppercase">Presets:</span>
                <button
                  onClick={() => handlePreset(7)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePreset(30)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  30 Days
                </button>
                <button
                  onClick={() => handlePreset(90)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  90 Days
                </button>
              </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Inspections */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Inspections</span>
                  <Layers className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-100 font-mono">
                    {summary?.total_inspections ?? '—'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Processed in window</p>
                </div>
              </div>

              {/* Pass Rate % */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {summary?.pass_rate_percent !== undefined ? `${summary.pass_rate_percent}%` : '—'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary?.total_passed ?? 0} Passed / {summary?.total_failed ?? 0} Failed
                  </p>
                </div>
              </div>

              {/* Total Defects */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Defects</span>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {summary?.total_defects_found ?? '—'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Anomalies localized</p>
                </div>
              </div>

              {/* Most Common Defect */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Top Defect</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-400 capitalize truncate" title={summary?.most_common_defect_type || 'None'}>
                    {summary?.most_common_defect_type || 'None'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Highest incidence</p>
                </div>
              </div>

              {/* Average Severity Score */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Avg Severity</span>
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-orange-400 font-mono">
                    {summary?.avg_severity_score ?? '0.0'}
                  </div>
                  <div className="mt-1">
                    <SeverityBadge
                      score={summary?.avg_severity_score}
                      level={
                        (summary?.avg_severity_score || 0) >= 80
                          ? 'Critical'
                          : (summary?.avg_severity_score || 0) >= 60
                          ? 'High'
                          : (summary?.avg_severity_score || 0) >= 40
                          ? 'Medium'
                          : 'Low'
                      }
                      size="sm"
                      showScore={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Audit Log Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-slate-100 text-base">
                    Inspections in Window ({inspections.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {startDate} &rarr; {endDate}
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Compiling quality telemetry records...</p>
                </div>
              ) : inspections.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="font-bold text-slate-200 text-sm">No Inspections Found</h4>
                  <p className="text-xs text-slate-500">
                    No inspection records were logged within the selected date window.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Component File</th>
                        <th className="py-3 px-4">Inspection Date</th>
                        <th className="py-3 px-4">QC Decision</th>
                        <th className="py-3 px-4">Defect Count</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inspections.map((insp) => {
                        const isPass = insp.decision === 'pass' || (insp.status === 'completed' && (insp.defect_count || 0) === 0);
                        const isFail = insp.decision === 'fail' || (insp.defect_count || 0) > 0;
                        return (
                          <tr key={insp.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                              #{insp.id}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-200">
                              {cleanProductTitle(insp.filename || 'Part')}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(insp.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              {isPass ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>PASS</span>
                                </span>
                              ) : isFail ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>FAIL</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <span>PENDING</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {insp.defect_count || 0} defects
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/dashboard/inspections/${insp.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-sky-500/10 text-sky-400 border border-slate-700 hover:border-sky-500/40 rounded-lg text-xs font-semibold transition-all"
                              >
                                <span>Inspect</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
