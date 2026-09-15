"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { recentInspections } from "@/lib/mock-data";

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<"all" | "review">("review");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quality Control</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage flags and manual reviews</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'review' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Requires Review (2)
          </button>
          <button 
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            All Reports
          </button>
        </div>
      </div>

      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-500">Low Confidence Detection</h4>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">The system detected potential defects with confidence below 90%. Manual review is required before product routing.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentInspections.filter(item => item.status === 'Failed' && item.confidence < 0.95).map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="h-48 bg-slate-100 dark:bg-slate-900 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    Image preview not available in mock
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{item.id}</h3>
                      <p className="text-sm text-slate-500">{item.product}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200 dark:border-amber-900/50">
                      {item.defectType} ({(item.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button className="flex items-center justify-center gap-2 py-2 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg text-sm font-medium transition-colors">
                      <CheckCircle className="w-4 h-4" /> Override Pass
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors">
                      <XCircle className="w-4 h-4" /> Confirm Fail
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
          <p>Full report table would render here</p>
        </div>
      )}
    </div>
  );
}
