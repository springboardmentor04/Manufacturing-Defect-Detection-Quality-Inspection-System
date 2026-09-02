import React from 'react';
import { MOCK_ANALYTICS_STATS } from '../data/mockData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, BarChart3, PieChart as PieIcon, ShieldCheck, Activity, Award, Cpu, Sliders 
} from 'lucide-react';

export const ManufacturingAnalytics = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-industrial-900 border border-industrial-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
              FACTORY SUPERVISOR SUITE
            </span>
            <span className="text-xs text-industrial-400 font-mono">Module 7: Manufacturing Analytics</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Manufacturing Defect & Production Analytics
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-industrial-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emeraldGlow-500 animate-pulse"></span>
          <span>Analytics Engine: Active</span>
        </div>
      </div>

      {/* Metric Cards Row 1: AI Model Telemetry */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        
        <div className="p-3.5 rounded-xl bg-industrial-900 border border-industrial-800">
          <span className="text-[11px] font-semibold text-industrial-400">AI Model Accuracy</span>
          <div className="text-xl font-black text-cyanGlow-300 mt-1 font-mono">{MOCK_ANALYTICS_STATS.aiAccuracy}%</div>
          <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">ResNet / YOLOv8</div>
        </div>

        <div className="p-3.5 rounded-xl bg-industrial-900 border border-industrial-800">
          <span className="text-[11px] font-semibold text-industrial-400">Detection Precision</span>
          <div className="text-xl font-black text-emeraldGlow-400 mt-1 font-mono">{MOCK_ANALYTICS_STATS.precision}%</div>
          <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">Low False Positives</div>
        </div>

        <div className="p-3.5 rounded-xl bg-industrial-900 border border-industrial-800">
          <span className="text-[11px] font-semibold text-industrial-400">Model Recall</span>
          <div className="text-xl font-black text-purple-400 mt-1 font-mono">{MOCK_ANALYTICS_STATS.recall}%</div>
          <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">Zero Critical Misses</div>
        </div>

        <div className="p-3.5 rounded-xl bg-industrial-900 border border-industrial-800">
          <span className="text-[11px] font-semibold text-industrial-400">F1-Score</span>
          <div className="text-xl font-black text-amberGlow-400 mt-1 font-mono">{MOCK_ANALYTICS_STATS.f1Score}%</div>
          <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">Harmonic Mean</div>
        </div>

        <div className="p-3.5 rounded-xl bg-industrial-900 border border-industrial-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-industrial-400">mAP Score (Object Det)</span>
          <div className="text-xl font-black text-roseGlow-400 mt-1 font-mono">{MOCK_ANALYTICS_STATS.mAP}</div>
          <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">IoU @ 0.50:0.95</div>
        </div>

      </div>

      {/* Section 2: Defect Trend Analysis & Hourly Yield (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Production Throughput & Yield Trend Line Chart (8 cols) */}
        <div className="lg:col-span-8 bg-industrial-900 rounded-2xl border border-industrial-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyanGlow-400" />
                Hourly Production Yield & Inspection Volume
              </h2>
              <p className="text-xs text-industrial-400">Track real-time passed vs failed product throughput</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ANALYTICS_STATS.hourlyYieldTrend}>
                <defs>
                  <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="passed" name="Passed Products" stroke="#10b981" fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Defective (Failed)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Category Distribution Pie Chart (4 cols) */}
        <div className="lg:col-span-4 bg-industrial-900 rounded-2xl border border-industrial-800 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              Defect Distribution by Type
            </h2>
            <p className="text-xs text-industrial-400">Classified root causes</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_ANALYTICS_STATS.defectBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {MOCK_ANALYTICS_STATS.defectBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {MOCK_ANALYTICS_STATS.defectBreakdown.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-industrial-300">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-bold text-white">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Section 3: Severity Breakdown & Quality Rules Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Severity Distribution Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-industrial-900 rounded-2xl border border-industrial-800 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amberGlow-400" />
              Severity Band Breakdown (0 - 100 Range)
            </h2>
            <p className="text-xs text-industrial-400">Volume of products by severity category</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_ANALYTICS_STATS.severityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {MOCK_ANALYTICS_STATS.severityDistribution.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supervisor Quality Rules Configuration Widget (5 cols) */}
        <div className="lg:col-span-5 bg-industrial-900 rounded-2xl border border-industrial-800 p-5 space-y-4 font-mono text-xs">
          <div>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyanGlow-400" />
              Quality Threshold & Auto-Rules
            </h2>
            <p className="text-xs text-industrial-400 font-sans">Set plant automation parameters</p>
          </div>

          <div className="space-y-3">
            
            <div className="p-3 rounded-xl bg-industrial-950 border border-industrial-800 space-y-1.5">
              <div className="flex justify-between text-industrial-200">
                <span>AI Confidence Threshold:</span>
                <span className="text-cyanGlow-400 font-bold">90.0%</span>
              </div>
              <p className="text-[10px] text-industrial-400 font-sans">
                Detections below 90% confidence trigger mandatory engineer review.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-industrial-950 border border-industrial-800 space-y-1.5">
              <div className="flex justify-between text-industrial-200">
                <span>Critical Severity Cutoff:</span>
                <span className="text-roseGlow-400 font-bold">80 / 100</span>
              </div>
              <p className="text-[10px] text-industrial-400 font-sans">
                Scores ≥ 80 trigger automated conveyor line stoppage & alert.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-industrial-950 border border-industrial-800 space-y-1.5">
              <div className="flex justify-between text-industrial-200">
                <span>Rework Routing:</span>
                <span className="text-amberGlow-400 font-bold">AUTOMATIC</span>
              </div>
              <p className="text-[10px] text-industrial-400 font-sans">
                Medium severity flaws auto-route to designated rework station.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
