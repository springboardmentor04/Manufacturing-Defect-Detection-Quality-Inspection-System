import React from 'react';
import { MOCK_ANALYTICS_STATS } from '../data/mockData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  BarChart3, ShieldCheck, TrendingUp, PieChart as PieIcon, Sliders, Users, Activity, CheckCircle2 
} from 'lucide-react';

export const SupervisorDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Supervisor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              FACTORY SUPERVISOR EXECUTIVE SUITE
            </span>
            <span className="text-xs text-slate-500 font-mono">• Plant Management Overview</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Manufacturing Analytics & Plant Telemetry
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            High-level defect trends, AI model accuracy, automated quality threshold rules, and personnel activity logs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Analytics Engine: Active</span>
        </div>
      </div>

      {/* Supervisor Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">AI Model Accuracy</span>
          <div className="text-xl font-bold text-blue-600 mt-1 font-mono">{MOCK_ANALYTICS_STATS.aiAccuracy}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">ResNet50 / YOLOv8</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Detection Precision</span>
          <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">{MOCK_ANALYTICS_STATS.precision}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Low False Positives</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Model Recall</span>
          <div className="text-xl font-bold text-indigo-600 mt-1 font-mono">{MOCK_ANALYTICS_STATS.recall}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Zero Critical Misses</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">F1-Score</span>
          <div className="text-xl font-bold text-amber-600 mt-1 font-mono">{MOCK_ANALYTICS_STATS.f1Score}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Harmonic Mean</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-500">mAP Score</span>
          <div className="text-xl font-bold text-rose-600 mt-1 font-mono">{MOCK_ANALYTICS_STATS.mAP}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">IoU @ 0.50:0.95</div>
        </div>

      </div>

      {/* Production Yield Trend & Defect Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hourly Yield Trend Line Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Hourly Production Yield & Inspection Volume
              </h2>
              <p className="text-xs text-slate-500">Passed vs Defective product throughput</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ANALYTICS_STATS.hourlyYieldTrend}>
                <defs>
                  <linearGradient id="colorPassedLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailedLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="passed" name="Passed Products" stroke="#10b981" fillOpacity={1} fill="url(#colorPassedLight)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Defective (Failed)" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailedLight)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Category Pie Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              Defect Category Distribution
            </h2>
            <p className="text-xs text-slate-500">Root cause breakdown</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_ANALYTICS_STATS.defectBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {MOCK_ANALYTICS_STATS.defectBreakdown.map((entry, index) => (
                    <Cell key={`cell-light-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {MOCK_ANALYTICS_STATS.defectBreakdown.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Supervisor Quality Rules Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Plant Quality Threshold Rules & Auto-Rework Configuration
          </h2>
          <p className="text-xs text-slate-500">Supervisor rule controls for line automation</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-slate-800 font-bold">
              <span>Confidence Threshold:</span>
              <span className="text-blue-600">90.0%</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Detections under 90% confidence trigger engineer review.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-slate-800 font-bold">
              <span>Critical Severity Cutoff:</span>
              <span className="text-rose-600">80 / 100</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Scores ≥ 80 trigger automated conveyor line stoppage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-slate-800 font-bold">
              <span>Rework Auto-Routing:</span>
              <span className="text-amber-600">ACTIVE</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Medium severity flaws auto-route to rework line.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
