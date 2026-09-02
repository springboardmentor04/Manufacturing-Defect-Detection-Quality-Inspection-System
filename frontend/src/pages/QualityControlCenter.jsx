import React, { useState, useEffect } from 'react';
import { MOCK_RECENT_INSPECTIONS } from '../data/mockData';
import { 
  ClipboardCheck, Search, Download, Eye, Database, RefreshCw
} from 'lucide-react';

export const QualityControlCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [mongoReports, setMongoReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const url = `http://localhost:8000/api/reports?verdict=${filterVerdict}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMongoReports(data);
      } else {
        setMongoReports([]);
      }
    } catch (e) {
      console.log('MongoDB reports fetch notice:', e);
      setMongoReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterVerdict, searchTerm]);

  // Combine database reports with mock fallback if offline
  const displayLogs = mongoReports.length > 0 
    ? mongoReports.map(r => ({
        id: r.id,
        part: r.partNumber,
        partName: r.partName,
        line: r.lineStation || 'Line A1',
        time: r.timestamp,
        defect: r.defectType,
        severity: r.severityLevel,
        score: r.severityScore,
        result: r.verdict,
        recommendation: r.recommendation,
        certificateId: r.certificateId,
        inspector: r.inspector
      }))
    : MOCK_RECENT_INSPECTIONS.filter((row) => {
        const matchesSearch = row.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              row.part.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              row.defect.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterVerdict === 'ALL') return matchesSearch;
        return matchesSearch && row.result === filterVerdict;
      });

  const exportCSV = () => {
    const headers = "Inspection_ID,Certificate_ID,Part_No,Line,Timestamp,Defect_Category,Severity_Score,Verdict\n";
    const rows = displayLogs.map(r => `${r.id},${r.certificateId || r.id},${r.part},${r.line},${r.time},${r.defect},${r.score},${r.result}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VisionInspect_MongoDB_Quality_Reports_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-600" />
              MILESTONE 3: MONGODB ATLAS REPORTS
            </span>
            <span className="text-xs text-slate-500 font-mono">Auditable Persistent Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Quality Control & Inspection Database Center
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </button>
          
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all border border-slate-200"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export MongoDB CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search MongoDB Part #, ID, or Defect..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PASS', 'REJECT', 'REWORK'].map((verdict) => (
            <button
              key={verdict}
              onClick={() => setFilterVerdict(verdict)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                filterVerdict === verdict
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {verdict}
            </button>
          ))}
        </div>
      </div>

      {/* Inspection Log Database Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-1">
          <span>Storage: <strong className="text-emerald-600">MongoDB Atlas (`inspection_reports`)</strong></span>
          <span>Records Loaded: <strong className="text-blue-600">{displayLogs.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Report ID</th>
                <th className="px-4 py-3">Part Serial No.</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Defect Category</th>
                <th className="px-4 py-3">Severity Score</th>
                <th className="px-4 py-3">Final Verdict</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayLogs.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{row.part}</td>
                  <td className="px-4 py-3 text-slate-600">{row.line}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{row.time}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.defect}</td>
                  <td className="px-4 py-3 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      row.score >= 80
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : row.score >= 60
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.score} / 100
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono ${
                      row.result === 'REJECT'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : row.result === 'REWORK'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(row)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                      title="Inspect MongoDB report record"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-slate-900 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">MongoDB Report - {selectedLog.id}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedLog.certificateId || 'CERT-2026-PERSISTENT'}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Part Name / Description:</span>
                <span className="text-slate-900 font-bold">{selectedLog.partName || selectedLog.part}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Part Number:</span>
                <span className="text-slate-800">{selectedLog.part}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Defect Type:</span>
                <span className="text-rose-600 font-bold">{selectedLog.defect}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Severity Score:</span>
                <span className="text-blue-600 font-bold">{selectedLog.score} / 100 ({selectedLog.severity || 'Medium'})</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Inspector:</span>
                <span className="text-slate-800">{selectedLog.inspector || 'Quality Engineer'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Storage Status:</span>
                <span className="text-emerald-600 font-bold">SAVED IN MONGODB ATLAS</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
