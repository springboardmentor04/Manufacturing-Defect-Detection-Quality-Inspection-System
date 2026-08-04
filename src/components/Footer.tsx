import React from 'react';
import { Scan, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-slate-700">VisionInspect AI</span>
            <span>— Manufacturing Quality & Anomaly Detection System (Milestone 3)</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              FastAPI & OpenCV Engine Active
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Cpu className="w-3.5 h-3.5" />
              MVTec AD Ready
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
};
