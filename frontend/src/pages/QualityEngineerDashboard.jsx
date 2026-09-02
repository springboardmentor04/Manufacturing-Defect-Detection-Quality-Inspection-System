import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MOCK_INSPECTION_SAMPLES, MOCK_RECENT_INSPECTIONS, MOCK_ANALYTICS_STATS } from '../data/mockData';
import { 
  CheckCircle2, XCircle, AlertTriangle, Activity, 
  Camera, Upload, Eye, Cpu, Clock, Layers, ArrowUpRight, Zap
} from 'lucide-react';

export const QualityEngineerDashboard = () => {
  const { setActiveTab } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
              QUALITY ENGINEER WORKSPACE
            </span>
            <span className="text-xs text-slate-500 font-mono">• Production Line Alpha</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Automated Quality Inspection & Defect Detection
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Real-time computer vision inference engine for product surface defect detection, YOLOv8 localization, and algorithmic severity scoring.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('inspection_workspace')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Launch AI Inspection Studio</span>
          </button>
        </div>
      </div>

      {/* Light Theme Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Scanned Today</span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {MOCK_ANALYTICS_STATS.totalInspectedToday.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.2% vs yesterday</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Quality Pass Rate</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
              {MOCK_ANALYTICS_STATS.passRate}%
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ISO 9001 Compliant</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Defects Flagged</span>
            <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">
              83 <span className="text-xs text-slate-400 font-normal">({MOCK_ANALYTICS_STATS.defectRate}%)</span>
            </div>
            <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Requires action</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Inference Latency</span>
            <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
              {MOCK_ANALYTICS_STATS.avgInspectionTimeMs} <span className="text-xs font-normal">ms</span>
            </div>
            <div className="text-[11px] text-blue-600 mt-1 flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>GPU Accelerated</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Industrial Benchmark Queue */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Industrial Inspection Part Queue (MVTec AD Samples)
            </h2>
            <p className="text-xs text-slate-500">Click any part to inspect defect bounding boxes and heatmaps</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {MOCK_INSPECTION_SAMPLES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => setActiveTab('inspection_workspace')}
              className="group p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-white cursor-pointer transition-all space-y-2"
            >
              <div className="relative h-28 rounded-lg overflow-hidden bg-slate-200">
                <img
                  src={sample.image}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  sample.status === 'Failed'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {sample.status}
                </span>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600">
                  {sample.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{sample.partNumber}</span>
                  <span className="text-rose-600 font-semibold">{sample.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Live QC Stream Feed Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Quality Control Feed
            </h2>
            <p className="text-xs text-slate-500">Automated Inspection Output Log</p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md font-semibold">
            Live Streaming (60 FPS)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Inspection ID</th>
                <th className="px-4 py-3">Part No.</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Defect Category</th>
                <th className="px-4 py-3">Severity Score</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_RECENT_INSPECTIONS.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setActiveTab('inspection_workspace')}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{row.part}</td>
                  <td className="px-4 py-3 text-slate-600">{row.line}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{row.time}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${row.defect === 'None' ? 'text-slate-500' : 'text-rose-600'}`}>
                      {row.defect}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.score >= 80
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : row.score >= 60
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.score} / 100
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono ${
                      row.result === 'REJECT'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : row.result === 'REWORK'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
