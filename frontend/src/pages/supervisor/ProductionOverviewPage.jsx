import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Layers, CheckCircle2, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Loader2, HelpCircle } from 'lucide-react';

export default function ProductionOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/supervisor/overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOverview(data);
        } else {
          setError('Unable to load data.');
        }
      } catch (err) {
        console.error("Failed to fetch production overview:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  return (
    <DashboardLayout
      title="Production Overview"
      subtitle="VisionInspect AI Phase 8.1.2 — PostgreSQL Shift Telemetry & Yield Metrics"
    >
      <div className="space-y-8">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading overview...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Could not retrieve PostgreSQL production metrics.</p>
          </div>
        )}

        {!loading && !error && overview && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Total Products Inspected */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Products Inspected</span>
                  <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-white tracking-tight">{overview.total_products.toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">PostgreSQL DB Verified Units</p>
              </div>

              {/* Passed Inspections */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Passed Inspections</span>
                  <div className="p-3 bg-[#22C55E]/10 rounded-xl text-[#22C55E]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-[#22C55E] tracking-tight">{overview.passed_inspections.toLocaleString()}</span>
                  <span className="flex items-center text-xs font-medium text-[#22C55E]">
                    {overview.pass_rate_pct}% Pass Rate
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Quality Standard Met</p>
              </div>

              {/* Failed Inspections */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Failed Inspections</span>
                  <div className="p-3 bg-[#EF4444]/10 rounded-xl text-[#EF4444]">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-[#EF4444] tracking-tight">{overview.failed_inspections.toLocaleString()}</span>
                  <span className="flex items-center text-xs font-medium text-[#EF4444]">
                    {overview.defect_rate_pct}% Defect Rate
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Includes {overview.manual_reviews || 0} Manual Reviews</p>
              </div>

              {/* AI Model Benchmark */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Model Benchmark</span>
                  <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-white tracking-tight">{overview.ai_accuracy_pct}%</span>
                  <span className="flex items-center text-xs font-medium text-[#22C55E]">
                    YOLOv8s Phase 4.4
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Sub-75ms CPU Inference</p>
              </div>

            </div>

            {/* Summary Telemetry Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <span className="text-gray-400 font-semibold uppercase">PostgreSQL Sync Status</span>
                <div className="text-xl font-bold text-[#22C55E]">Live DB Connected</div>
                <p className="text-gray-400">All metrics calculated directly from database</p>
              </div>

              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <span className="text-gray-400 font-semibold uppercase">Total Database Inspections</span>
                <div className="text-xl font-bold text-white">{overview.total_products} Records</div>
                <p className="text-gray-400">{overview.passed_inspections} Passed • {overview.failed_inspections} Failed</p>
              </div>

              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-2">
                <span className="text-gray-400 font-semibold uppercase">Manual Review Escalations</span>
                <div className="text-xl font-bold text-[#FACC15]">{overview.manual_reviews || 0} Units</div>
                <p className="text-gray-400">Escalated for human inspector sign-off</p>
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
