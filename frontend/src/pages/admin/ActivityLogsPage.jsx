import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { FileText, Search, Filter, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/admin/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        } else {
          setError('Unable to load data.');
        }
      } catch (err) {
        console.error("Failed to fetch activity logs:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    (l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.module || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Activity Logs"
      subtitle="VisionInspect AI Phase 8.1.4 — PostgreSQL Security Audit Trail Stream"
    >
      <div className="space-y-6">
        
        {/* Filter Bar */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#FACC15]/10 rounded-xl text-[#FACC15]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PostgreSQL Audit Trail Log Stream</h2>
              <p className="text-xs text-gray-400">Total Logged Events: {logs.length}</p>
            </div>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user, action, or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl">
          {loading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold">Loading activity logs from database...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center text-[#EF4444] space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3.5 rounded-l-xl">Log ID</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Action Executed</th>
                    <th className="px-4 py-3.5">Module</th>
                    <th className="px-4 py-3.5">IP Address</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 rounded-r-xl">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                        No activity log events recorded in database.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1F2937]/50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-white font-semibold">{log.id}</td>
                        <td className="px-4 py-3.5 text-gray-200">{log.user_name}</td>
                        <td className="px-4 py-3.5 text-gray-300 font-medium">{log.action}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 bg-[#1F2937] text-gray-300 rounded text-[10px] font-semibold border border-gray-700">
                            {log.module}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-400 text-[11px]">{log.ip_address}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SUCCESS' || log.status === 'Success'
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-[11px]">{log.created_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
