import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { FileSpreadsheet, Search, Filter, Download, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';

export default function InspectionReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/v1/supervisor/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        } else {
          setError('Unable to load data.');
        }
      } catch (err) {
        console.error("Failed to fetch inspection reports:", err);
        setError('Unable to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    const pId = r.productId || r.inspection_code || '';
    const pName = r.productName || r.name || '';
    const matchesSearch = pId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || (r.status && r.status.toUpperCase() === filterStatus);
    return matchesSearch && matchesFilter;
  });

  const handleRowClick = (item) => {
    const targetId = item.productId || item.inspection_code || item.id;
    navigate(`/quality/inspection-result/${targetId}`);
  };

  const handleExport = () => {
    if (filteredReports.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Inspection Code,Product Name,Line,Status,Confidence\n"
      + filteredReports.map(e => `${e.productId},${e.productName},${e.line || 'LINE-A1'},${e.status},${e.confidence}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Supervisor_Inspection_Reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS':
      case 'Passed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">Passed</span>;
      case 'MANUAL_REVIEW':
      case 'Manual Review':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30">Manual Review</span>;
      case 'FAIL':
      case 'Failed':
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">Failed</span>;
    }
  };

  return (
    <DashboardLayout
      title="Inspection Reports"
      subtitle="VisionInspect AI Phase 8.1.2 — PostgreSQL Persistent Inspection Logs & Export"
    >
      <div className="space-y-6">
        
        {/* Search & Filter Header */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Supervisor Inspection Reports Table</h2>
              <p className="text-xs text-gray-400">Total Filtered Reports: {filteredReports.length}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Product ID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="MANUAL REVIEW">Manual Review</option>
            </select>

            {/* Export Report Button */}
            <button
              onClick={handleExport}
              disabled={filteredReports.length === 0}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl">
          {loading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold">Loading inspection reports...</p>
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
                    <th className="px-4 py-3.5 rounded-l-xl">Product / Inspection ID</th>
                    <th className="px-4 py-3.5">Product Name</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">AI Confidence</th>
                    <th className="px-4 py-3.5 rounded-r-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                        No inspection reports available in database.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((item, idx) => (
                      <tr 
                        key={item.productId || idx} 
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-[#1F2937]/70 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 font-mono text-white font-semibold">{item.productId}</td>
                        <td className="px-4 py-3.5 text-gray-200">{item.productName}</td>
                        <td className="px-4 py-3.5">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-200">{item.confidence}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center text-xs font-semibold text-[#2563EB] hover:underline">
                            View <ExternalLink className="w-3 h-3 ml-1" />
                          </span>
                        </td>
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
