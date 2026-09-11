"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { modelsService } from '@/services/models';
import { formatApiError } from '@/services/api';
import { ModelVersion } from '@/types';
import { CheckCircle2, RotateCw, AlertCircle, Cpu, Loader2, Zap } from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modelsService.getAll();
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[ModelsPage] Failed to fetch models:', err);
      const formatted = formatApiError(err, 'Failed to load model registry from server.');
      setError(formatted);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const activateModel = async (id: number) => {
    try {
      setActivatingId(id);
      setError(null);
      await modelsService.activate(id);
      setActionSuccess(`Model #${id} activated successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchModels();
    } catch (err: any) {
      console.error('[ModelsPage] Failed to activate model:', err);
      const formatted = formatApiError(err, 'Failed to activate model.');
      setError(formatted);
    } finally {
      setActivatingId(null);
    }
  };

  const formatMetric = (val?: number | null) => {
    if (val === null || val === undefined) return '-';
    const percent = val <= 1.0 ? val * 100 : val;
    return `${percent.toFixed(1)}%`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="text-blue-600" size={26} />
            AI Model Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage deployed YOLO defect detection models, checkpoints, and active runtime weights
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchModels()}
          disabled={loading}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer"
          title="Refresh models"
        >
          <RotateCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          Refresh
        </button>
      </div>

      {actionSuccess && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchModels()}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Model Name / Version</th>
                <th className="p-4">Dataset</th>
                <th className="p-4">mAP Score</th>
                <th className="p-4">F1 Score</th>
                <th className="p-4">Precision / Recall</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-slate-600 font-medium">Loading model metadata...</span>
                    </div>
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Cpu className="text-slate-300" size={36} />
                      <p className="font-semibold text-slate-700">No models registered</p>
                      <p className="text-xs text-slate-400">Default YOLOv8 weights are active in the backend pipeline.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                models.map((model) => {
                  const isActive = (model.status || '').toLowerCase() === 'active' || model.is_active === true;
                  const isActivating = activatingId === model.id;

                  return (
                    <tr key={model.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className={isActive ? 'text-amber-500' : 'text-slate-400'} />
                          <div>
                            <p className="font-bold text-slate-900">{model.name || 'YOLO Defect Model'}</p>
                            <p className="text-xs text-slate-500 font-mono">v{model.version}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{model.dataset || model.dataset_version || 'Industrial-AD'}</td>
                      <td className="p-4 font-mono font-semibold text-emerald-600">
                        {formatMetric(model.map_score)}
                      </td>
                      <td className="p-4 font-mono font-semibold text-blue-600">
                        {formatMetric(model.f1_score)}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        P: {formatMetric(model.precision || model.precision_score)} | R: {formatMetric(model.recall || model.recall_score)}
                      </td>
                      <td className="p-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={13} /> Active Pipeline
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs bg-slate-100 px-2 py-0.5 rounded">
                            Inactive Checkpoint
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => activateModel(model.id)}
                            disabled={isActivating}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 cursor-pointer disabled:opacity-50"
                          >
                            {isActivating ? 'Activating...' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Current</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
