"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { inspectionsService } from '@/services/inspections';
import { productsService } from '@/services/products';
import { formatApiError } from '@/services/api';
import { Inspection, Product } from '@/types';
import { Plus, Eye, RotateCw, AlertCircle, Camera, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function InspectionsPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupervisor = ['SUPERVISOR', 'FACTORY_SUPERVISOR'].includes(
    (user?.role || '').toString().trim().replace(/\s+/g, '_').toUpperCase()
  );

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [inspectionsData, productsData] = await Promise.all([
        inspectionsService.getAll(),
        productsService.getAll().catch(() => []),
      ]);
      setInspections(Array.isArray(inspectionsData) ? inspectionsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err: any) {
      console.error('[InspectionsPage] Failed to fetch inspections:', err);
      const formatted = formatApiError(err, 'Failed to load inspections from server.');
      setError(formatted);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const getStatusBadge = (decision: string) => {
    const norm = (decision || '').toUpperCase().trim();
    if (norm === 'PASS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          PASS
        </span>
      );
    }
    if (norm === 'FAIL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} />
          FAIL
        </span>
      );
    }
    if (norm === 'REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={12} />
          REVIEW
        </span>
      );
    }
    if (norm === 'REWORK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          REWORK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
        {decision || 'PENDING'}
      </span>
    );
  };

  const getProductName = (inspection: Inspection) => {
    if (inspection.product?.name) return inspection.product.name;
    if (inspection.product_id) {
      const found = products.find((p) => p.id === inspection.product_id);
      if (found) return found.name;
      return `Product #${inspection.product_id}`;
    }
    return 'General Part';
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Camera className="text-blue-600" size={26} />
            Inspection Records
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time automated optical defect detection and decision logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchInspections()}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer"
            title="Refresh inspection logs"
          >
            <RotateCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            Refresh
          </button>
          {!isSupervisor && (
            <Link
              href="/inspections/new"
              id="new-inspection-nav-btn"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus size={20} />
              New Inspection
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchInspections()}
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
                <th className="p-4">Product</th>
                <th className="p-4">AI Decision</th>
                <th className="p-4">Final Decision</th>
                <th className="p-4">Defects Detected</th>
                <th className="p-4">Inference Time</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-slate-600 font-medium">Loading inspection logs...</span>
                    </div>
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Camera className="text-slate-300" size={36} />
                      <p className="font-semibold text-slate-700">No inspections logged yet</p>
                      <p className="text-xs text-slate-400">
                        Run an inspection on the New Inspection page to record optical quality data.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                inspections.map((inspection) => {
                  const aiDecision =
                    inspection.quality_decision?.ai_decision ||
                    inspection.ai_decision ||
                    (inspection.detections && inspection.detections.length > 0 ? 'FAIL' : 'PASS');
                  const finalDecision =
                    inspection.quality_decision?.final_decision ||
                    inspection.final_decision ||
                    aiDecision;
                  const defectCount =
                    inspection.detections?.length ??
                    (inspection.bounding_boxes?.length ?? (aiDecision === 'FAIL' ? 1 : 0));

                  return (
                    <tr key={inspection.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-800">#{inspection.id}</td>
                      <td className="p-4 font-semibold text-slate-900">{getProductName(inspection)}</td>
                      <td className="p-4">{getStatusBadge(aiDecision)}</td>
                      <td className="p-4">{getStatusBadge(finalDecision)}</td>
                      <td className="p-4">
                        {defectCount > 0 ? (
                          <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full">
                            {defectCount} {defectCount === 1 ? 'Defect' : 'Defects'}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                            0 Defect (Clean)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-xs">
                        {inspection.processing_time_ms !== undefined
                          ? `${Number(inspection.processing_time_ms).toFixed(1)} ms`
                          : '-'}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {inspection.created_at
                          ? new Date(inspection.created_at).toLocaleString()
                          : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/inspections/${inspection.id}`}
                          className="inline-flex p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Inspection Report"
                        >
                          <Eye size={18} />
                        </Link>
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
