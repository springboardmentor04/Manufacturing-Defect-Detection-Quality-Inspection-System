"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Search, BarChart2, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";
import { DetectionPreview, Inspection } from "@/components/dashboard/DetectionPreview";

export default function ResultsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentInspections() {
      try {
        const token = localStorage.getItem("visioninspect_auth_token");
        // Fetch the last 5 inspections instead of just 1
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inspections?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            setInspections(data.items);
          }
        }
      } catch (err) {
        console.error("Failed to fetch recent inspections", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRecentInspections();
  }, []);

  // Compute unique dynamic stats from the recent 5 inspections
  const failedCount = inspections.filter(i => i.inspection_result === 'FAIL' || i.status === 'Failed').length;
  const passRate = inspections.length > 0 ? Math.round(((inspections.length - failedCount) / inspections.length) * 100) : 0;
  const avgConfidence = inspections.length > 0 
    ? Math.round(inspections.reduce((acc, i) => acc + (i.confidence || 0), 0) / inspections.length)
    : 0;
  const criticalCount = inspections.filter(i => i.severity_level === 'CRITICAL' || i.severity === 'Critical').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header section */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/engineer" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Recent Detection Results
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review your 5 most recent AI inspections and real-time defect analytics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Clock className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500 font-medium">Loading recent detection results...</p>
        </div>
      ) : inspections.length > 0 ? (
        <>
          {/* Unique Insights Section based on the latest 5 inspections */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Displayed</p>
                <p className="text-2xl font-bold">{inspections.length} <span className="text-xs text-slate-400 font-normal">inspections</span></p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-xl ${passRate >= 80 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Recent Pass Rate</p>
                <p className="text-2xl font-bold">{passRate}%</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Avg Confidence</p>
                <p className="text-2xl font-bold">{avgConfidence}%</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-xl ${criticalCount > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Critical Defects</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </motion.div>

          {/* Grid of Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {inspections.map((inspection, index) => (
                <motion.div
                  key={inspection.inspection_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="h-full"
                >
                  {/* We display a 'Latest' badge on the very first item */}
                  <div className="relative h-full">
                    {index === 0 && (
                      <div className="absolute -top-3 -right-3 z-10 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider animate-pulse">
                        Newest
                      </div>
                    )}
                    <DetectionPreview data={inspection} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Inspections Found</h2>
          <p className="text-slate-500 mb-6 max-w-md">You haven't run any inspections yet. Go to New Inspection to upload an image and run the AI model.</p>
          <Link href="/dashboard/engineer/new-inspection" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Start New Inspection
          </Link>
        </div>
      )}
    </div>
  );
}
