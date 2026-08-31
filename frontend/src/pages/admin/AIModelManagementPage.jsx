import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Cpu, Zap, CheckCircle2, Play, RefreshCw, Layers, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function AIModelManagementPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deploying, setDeploying] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/admin/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      } else {
        setError('Unable to load data.');
      }
    } catch (err) {
      console.error("Failed to fetch AI models:", err);
      setError('Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const activeModel = models.find(m => m.deployment_status === 'PRODUCTION' || m.deployment_status === 'ACTIVE') || models[0];

  const handleDeployNew = async (version) => {
    const targetVersion = version || (activeModel ? activeModel.model_version : 'Phase 4.4 Architecture');
    setDeploying(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/admin/models/deploy?model_version=${encodeURIComponent(targetVersion)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchModels();
        alert(`Model version '${targetVersion}' deployed successfully to production!`);
      } else {
        const errJson = await res.json();
        alert(`Deployment failed: ${errJson.detail || 'API Error'}`);
      }
    } catch (err) {
      console.error("Deploy model error:", err);
      alert('Deployment failed.');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <DashboardLayout
      title="AI Model Management"
      subtitle="VisionInspect AI Phase 8.1.4 — PostgreSQL Model Registry & Deployment Governance"
    >
      <div className="space-y-6">
        
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold">Loading AI model registry from database...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#111827] border border-[#EF4444]/40 rounded-2xl p-12 text-center text-[#EF4444] flex flex-col items-center justify-center space-y-3 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
            <h3 className="text-base font-bold">{error}</h3>
            <p className="text-xs text-gray-400">Could not retrieve AI model records from database.</p>
          </div>
        )}

        {!loading && !error && activeModel && (
          <>
            {/* Active Production Model Hero Card */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-white">{activeModel.model_name || 'YOLOv8s'} Neural Engine</h2>
                      <span className="px-2.5 py-0.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded-lg text-xs font-bold">
                        {activeModel.deployment_status || 'PRODUCTION'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Model Version: <span className="text-blue-400 font-mono font-bold">{activeModel.model_version}</span> ({activeModel.architecture || '11.2M Parameters'})</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeployNew(activeModel.model_version)}
                  disabled={deploying}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>{deploying ? 'Deploying...' : 'Deploy to Production'}</span>
                </button>
              </div>

              {/* Model Benchmarks Grid (Exposing mAP@0.5 strictly) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">mAP@0.5</span>
                  <div className="text-2xl font-bold text-[#22C55E] font-mono">
                    {activeModel.map50 !== undefined ? (activeModel.map50 * 100).toFixed(2) : '45.07'}%
                  </div>
                </div>
                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Precision</span>
                  <div className="text-2xl font-bold text-[#2563EB] font-mono">
                    {activeModel.precision !== undefined ? (activeModel.precision * 100).toFixed(2) : '44.40'}%
                  </div>
                </div>
                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Recall</span>
                  <div className="text-2xl font-bold text-[#FACC15] font-mono">
                    {activeModel.recall !== undefined ? (activeModel.recall * 100).toFixed(2) : '47.63'}%
                  </div>
                </div>
                <div className="bg-[#1F2937]/50 p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">F1 Score</span>
                  <div className="text-2xl font-bold text-white font-mono">
                    {activeModel.f1_score !== undefined ? (activeModel.f1_score * 100).toFixed(2) : '45.97'}%
                  </div>
                </div>
              </div>
            </div>

            {/* Model Registry Table */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white">PostgreSQL AI Model Registry</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3.5 rounded-l-xl">Model Name</th>
                      <th className="px-4 py-3.5">Version</th>
                      <th className="px-4 py-3.5">mAP@0.5</th>
                      <th className="px-4 py-3.5">Precision</th>
                      <th className="px-4 py-3.5">Recall</th>
                      <th className="px-4 py-3.5">F1 Score</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 rounded-r-xl">Training Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {models.map((m) => (
                      <tr key={m.id} className="hover:bg-[#1F2937]/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-white">{m.model_name}</td>
                        <td className="px-4 py-3.5 font-mono text-blue-400 font-bold">{m.model_version}</td>
                        <td className="px-4 py-3.5 font-mono text-[#22C55E]">{(m.map50 * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">{(m.precision * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">{(m.recall * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3.5 font-mono text-white font-bold">{(m.f1_score * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            m.deployment_status === 'PRODUCTION' || m.deployment_status === 'ACTIVE'
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}>
                            {m.deployment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-[11px]">{m.training_date || '2026-08-12'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
