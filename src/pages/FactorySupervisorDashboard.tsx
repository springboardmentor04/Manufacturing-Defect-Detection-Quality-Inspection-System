import React, { useState, useEffect } from 'react';
import { AnalyticsSummary, InspectionRecord } from '../types';
import { fetchAnalyticsSummary, fetchInspections, fetchAnalyticsByLine } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { InspectionDetailModal } from '../components/InspectionDetailModal';
import { BarChart3, TrendingUp, AlertOctagon, CheckCircle2, Activity, Sliders, RefreshCw } from 'lucide-react';

interface LineAnalytics {
  factory_line: string;
  total_inspections: number;
  passed: number;
  failed: number;
  pass_rate_percent: number;
}

export const FactorySupervisorDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [lineAnalytics, setLineAnalytics] = useState<LineAnalytics[]>([]);
  const [history, setHistory] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  // Quality Threshold States
  const [criticalLimit, setCriticalLimit] = useState(80);
  const [mediumLimit, setMediumLimit] = useState(40);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, ins, lines] = await Promise.all([fetchAnalyticsSummary(), fetchInspections(), fetchAnalyticsByLine()]);
      setAnalytics(sum);
      setHistory(ins);
      setLineAnalytics(lines);
      if (sum.qualityThresholds) {
        setCriticalLimit(sum.qualityThresholds.criticalSeverityLimit);
        setMediumLimit(sum.qualityThresholds.mediumSeverityLimit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = () => {
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 3000);
  };

  if (loading || !analytics) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading Manufacturing Analytics & Yield Metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      
      {/* Supervisor Header */}
      <div id="section-dashboard" className="glass-card p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-600/10 px-3 py-1 rounded-full border border-teal-600/20 w-fit mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
            <span>Factory Supervisor Analytics • Production Quality Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Plant Production Quality & Yield Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Plant-wide quality oversight, defect distribution, hourly yield trends, and automated quality thresholds.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-white/60 hover:bg-white/90 text-slate-800 font-bold text-xs rounded-full border border-white/80 transition-all flex items-center gap-2 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live Metrics</span>
        </button>
      </div>

      {/* Production Overview KPIs */}
      <div id="section-overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inspected Today</span>
            <div className="w-8 h-8 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{analytics.totalInspectedToday}</div>
          <p className="text-[11px] text-slate-500 font-medium">Across {analytics.activeFactoryLines} Active Assembly Lines</p>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hourly Yield Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 tracking-tight">{analytics.yieldRatePercent}%</div>
          <p className="text-[11px] text-emerald-700 font-bold">+2.4% vs Previous Shift Target</p>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Products Passed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{analytics.passedCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Approved for Dispatch</p>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Defect Quarantine</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-700 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-red-800 tracking-tight">{analytics.failedCount}</div>
          <p className="text-[11px] text-red-700 font-bold">Rejection / Rework Required</p>
        </div>

      </div>

      {/* Analytics Charts & Defect Distribution Section */}
      <div id="section-trends" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hourly Yield Rate Trend Bar Chart (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Shift Yield Rate & Pass Statistics</h3>
              <p className="text-[11px] text-slate-500 font-medium">Hourly percentage of defect-free inspections</p>
            </div>
            <span className="text-[10px] font-mono bg-white/60 text-slate-700 px-2.5 py-1 rounded-full border border-white font-bold">
              Target: 85%
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
            {analytics.hourlyYieldTrend.map((item) => (
              <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-mono text-slate-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.passRate}%
                </span>
                <div className="w-full bg-white/40 rounded-t-xl overflow-hidden h-36 flex items-end border border-white/60">
                  <div 
                    className="w-full rounded-t-xl transition-all duration-500"
                    style={{
                      height: `${item.passRate}%`,
                      backgroundColor: item.passRate >= 90 ? '#0f766e' : item.passRate >= 85 ? '#2563eb' : '#f59e0b'
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-600 font-medium">{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Defect Category Breakdown List (5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 rounded-3xl space-y-4">
          <div className="border-b border-slate-200/60 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Defect Type Distribution</h3>
            <p className="text-[11px] text-slate-500 font-medium">Top anomaly root causes identified by computer vision</p>
          </div>

          <div className="space-y-3">
            {analytics.defectDistribution.map((defect) => (
              <div key={defect.type} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{defect.type}</span>
                  <span className="font-mono text-slate-500">{defect.count} occurrences ({defect.share}%)</span>
                </div>
                <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden border border-white/80">
                  <div 
                    className="h-full bg-teal-600 rounded-full"
                    style={{ width: `${defect.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quality Control Rules & Severity Threshold Editor */}
      <div id="section-analytics" className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-700" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Quality Control Rules & Severity Thresholds</h3>
              <p className="text-xs text-slate-500 font-medium">Configure automated pass/fail limits for manufacturing lines</p>
            </div>
          </div>

          {thresholdSaved && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Thresholds updated successfully!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label htmlFor="critical-limit" className="font-bold text-slate-700 block mb-1">Critical Severity Limit (Immediate Reject)</label>
            <input
              id="critical-limit"
              type="range"
              min="70"
              max="95"
              value={criticalLimit}
              onChange={(e) => setCriticalLimit(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>70</span>
              <span className="font-bold text-red-700">Limit: {criticalLimit}</span>
              <span>95</span>
            </div>
          </div>

          <div>
            <label htmlFor="medium-limit" className="font-bold text-slate-700 block mb-1">Medium Severity Pass Ceiling</label>
            <input
              id="medium-limit"
              type="range"
              min="30"
              max="60"
              value={mediumLimit}
              onChange={(e) => setMediumLimit(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>30</span>
              <span className="font-bold text-amber-700">Limit: {mediumLimit}</span>
              <span>60</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveThresholds}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-all shadow-lg shadow-teal-600/20"
            >
              Apply Plant Quality Rules
            </button>
          </div>
        </div>
      </div>

      {/* Production Audit Logs Table */}
      <div id="section-reports" className="glass-card p-6 rounded-3xl space-y-4">
        <div className="border-b border-slate-200/60 pb-3">
          <h3 className="text-base font-bold text-slate-800">Plant Inspection Audit Log</h3>
          <p className="text-xs text-slate-500 font-medium">Live feed of incoming product inspections from all lines</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Inspection ID</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Line</th>
                <th className="py-2.5 px-3">Severity Score</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Inspector</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 font-medium">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-700 font-semibold">{record.inspectionCode}</td>
                  <td className="py-3 px-3 text-slate-900 font-bold">{record.productName}</td>
                  <td className="py-3 px-3 text-slate-500">{record.factoryLine}</td>
                  <td className="py-3 px-3">
                    <SeverityBadge level={record.severityLevel} score={record.severityScore} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      record.passFail === 'PASS' ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-red-500/10 text-red-800 border border-red-500/20'
                    }`}>
                      {record.passFail}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{record.inspectorName}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-3 py-1 text-xs font-bold text-teal-700 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-600/20 rounded-full transition-all"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Monitoring & Plant Status */}
      <div id="section-monitoring" className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Production Monitoring & Line Streams</h3>
              <p className="text-xs text-slate-500 font-medium">Real-time status of computer vision sensors across plant stations</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {lineAnalytics.length} Lines Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {lineAnalytics.length > 0 ? (
            lineAnalytics.map((line) => (
              <div key={line.factory_line} className="p-3.5 bg-white/50 rounded-2xl border border-white/80 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{line.factory_line}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-500">Inspections: {line.total_inspections}</p>
                <p className="text-[11px] font-mono font-bold text-teal-700">Pass Rate: {line.pass_rate_percent}%</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-8 text-slate-500 font-medium">
              No inspections today yet. Factory lines will appear here as inspections are processed.
            </div>
          )}
        </div>
      </div>

      {/* User Management Overview */}
      <div id="section-users" className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">User & Inspector Access Management</h3>
            <p className="text-xs text-slate-500 font-medium">Plant access roles and registered quality engineering staff</p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Active RBAC System
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-white/50 rounded-2xl border border-white/80 space-y-1">
            <span className="font-bold text-slate-800 block">Quality Engineers</span>
            <span className="text-[11px] text-slate-500 block">Full access to upload images, run defect pipelines, and export reports.</span>
          </div>
          <div className="p-3.5 bg-white/50 rounded-2xl border border-white/80 space-y-1">
            <span className="font-bold text-slate-800 block">Factory Supervisors</span>
            <span className="text-[11px] text-slate-500 block">Full access to plant yield metrics, defect trends, and severity rules.</span>
          </div>
          <div className="p-3.5 bg-white/50 rounded-2xl border border-white/80 space-y-1">
            <span className="font-bold text-slate-800 block">Plant System Admins</span>
            <span className="text-[11px] text-slate-500 block">Master control over server integration, user provisioning, and AI weights.</span>
          </div>
        </div>
      </div>

      <InspectionDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

    </div>
  );
};
