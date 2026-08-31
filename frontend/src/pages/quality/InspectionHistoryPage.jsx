import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { FileSpreadsheet, Search, Filter, Loader2, ExternalLink } from 'lucide-react';

export default function InspectionHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('ALL');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/quality/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch inspection history from database:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const filteredHistory = history.filter(row => {
    const partStr = row.part || row.product_code || row.productId || '';
    const idStr = row.id || row.inspection_code || '';
    const defectStr = row.defect || '';
    const matchesSearch = partStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          idStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          defectStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterResult === 'ALL' || (row.result && row.result.toUpperCase() === filterResult);
    return matchesSearch && matchesFilter;
  });

  const handleRowClick = (row) => {
    const targetId = row.id || row.inspection_code || row.productId;
    navigate(`/quality/inspection-result/${targetId}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS':
      case 'Passed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">Passed</span>;
      case 'MANUAL_REVIEW':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30">Manual Review</span>;
      case 'FAIL':
      case 'Defective':
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">Failed</span>;
    }
  };

  return (
    <DashboardLayout
      title="Inspection History"
      subtitle="VisionInspect AI Phase 8.1.1 — Logged Quality Inspection Records in PostgreSQL"
    >
      <div className="space-y-6">
        
        {/* Search & Filter Header */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PostgreSQL Inspection Log Table</h2>
              <p className="text-xs text-gray-400">Total Persistent Entries: {filteredHistory.length}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Inspection Code or Part..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Results</option>
              <option value="PASS">Passed</option>
              <option value="FAIL">Failed</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          {loading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold">Loading inspection log from database...</p>
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3.5 rounded-l-xl">Inspection Code</th>
                    <th className="px-4 py-3.5">Part Code</th>
                    <th className="px-4 py-3.5">Result</th>
                    <th className="px-4 py-3.5">AI Diagnostic</th>
                    <th className="px-4 py-3.5">Severity</th>
                    <th className="px-4 py-3.5">Confidence</th>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5 rounded-r-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredHistory.map((row, idx) => (
                    <tr 
                      key={row.id || idx} 
                      onClick={() => handleRowClick(row)}
                      className="hover:bg-[#1F2937]/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 font-mono text-white font-semibold flex items-center gap-1.5">
                        {row.inspection_code || row.productId || row.id}
                      </td>
                      <td className="px-4 py-3.5 text-gray-200">{row.part || row.product_code || row.productId}</td>
                      <td className="px-4 py-3.5">
                        {getStatusBadge(row.result)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-300">{row.defect || 'No Defect'}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-300">{row.severity || 'NONE'}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-200">{row.confidence}</td>
                      <td className="px-4 py-3.5 text-gray-400 font-mono text-[11px]">{row.date}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-[#2563EB] hover:underline">
                          View <ExternalLink className="w-3 h-3 ml-1" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
