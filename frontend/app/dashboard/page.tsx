"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/services/api';
import { productsService } from '@/services/products';
import { reportsService } from '@/services/reports';
import { inspectionsService } from '@/services/inspections';
import { UploadCloud, AlertTriangle, CheckCircle2, FileText, Download, Eye, ShieldCheck, Cpu, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { formatDefectType } from '@/utils/formatters';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const normalizeRole = (role?: string | null) => (role || '').toString().trim().replace(/\s+/g, '_').toUpperCase();

export default function DashboardPage() {
  const { user } = useAuth();
  const normalizedRole = normalizeRole(user?.role);
  const isQualityEngineer = ['QUALITY_ENGINEER', 'ADMIN'].includes(normalizedRole);
  const isSupervisorRole = ['SUPERVISOR', 'FACTORY_SUPERVISOR'].includes(normalizedRole);
  const [summary, setSummary] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboardResponse, inspectionResponse, reportResponse, productResponse] = await Promise.all([
        api.get('/analytics/dashboard'),
        inspectionsService.getAll(0, 20),
        reportsService.getRecent(5),
        productsService.getAll(0, 50),
      ]);

      setSummary(dashboardResponse.data);
      setInspections(inspectionResponse || []);
      setReports(reportResponse || []);
      setProducts(productResponse || []);
      if ((productResponse || []).length > 0 && !selectedProduct) {
        setSelectedProduct(productResponse[0].id);
      }
    } catch (loadError) {
      console.error('Failed to load dashboard data', loadError);
      setError('Unable to load dashboard data. Please check the backend connection and authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const recentInspectionRows = useMemo(() => {
    const source = summary?.recent_inspections || inspections;
    return source.slice(0, 6);
  }, [summary, inspections]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const runInspection = async () => {
    if (!selectedFile || !selectedProduct) {
      setUploadMessage('Please select a product and an image before running inspection.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage('Uploading image and running AI inspection...');
      const inspection = await inspectionsService.createAndRun(selectedProduct, null, selectedFile);
      setUploadMessage(`Inspection #${inspection.id} completed with ${inspection.final_decision || inspection.ai_decision || 'status'} .`);
      await loadData();
    } catch (uploadError) {
      console.error('Inspection run failed', uploadError);
      setUploadMessage('Inspection failed. Check backend logs and the uploaded image.');
    } finally {
      setIsUploading(false);
    }
  };

  const statusPill = (value: string) => {
    const normalized = (value || '').toUpperCase();
    if (normalized === 'PASS') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'FAIL') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const renderQualityEngineerDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Quality Engineer Dashboard</h1>
          <p className="text-slate-500">Defect monitoring, inspections, and AI validation.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total Inspections" value={summary?.total_inspections ?? 0} tone="blue" />
        <KpiCard label="Passed" value={summary?.passed_inspections ?? 0} tone="green" />
        <KpiCard label="Failed" value={summary?.failed_inspections ?? 0} tone="red" />
        <KpiCard label="Quality Rate" value={`${Number(summary?.quality_rate ?? 0).toFixed(1)}%`} tone="amber" />
        <KpiCard label="Critical Defects" value={summary?.critical_defects ?? 0} tone="red" />
        <KpiCard label="Average Severity" value={Number(summary?.average_severity ?? 0).toFixed(1)} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Defect Details</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">{summary?.total_detected_defects ?? 0} defects</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Defect Type</th>
                  <th className="px-4 py-3">Count</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(summary?.defect_types?.length ? summary.defect_types : []).map((defect: any) => (
                  <tr key={defect.name} className="text-sm text-slate-700">
                    <td className="px-4 py-3 font-medium">{formatDefectType(defect.name)}</td>
                    <td className="px-4 py-3">{defect.value}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Moderate</span>
                    </td>
                    <td className="px-4 py-3">{recentInspectionRows[0]?.product_name || 'N/A'}</td>
                    <td className="px-4 py-3">{recentInspectionRows[0]?.created_at ? new Date(recentInspectionRows[0].created_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
                {(!summary?.defect_types || summary.defect_types.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No defect records found yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isSupervisorRole && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Upload Product Image</h2>
              <Cpu className="text-blue-600" size={20} />
            </div>

            <div className="space-y-4">
              <select
                value={selectedProduct ?? ''}
                onChange={(event) => setSelectedProduct(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelection} />
                <UploadCloud className="mb-3 text-slate-500" size={42} />
                <span className="text-sm font-semibold text-slate-700">Choose product image</span>
                <span className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG, WEBP</span>
              </label>

              {preview && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img src={preview} alt="Selected product preview" className="h-56 w-full object-cover" />
                </div>
              )}

              <button
                type="button"
                onClick={runInspection}
                disabled={!selectedFile || !selectedProduct || isUploading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploading ? 'Running AI Inspection...' : 'Run Inspection'}
              </button>

              {uploadMessage && <p className="text-sm text-slate-600">{uploadMessage}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Quality Reports</h2>
            <FileText className="text-blue-600" size={20} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetricBox label="Total inspections" value={summary?.total_inspections ?? 0} />
            <MetricBox label="Passed" value={summary?.passed_inspections ?? 0} />
            <MetricBox label="Failed" value={summary?.failed_inspections ?? 0} />
            <MetricBox label="Defect rate" value={`${Number(summary?.defect_rate ?? 0).toFixed(1)}%`} />
          </div>
          <div className="mt-4 space-y-3">
            {reports.length > 0 ? reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="font-semibold text-slate-800">{report.report_type?.replace('_', ' ') || 'Report'}</p>
                  <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
                </div>
                <a href={report.file_path ? `http://localhost:8000/${report.file_path.replace(/^\//, '')}` : '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-600 shadow-sm hover:bg-slate-100">
                  <Download size={14} /> View
                </a>
              </div>
            )) : <p className="text-sm text-slate-500">No reports available yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Inspection Results</h2>
            <ShieldCheck className="text-emerald-600" size={20} />
          </div>
          <div className="space-y-3">
            {recentInspectionRows.length > 0 ? recentInspectionRows.map((inspection: any) => (
              <div key={inspection.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-800">#{inspection.id} · {inspection.product_name || 'Product'}</p>
                  <p className="text-xs text-slate-500">{inspection.batch_number || 'Batch not assigned'} · {new Date(inspection.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusPill((inspection.final_decision || inspection.decision || 'PASS'))}`}>
                  {inspection.final_decision || inspection.decision || 'PASS'}
                </span>
              </div>
            )) : <p className="text-sm text-slate-500">No inspection results available.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Inspection History</h2>
          <BarChart3 className="text-indigo-600" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Inspection ID</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">Defects</th>
                <th className="px-4 py-3 font-semibold">Quality</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inspections.length > 0 ? inspections.map((inspection: any) => (
                <tr key={inspection.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">#{inspection.id}</td>
                  <td className="px-4 py-3 text-slate-700">{inspection.product?.name || inspection.product_id || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(inspection.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusPill(inspection.final_decision || inspection.ai_decision || 'PASS')}`}>{inspection.final_decision || inspection.ai_decision || 'PASS'}</span></td>
                  <td className="px-4 py-3">{inspection.detections?.length || inspection.bounding_boxes?.length || 0}</td>
                  <td className="px-4 py-3">{inspection.severity_score ? `${Number(inspection.severity_score).toFixed(1)}` : 'N/A'}</td>
                  <td className="px-4 py-3"><a href={`/inspections/${inspection.id}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"><Eye size={14} /> View</a></td>
                </tr>
              )) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No inspection history yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSupervisorDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Factory Supervisor Dashboard</h1>
          <p className="text-slate-500">Production overview, defect trends, and quality performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Products Inspected" value={summary?.total_products_inspected ?? 0} tone="blue" />
        <KpiCard label="Total Inspections" value={summary?.total_inspections ?? 0} tone="indigo" />
        <KpiCard label="Pass Rate" value={`${Number(summary?.pass_rate ?? 0).toFixed(1)}%`} tone="green" />
        <KpiCard label="Defects Detected" value={summary?.total_detected_defects ?? 0} tone="red" />
        <KpiCard label="Failed" value={summary?.failed_inspections ?? 0} tone="red" />
        <KpiCard label="Avg Confidence" value={`${Number(summary?.average_confidence ?? 0).toFixed(1)}%`} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Production Overview</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetricBox label="Passed" value={summary?.passed_inspections ?? 0} />
            <MetricBox label="Failed" value={summary?.failed_inspections ?? 0} />
            <MetricBox label="Quality rate" value={`${Number(summary?.quality_rate ?? 0).toFixed(1)}%`} />
            <MetricBox label="Defect rate" value={`${Number(summary?.defect_rate ?? 0).toFixed(1)}%`} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Quality Analysis</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Overall pass rate</span><strong className="text-slate-900">{Number(summary?.pass_rate ?? 0).toFixed(1)}%</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Fail rate</span><strong className="text-slate-900">{Number(summary?.fail_rate ?? 0).toFixed(1)}%</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Most frequent defect</span><strong className="text-slate-900">{formatDefectType(summary?.defect_types?.[0]?.name) || 'N/A'}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Inspection volume</span><strong className="text-slate-900">{summary?.total_inspections ?? 0}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>Trend direction</span><strong className="text-slate-900 capitalize">{summary?.trend_direction || 'stable'}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Defect Trends</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" fill="#10b981" name="Passed" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Defect Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={(summary?.defect_types || []).map((entry: any) => ({ ...entry, displayName: formatDefectType(entry.name) }))} dataKey="value" nameKey="displayName" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {(summary?.defect_types || []).map((entry: any, index: number) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Recent Inspection Results</h2>
          <AlertTriangle className="text-amber-500" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Inspection</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">Defects</th>
                <th className="px-4 py-3 font-semibold">Quality</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentInspectionRows.length > 0 ? recentInspectionRows.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">#{item.id}</td>
                  <td className="px-4 py-3 text-slate-700">{item.product_name || 'N/A'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusPill(item.decision || 'PASS')}`}>{item.decision || 'PASS'}</span></td>
                  <td className="px-4 py-3">{item.defect_count || 0}</td>
                  <td className="px-4 py-3">{item.quality_score ? `${Number(item.quality_score).toFixed(1)}%` : 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</td>
                </tr>
              )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No supervisor monitoring data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {isQualityEngineer ? renderQualityEngineerDashboard() : renderSupervisorDashboard()}
    </DashboardLayout>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone: 'blue' | 'green' | 'red' | 'amber' | 'indigo' }) {
  const palette = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-3xl font-extrabold text-slate-900">{value}</span>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${palette[tone]}`}>{tone.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
