import React from "react";

export default function AuthSidePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-auth-panel items-center justify-center px-12">
      <style>{`
        .vi-underShadow { opacity: 0.25; }
      `}</style>

      <div className="absolute inset-0 opacity-20 mix-blend-overlay">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-md text-white">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-xl">
            🔍
          </div>
          <span className="font-bold text-lg">VisionInspect AI</span>
        </div>

        <h2 className="text-3xl font-bold leading-tight mb-4">
          AI-Powered Manufacturing Quality Inspection
        </h2>
        <p className="text-slate-300 text-sm mb-10">
          Real-time computer vision defect detection, severity scoring, and
          plant-wide quality analytics — all in one platform.
        </p>

        <div className="w-full">
          <div className="w-full rounded-xl overflow-hidden border border-slate-700/70 shadow-2xl shadow-black/40 ring-1 ring-white/5">
            <img
              src="/images/dashboard-preview.png"
              alt="VisionInspect AI dashboard preview"
              className="w-full h-auto block"
            />
          </div>
          <div className="vi-underShadow mt-3 mx-auto w-3/4 h-6 rounded-full bg-black blur-xl" />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div>
            <p className="text-2xl font-bold">99.2%</p>
            <p className="text-xs text-slate-400">Detection Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold">142ms</p>
            <p className="text-xs text-slate-400">Inference Latency</p>
          </div>
          <div>
            <p className="text-2xl font-bold">24/7</p>
            <p className="text-xs text-slate-400">Line Monitoring</p>
          </div>
        </div>
      </div>
    </div>
  );
}