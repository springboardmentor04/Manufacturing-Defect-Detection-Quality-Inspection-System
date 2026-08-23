'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { getInspections, InspectionListItem } from '@/lib/api';
import InspectionCard from './InspectionCard';

interface RecentDetectionsPanelProps {
  onRefreshTrigger?: number;
}

export default function RecentDetectionsPanel({ onRefreshTrigger }: RecentDetectionsPanelProps) {
  const [recentItems, setRecentItems] = useState<InspectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);

  const fetchRecent = async () => {
    try {
      const data = await getInspections();
      // Take the top 5 most recent inspections
      setRecentItems(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to poll recent detections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();

    // Auto-refresh via polling every 6 seconds
    const interval = setInterval(() => {
      if (isLiveActive) {
        fetchRecent();
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isLiveActive, onRefreshTrigger]);

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Recent Detections
                {/* Live Pulse Indicator */}
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Live polling stream (every 6s)</p>
            </div>
          </div>

          <button
            onClick={() => fetchRecent()}
            title="Refresh stream"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* List of Recent Items */}
        <div className="space-y-2.5">
          {isLoading && recentItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2">
              <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching recent detections stream...</p>
            </div>
          ) : recentItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-1">
              <Sparkles className="w-6 h-6 mx-auto text-slate-600 mb-1" />
              <p className="text-slate-300 font-semibold">No recent inspections yet</p>
              <p>Upload a new image payload to see real-time inference results.</p>
            </div>
          ) : (
            recentItems.map((item) => (
              <InspectionCard
                key={item.id}
                inspection={{
                  id: item.id,
                  filename: item.filename,
                  filepath: item.filepath,
                  status: item.status,
                  defect_count: item.defect_count,
                  created_at: item.created_at,
                  defect_summary:
                    item.defect_count !== undefined && item.defect_count > 0
                      ? `${item.defect_count} defect${item.defect_count > 1 ? 's' : ''} detected`
                      : item.status === 'completed'
                      ? 'Pass (0 defects)'
                      : 'Queued',
                }}
                compact
              />
            ))
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-slate-800/80 mt-4">
        <Link
          href="/dashboard/inspections"
          className="flex items-center justify-between text-xs text-sky-400 hover:text-sky-300 font-semibold group transition-colors"
        >
          <span>View All Inspection Records</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
