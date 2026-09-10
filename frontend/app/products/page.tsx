"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productsService, CreateProductInput } from '@/services/products';
import { Product } from '@/types';
import { Plus, RotateCw, AlertCircle, CheckCircle2, Package, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ProductFormData {
  name: string;
  product_code?: string;
  production_line?: string;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ProductFormData>();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await productsService.getAll();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
      let errorMsg = 'Failed to load products from server.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail
            .map((d: any) => d.msg || JSON.stringify(d))
            .join(', ');
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setFetchError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenModal = () => {
    reset();
    setSaveError(null);
    setSaveSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setSaveError(null);
    reset();
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const payload: CreateProductInput = {
        name: data.name,
        product_code: data.product_code,
        production_line: data.production_line,
        description: data.description,
      };

      const createdProduct = await productsService.create(payload);

      // Optimistically update list immediately
      if (createdProduct && createdProduct.id) {
        setProducts((prev) => [
          createdProduct,
          ...prev.filter((p) => p.id !== createdProduct.id)
        ]);
      }

      setSaveSuccess(`Product "${createdProduct.name}" created successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);

      setIsModalOpen(false);
      reset();

      // Refresh to ensure synchronization with backend database
      await fetchProducts();
    } catch (error: any) {
      console.error('Failed to create product:', error);
      let errorMsg = 'Failed to save product. Please check the details and try again.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail
            .map((d: any) => d.msg || (d.loc ? `${d.loc.join('.')}: ${d.msg}` : JSON.stringify(d)))
            .join('; ');
        }
      } else if (error.response?.status === 401) {
        errorMsg = 'Session expired or not authenticated. Please log in again.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      setSaveError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" size={26} />
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage product catalog, SKUs, and production line assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
            title="Refresh product list"
          >
            <RotateCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            Refresh
          </button>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={20} />
            Add Product
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
            onClick={() => fetchProducts()}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
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
                <th className="p-4">Product Code</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Description</th>
                <th className="p-4">Production Line</th>
                <th className="p-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-slate-600 font-medium">Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="text-slate-300" size={36} />
                      <p className="font-semibold text-slate-700">No products found</p>
                      <p className="text-xs text-slate-400">Click &quot;Add Product&quot; to create your first product.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-800">#{product.id}</td>
                    <td className="p-4">
                      {product.product_code ? (
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 font-mono text-xs font-semibold rounded border border-slate-200">
                          {product.product_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-900">{product.name}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate" title={product.description || ''}>
                      {product.description || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {product.production_line ? (
                        <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {product.production_line}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {product.created_at
                        ? new Date(product.created_at).toLocaleDateString(undefined, {
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Product</h2>
                  <p className="text-xs text-slate-500">Enter product specifications and details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {saveError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to Save</p>
                    <p className="mt-0.5">{saveError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  {...register('name', { required: 'Product name is required' })}
                  disabled={isSaving}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="e.g. Logic Board X1"
                />
                {errors.name && (
                  <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Code / SKU
                </label>
                <input
                  {...register('product_code')}
                  disabled={isSaving}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400 font-mono text-xs"
                  placeholder="e.g. PCB-X1-001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Production Line
                </label>
                <input
                  {...register('production_line')}
                  disabled={isSaving}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="e.g. Line 1 - SMT Assembly"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  disabled={isSaving}
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-50 disabled:text-slate-400 resize-none"
                  placeholder="Optional product description or inspection notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Product'
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
