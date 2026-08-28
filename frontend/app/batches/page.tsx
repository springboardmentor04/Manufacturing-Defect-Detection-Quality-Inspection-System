"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { batchesService } from '@/services/batches';
import { productsService } from '@/services/products';
import { Batch, Product } from '@/types';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesData, productsData] = await Promise.all([
        batchesService.getAll(),
        productsService.getAll()
      ]);
      setBatches(batchesData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await batchesService.create({
        batch_number: data.batch_number,
        product_id: parseInt(data.product_id),
        quantity: parseInt(data.quantity),
        production_line: data.production_line,
        status: 'PLANNED'
      });
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Batches</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          Create Batch
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
              <th className="p-4">Batch #</th>
              <th className="p-4">Product</th>
              <th className="p-4">Line</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No batches found.</td></tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{batch.batch_number}</td>
                  <td className="p-4">{batch.product?.name || `Product ID: ${batch.product_id}`}</td>
                  <td className="p-4">{batch.production_line}</td>
                  <td className="p-4">{batch.quantity}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Batch</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Batch Number</label>
                <input {...register("batch_number", { required: true })} className="w-full p-2 border rounded" placeholder="e.g. BATCH-2026-08-01" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Product</label>
                <select {...register("product_id", { required: true })} className="w-full p-2 border rounded">
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Quantity</label>
                <input type="number" {...register("quantity", { required: true })} className="w-full p-2 border rounded" placeholder="1000" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Production Line</label>
                <input {...register("production_line", { required: true })} className="w-full p-2 border rounded" placeholder="e.g. L-1A" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
