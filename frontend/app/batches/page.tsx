"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { batchesService, CreateBatchInput } from '@/services/batches';
import { productsService } from '@/services/products';
import { formatApiError } from '@/services/api';
import { Batch, Product } from '@/types';
import { Plus, RotateCw, AlertCircle, CheckCircle2, Layers, X, Loader2 } from 'lucide-react';

interface BatchFormData {
  batch_number: string;
  product_id: string;
}

const initialFormData: BatchFormData = {
  batch_number: '',
  product_id: '',
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [batchesData, productsData] = await Promise.all([
        batchesService.getAll(),
        productsService.getAll(),
      ]);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      console.error('[BatchesPage] Failed to load data:', error);
      const formatted = formatApiError(error, 'Failed to load batches from server.');
      setFetchError(formatted);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setSaveError(null);
    setSaveSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setSaveError(null);
    setFormData(initialFormData);
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSaving) return;

    if (!formData.batch_number.trim()) {
      setSaveError('Batch Number is required.');
      return;
    }
    if (!formData.product_id) {
      setSaveError('Please select an associated product.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload: CreateBatchInput = {
        batch_number: formData.batch_number.trim(),
        product_id: parseInt(formData.product_id, 10),
      };

      const createdBatch = await batchesService.create(payload);

      if (createdBatch && createdBatch.id) {
        setBatches((prev) => [
          createdBatch,
          ...prev.filter((b) => b.id !== createdBatch.id),
        ]);
      }

      setSaveSuccess(`Batch "${createdBatch.batch_number}" created successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);

      setIsModalOpen(false);
      setFormData(initialFormData);

      await fetchData();
    } catch (error: any) {
      console.error('[BatchesPage] Error creating batch:', error);
      const formatted = formatApiError(error, 'Failed to create batch.');
      setSaveError(formatted);
    } finally {
      setIsSaving(false);
    }
  };

  const getProductName = (productId: number, productObj?: Product) => {
    if (productObj?.name) return productObj.name;
    const found = products.find((p) => p.id === productId);
    return found ? found.name : `Product #${productId}`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-blue-600" size={26} />
            Production Batches
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage lot numbers, batch records, and product associations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer"
            title="Refresh batches list"
          >
            <RotateCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            Refresh
          </button>
          <button
            type="button"
            id="create-batch-btn"
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={20} />
            Create Batch
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{saveSuccess}</span>
        </div>
      )}

      {fetchError && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
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
                <th className="p-4">ID</th>
                <th className="p-4">Batch Number</th>
                <th className="p-4">Associated Product</th>
                <th className="p-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-slate-600 font-medium">Loading batches...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="text-slate-300" size={36} />
                      <p className="font-semibold text-slate-700">No batches found</p>
                      <p className="text-xs text-slate-400">Click &quot;Create Batch&quot; to create your first production lot.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-800">#{batch.id}</td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-900 font-mono text-xs font-bold rounded border border-slate-200">
                        {batch.batch_number}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {getProductName(batch.product_id, batch.product)}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {batch.created_at
                        ? new Date(batch.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Create New Batch</h2>
                  <p className="text-xs text-slate-500">Enter lot ID and select product</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {saveError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to Create Batch</p>
                    <p className="mt-0.5">{saveError}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="batch-number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batch Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="batch-number"
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, batch_number: e.target.value }));
                    if (saveError) setSaveError(null);
                  }}
                  disabled={isSaving}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400 font-mono text-xs"
                  placeholder="e.g. BATCH-2026-09-001"
                />
              </div>

              <div>
                <label htmlFor="batch-product" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product <span className="text-rose-500">*</span>
                </label>
                <select
                  id="batch-product"
                  value={formData.product_id}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, product_id: e.target.value }));
                    if (saveError) setSaveError(null);
                  }}
                  disabled={isSaving}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400 bg-white"
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.product_code ? `(${p.product_code})` : ''}
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No products found. Please create a product first on the Products page.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-batch-btn"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-batch-btn"
                  disabled={isSaving || products.length === 0}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Batch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
