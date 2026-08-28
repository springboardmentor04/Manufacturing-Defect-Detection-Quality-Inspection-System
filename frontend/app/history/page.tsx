'use client';

import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { inspectApi } from '@/lib/api';
import { InspectionResult } from '@/types';

export default function HistoryPage() {
  const router = useRouter();

  const [inspections, setInspections] = useState<InspectionResult[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<InspectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [csvStatus, setCsvStatus] = useState<string>('');

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const data = await inspectApi.getHistory(100);
        setInspections(data);
        setFilteredInspections(data);
      } catch (err: any) {
        console.error('Failed to load inspection history:', err);
        setError('Failed to retrieve inspection logs from server.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  // Filter handlers
  useEffect(() => {
    let result = inspections;

    if (statusFilter !== 'ALL') {
      result = result.filter((item) => {
        const normalizedStatus = item.status?.toUpperCase();
        return (
          (statusFilter === 'PASS' && (normalizedStatus === 'PASSED' || normalizedStatus === 'PASS')) ||
          (statusFilter === 'FAIL' && (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' || normalizedStatus === 'FAIL')) ||
          (statusFilter === 'FLAGGED' && normalizedStatus === 'FLAGGED')
        );
      });
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.id.toLowerCase().includes(term) ||
          (item.severity_level && item.severity_level.toLowerCase().includes(term)) ||
          item.status.toLowerCase().includes(term)
      );
    }

    setFilteredInspections(result);
  }, [statusFilter, searchTerm, inspections]);

  const handleCsvFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvStatus('Ingesting batch CSV inspection records...');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const newInspections: InspectionResult[] = [];
        const startIdx = lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('status') ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const id = cols[0] || `SCAN-${Math.floor(8000 + Math.random() * 1000)}`;
          const defects = parseInt(cols[2], 10) || Math.floor(Math.random() * 2);
          const status = (cols[3]
            ? cols[3].toUpperCase()
            : defects === 0
            ? 'PASS'
            : 'FAIL') as InspectionResult['status'];
          const severityLevel = (cols[4] || (status === 'PASS' ? 'NONE' : 'HIGH')) as InspectionResult['severity_level'];
          const severityScore = parseInt(cols[5], 10) || (status === 'PASS' ? 5 : 85);

          newInspections.push({
            id,
            image_url: '',
            status,
            confidence: 0,
            severity_score: severityScore,
            severity_level: severityLevel,
            summary: '',
            recommendation: '',
            defects: [],
            created_at: new Date().toISOString(),
          });
        }

        setInspections((prev) => [...newInspections, ...prev]);
        setCsvStatus(`Successfully ingested ${newInspections.length} records!`);
        setTimeout(() => setCsvStatus(''), 5000);
      } catch {
        setCsvStatus('Failed to process CSV file. Verify headers and format.');
      }
    };

    reader.readAsText(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PASS':
      case 'PASSED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAIL':
      case 'FAILED':
      case 'REJECTED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'FLAGGED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Inspection Telemetry Logs
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Historical record of all AI computer vision quality scans and batch audits.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 cursor-pointer transition-all flex items-center space-x-2">
              <span>📁</span>
              <span>Ingest Batch CSV</span>
              <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
            </label>

            <Link
              href="/inspect"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Inspection</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {csvStatus && (
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm flex items-center space-x-2">
            <span>ℹ️</span>
            <span>{csvStatus}</span>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by ID or severity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl glass-input text-xs focus:outline-none bg-slate-900 border border-slate-800 text-slate-200"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'PASS', 'FAIL', 'FLAGGED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Inspection Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 overflow-hidden bg-[#0F172A]/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-2">Inspection ID</th>
                  <th className="pb-3 px-2">Timestamp</th>
                  <th className="pb-3 px-2">Defects Count</th>
                  <th className="pb-3 px-2">Max Severity Score</th>
                  <th className="pb-3 px-2">Severity Level</th>
                  <th className="pb-3 px-2">Overall Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      Loading inspection history...
                    </td>
                  </tr>
                ) : filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No matching inspection logs found.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-2 font-mono text-xs text-blue-400 font-medium">
                        {item.id}
                      </td>
                      <td className="py-3.5 px-2 text-xs text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-xs">
                        {item.defects.length}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-xs text-slate-200 font-bold">
                        {item.severity_score ?? 0}/100
                      </td>
                      <td className="py-3.5 px-2 text-xs">
                        <span className="font-mono text-[11px] uppercase text-amber-400">
                          {item.severity_level || 'NONE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <Link
                          href={`/inspect/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors inline-block"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
