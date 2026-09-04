import React, { FormEvent, useEffect, useState } from 'react';
import { PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../services/api';

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
  productName: '', productCode: '', category: '', manufacturer: '', factoryLine: 'Assembly Line A1', status: 'Active'
};

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProducts = async () => {
    try { setProducts(await fetchProducts()); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load products.'); }
  };
  useEffect(() => { void loadProducts(); }, []);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const saved = editingId ? await updateProduct(editingId, form) : await createProduct(form);
      setProducts((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setForm(emptyProduct); setEditingId(null); setMessage(editingId ? 'Product updated successfully.' : 'Product added successfully.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save product.'); }
  };
  const edit = (product: Product) => { setEditingId(product.id); setForm({ productName: product.productName, productCode: product.productCode, category: product.category, manufacturer: product.manufacturer, factoryLine: product.factoryLine, status: product.status }); setMessage(''); };
  const remove = async (id: string) => { if (!window.confirm('Delete this product?')) return; try { await deleteProduct(id); setProducts((current) => current.filter((item) => item.id !== id)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete product.'); } };

  return <div className="space-y-6 py-4">
    <div className="glass-card rounded-3xl p-6"><div className="flex items-center gap-2"><PackagePlus className="w-5 h-5 text-teal-700" /><div><h1 className="text-2xl font-bold text-slate-800">Products</h1><p className="text-xs text-slate-500">Manage the products available for quality inspections.</p></div></div></div>
    <form onSubmit={submit} className="glass-card rounded-3xl p-6 space-y-4">
      <h2 className="font-bold text-slate-800">{editingId ? 'Edit Product' : 'Add Product'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {[['productName','Product Name'], ['productCode','Product Code'], ['category','Category'], ['manufacturer','Manufacturer'], ['factoryLine','Factory Line']].map(([field, label]) => <label key={field} className="space-y-1"><span className="text-xs font-semibold text-slate-600">{label}</span><input required value={form[field as keyof typeof form]} onChange={(event) => updateField(field as keyof typeof form, event.target.value)} className="w-full rounded-xl glass-input px-3 py-2" /></label>)}
        <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">Status</span><select value={form.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-xl glass-input px-3 py-2"><option>Active</option><option>Inactive</option></select></label>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}{message && <p className="text-sm text-emerald-700">{message}</p>}
      <div className="flex gap-2"><button className="rounded-full bg-teal-600 px-5 py-2 text-sm font-bold text-white">{editingId ? 'Update Product' : 'Save Product'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyProduct); }} className="rounded-full border px-5 py-2 text-sm font-bold text-slate-700">Cancel</button>}</div>
    </form>
    <div className="glass-card rounded-3xl p-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="p-3">Product</th><th className="p-3">Code</th><th className="p-3">Category</th><th className="p-3">Line</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-slate-200/60"><td className="p-3 font-semibold">{product.productName}</td><td className="p-3 font-mono">{product.productCode}</td><td className="p-3">{product.category}</td><td className="p-3">{product.factoryLine}</td><td className="p-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(product)} className="text-teal-700"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => void remove(product.id)} className="text-red-700"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}{products.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No products available. Add your first product above.</td></tr>}</tbody></table></div>
  </div>;
};
