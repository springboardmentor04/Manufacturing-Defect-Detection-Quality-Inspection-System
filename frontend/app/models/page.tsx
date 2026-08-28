"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { modelsService } from '@/services/models';
import { ModelVersion } from '@/types';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await modelsService.getAll();
      setModels(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const activateModel = async (id: number) => {
    try {
      await modelsService.activate(id);
      fetchModels();
    } catch (error) {
      console.error(error);
      alert('Failed to activate model');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Model Management</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
              <th className="p-4">Version</th>
              <th className="p-4">Dataset</th>
              <th className="p-4">mAP</th>
              <th className="p-4">F1 Score</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : models.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No models found. Using fallback logic.</td></tr>
            ) : (
              models.map((model) => (
                <tr key={model.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{model.version}</td>
                  <td className="p-4">{model.dataset_version}</td>
                  <td className="p-4 text-emerald-600 font-medium">{(model.map_score * 100).toFixed(1)}%</td>
                  <td className="p-4 text-blue-600 font-medium">{(model.f1_score * 100).toFixed(1)}%</td>
                  <td className="p-4">
                    {model.is_active ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-full w-fit">
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold text-sm">Inactive</span>
                    )}
                  </td>
                  <td className="p-4">
                    {!model.is_active && (
                      <button 
                        onClick={() => activateModel(model.id)}
                        className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors border border-blue-200"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
