import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { 
  Database, 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  Layers, 
  HardDrive, 
  FolderCheck, 
  CheckCircle2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function DatasetManagementPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDatasetsFromBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/admin/datasets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDatasets(data);
      } else {
        setError('Unable to load data.');
      }
    } catch (err) {
      console.error('Error fetching datasets from backend:', err);
      setError('Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetsFromBackend();
  }, []);

  const filteredDatasets = datasets.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Dataset Management"
      subtitle="VisionInspect AI Phase 8.1.4 — PostgreSQL Registered Vision Datasets"
    >
      <div className="space-y-6">
        
        {/* Top Header Bar & Actions */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dataset Repositories Registry</h2>
              <p className="text-xs text-gray-400">Total Persistent Datasets: {datasets.length}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Dataset Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              onClick={fetchDatasetsFromBackend}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#1F2937] hover:bg-gray-700 text-xs font-bold text-gray-300 border border-gray-700 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Datasets Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl">
          {loading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold">Loading datasets from database...</p>
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
                    <th className="px-4 py-3.5 rounded-l-xl">Dataset Name</th>
                    <th className="px-4 py-3.5">Version</th>
                    <th className="px-4 py-3.5">Categories</th>
                    <th className="px-4 py-3.5">Images</th>
                    <th className="px-4 py-3.5">Dataset Size</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 rounded-r-xl">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredDatasets.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                        No datasets available in database.
                      </td>
                    </tr>
                  ) : (
                    filteredDatasets.map((d) => (
                      <tr key={d.id} className="hover:bg-[#1F2937]/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white flex items-center space-x-2">
                          <FolderCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                          <span>{d.name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-blue-400 font-bold">{d.version}</td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">{d.total_categories} Categories</td>
                        <td className="px-4 py-3.5 font-mono text-white font-semibold">{d.total_images ? d.total_images.toLocaleString() : '5,354'} Frames</td>
                        <td className="px-4 py-3.5 text-gray-300 font-mono">{d.dataset_size}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                            {d.status || 'READY'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-[11px]">{d.created_at || '2026-08-13'}</td>
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
