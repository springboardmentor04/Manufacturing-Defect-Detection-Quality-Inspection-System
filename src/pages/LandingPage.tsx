import React from 'react';
import { Scan, ArrowRight, BarChart3, Users } from 'lucide-react';
import { MVTEC_SAMPLES } from '../data/mvtecSamples';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 py-8">
      
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-800 text-xs font-bold">
          <Scan className="w-4 h-4 text-teal-700 animate-pulse" />
          <span>Automated Quality Inspection System</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight">
          AI-Powered Manufacturing Defect Detection & Quality Control
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
          Accelerate quality engineering with OpenCV image preprocessing, real-time anomaly localization, standardized multi-factor severity scoring, and role-based factory analytics.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-full transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 group"
          >
            <span>Launch Quality Inspection Station</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => onNavigate('register')}
            className="px-6 py-3 bg-white/60 hover:bg-white/90 text-slate-800 font-bold text-sm rounded-full border border-white/80 shadow-xs transition-all"
          >
            Create User Account
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="glass-card p-6 rounded-3xl hover:border-teal-400 transition-all space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Quality Engineer Station</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Upload product images or capture from camera feed, apply Gaussian noise filters, CLAHE contrast boost, Canny edge detection, and compute severity scores instantly.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl hover:border-blue-400 transition-all space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Factory Supervisor Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Monitor production lines, track hourly yield rates, audit pass/fail metrics, review defect distribution graphs, and adjust critical quality threshold limits.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl hover:border-purple-400 transition-all space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Admin Control Suite</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Master control panel combining engineering and supervisor views with full user management, JWT auth, line assignments, and model sensitivity sliders.
            </p>
          </div>

        </div>
      </section>

      {/* MVTec AD Dataset Sample Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Supported MVTec AD Industrial Dataset Categories</h2>
          <p className="text-xs text-slate-500 font-medium">
            Simulate real-world industrial anomaly localization on metal components, electronics, ceramics, and textiles.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {MVTEC_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="glass-card rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group text-left"
            >
              <div className="aspect-square bg-slate-100 overflow-hidden relative">
                <img 
                  src={sample.imageUrl} 
                  alt={sample.productName} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                  {sample.defaultDefectType}
                </span>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-xs text-slate-800 truncate">{sample.productName}</h4>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono font-medium">
                  {sample.productCategory}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Severity Formula Teaser */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="glass-dark text-white p-8 rounded-3xl space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-500/30 inline-block">Standardized Quality Metric</span>
              <h3 className="text-2xl font-bold">Multi-Factor Severity Scoring Engine</h3>
              <p className="text-xs text-teal-200/90 leading-relaxed font-mono font-semibold">
                Severity = (Size×30%) + (Location×25%) + (DefectType×25%) + (Confidence×20%)
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Categorizes defects into Low (0-39), Medium (40-59), High (60-79), and Critical (80-100) severity tiers to automate immediate pass/fail product rejection workflows.
              </p>
            </div>

            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-teal-400 hover:bg-teal-300 text-teal-950 font-extrabold text-xs rounded-full shadow-lg transition-all whitespace-nowrap"
            >
              Try Interactive Inspection Now
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
