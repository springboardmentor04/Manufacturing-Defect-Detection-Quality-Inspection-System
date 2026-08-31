import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Tv, AlertTriangle, Activity, Camera, CheckCircle2, Loader2 } from 'lucide-react';

export default function ProductionMonitoringPage() {
  const [lines, setLines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMonitoringData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/supervisor/monitoring', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLines(data.lines || []);
          setAlerts(data.alerts || []);
        } else {
          setError('Unable to load data.');
        }
      } catch (err) {
        console.error("Failed to fetch production monitoring data:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchMonitoringData();
  }, []);

  return (
    <DashboardLayout
      title="Production Line Monitoring"
      subtitle="VisionInspect AI Phase 8.1.2 — Live Conveyor Lines & PostgreSQL Alerts"
    >
      <div className="space-y-8">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading line monitoring telemetry...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Could not retrieve production line monitoring records.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Production Line Cards Grid */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#2563EB]" />
                  <span>Active Assembly Lines & Conveyor Status</span>
                </h2>
                <span className="text-xs px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-xl font-semibold">
                  {lines.length} Lines Configured in Database
                </span>
              </div>

              {lines.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">No production line data available in database.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {lines.map((line, idx) => (
                    <div key={line.name || idx} className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-white">{line.name}</span>
                          <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 border border-gray-700" style={{ color: line.color || '#22C55E' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color || '#22C55E' }}></span>
                            <span>{line.status}</span>
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">DB Telemetry</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Line Utilization Rate</span>
                          <span className="font-mono text-white font-bold">{line.utilization}%</span>
                        </div>
                        <div className="w-full bg-[#111827] h-3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${line.utilization}%`, backgroundColor: line.color || '#22C55E' }}></div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-blue-400" />
                          <span>Optical Camera: <strong className="text-white">Online (320x320 60fps)</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alerts Panel */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                  <h2 className="text-base font-bold text-white">PostgreSQL Critical Alerts Panel</h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-[#EF4444]/20 text-[#EF4444] rounded-lg border border-[#EF4444]/30">
                  {alerts.length} Active Database Alerts
                </span>
              </div>

              {alerts.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">No active critical alerts in database.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {alerts.map((alert, idx) => (
                    <div key={alert.id || idx} className="bg-[#1F2937]/70 border border-l-4 border-l-[#EF4444] border-gray-800 rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{alert.title || alert.alert_code || 'Alert'}</span>
                        <span className="text-[#EF4444] text-[11px]">{alert.severity || 'WARNING'}</span>
                      </div>
                      <p className="text-xs text-gray-300">{alert.message || 'System alert triggered on production line.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
