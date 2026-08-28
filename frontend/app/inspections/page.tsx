"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { inspectionsService } from '@/services/inspections';
import { Inspection } from '@/types';
import { Plus, Eye } from 'lucide-react';

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const data = await inspectionsService.getAll();
        setInspections(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInspections();
  }, []);

  const getStatusColor = (status: string) => {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'PASS') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'FAIL') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inspections</h1>
          <p className="text-slate-500">View and manage quality control inspections.</p>
        </div>
        <Link 
          href="/inspections/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          New Inspection
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
              <th className="p-4">ID</th>
              <th className="p-4">Product</th>
              <th className="p-4">AI Decision</th>
              <th className="p-4">Final Decision</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : inspections.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500">No inspections found.</td></tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">#{inspection.id}</td>
                  <td className="p-4">{inspection.product?.name || `Product ${inspection.product_id}`}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(inspection.ai_decision || '')}`}>
                      {inspection.ai_decision || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    {inspection.final_decision && (
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(inspection.final_decision)}`}>
                        {inspection.final_decision}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {inspection.severity_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${inspection.severity_score > 70 ? 'bg-red-500' : inspection.severity_score > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, inspection.severity_score))}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{inspection.severity_score.toFixed(1)}</span>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {new Date(inspection.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <Link 
                      href={`/inspections/${inspection.id}`}
                      className="inline-flex p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={20} />
                    </Link>
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
