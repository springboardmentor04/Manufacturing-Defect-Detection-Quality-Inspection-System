"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productsService } from '@/services/products';
import { Product } from '@/types';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await productsService.create({
        name: data.name,
        product_code: data.product_code,
        production_line: data.production_line,
        critical_regions: {}
      });
      setIsModalOpen(false);
      reset();
      fetchProducts();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
              <th className="p-4">ID</th>
              <th className="p-4">Product Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Production Line</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">No products found.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">#{product.id}</td>
                  <td className="p-4">{product.product_code}</td>
                  <td className="p-4">{product.name}</td>
                  <td className="p-4">{product.production_line}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Product</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Product Code</label>
                <input {...register("product_code", { required: true })} className="w-full p-2 border rounded" placeholder="e.g. PCB-X1" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input {...register("name", { required: true })} className="w-full p-2 border rounded" placeholder="e.g. Logic Board X1" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Production Line</label>
                <input {...register("production_line", { required: true })} className="w-full p-2 border rounded" placeholder="e.g. L-1A" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
