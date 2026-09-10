"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { reportsService } from '@/services/reports';
import { getAssetUrl } from '@/services/api';
import { FileText, Download, Plus, RotateCw, AlertCircle, CheckCircle2, X, Loader2, ExternalLink } from 'lucide-react';

interface ReportFormData {
  report_type: string;
  date_range: string;
}

const initialFormData: ReportFormData = {
  report_type: 'DAILY_SUMMARY',
  date_range: 'TODAY',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(initialFormData);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await reportsService.getRecent(50);
      setReports(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[ReportsPage] Failed to fetch reports:', error);
      let errorMsg = 'Failed to load reports from server.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
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
    fetchReports();
  }, [fetchReports]);

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setGenerateError(null);
    setGenerateSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isGenerating) return;
    setIsModalOpen(false);
    setGenerateError(null);
    setFormData(initialFormData);
  };

  const handleGenerate = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isGenerating) return;

    try {
      setIsGenerating(true);
      setGenerateError(null);

      const generated = await reportsService.generate(formData.report_type, formData.date_range);

      if (generated && generated.id) {
        setReports((prev) => [generated, ...prev.filter((r) => r.id !== generated.id)]);
      }

      setGenerateSuccess(`Report "${formData.report_type}" generated successfully!`);
      setTimeout(() => setGenerateSuccess(null), 4000);

      setIsModalOpen(false);
      setFormData(initialFormData);

      await fetchReports();
    } catch (error: any) {
      console.error('[ReportsPage] Error generating report:', error);
      let errorMsg = 'Failed to generate report.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        }
      } else if (error.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      setGenerateError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={26} />
            Quality Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export structured industrial quality inspection summaries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchReports()}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer"
            title="Refresh reports"
          >
            <RotateCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            Refresh
          </button>
          <button
            type="button"
            id="generate-report-btn"
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={20} />
            Generate Report
          </button>
        </div>
      </div>

      {generateSuccess && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{generateSuccess}</span>
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
            onClick={() => fetchReports()}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <span className="text-slate-600 font-medium">Loading reports...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-2">
              <FileText className="text-slate-300" size={36} />
              <p className="font-semibold text-slate-700">No reports generated yet</p>
              <p className="text-xs text-slate-400">Click &quot;Generate Report&quot; to compile your first quality PDF export.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report) => {
              const fileUrl = getAssetUrl(report.file_path);

              return (
                <div
                  key={report.id}
                  className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 border border-blue-100">
                        <FileText size={24} />
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono font-semibold rounded">
                        #{report.id}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {report.report_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Range: <span className="text-slate-800 font-semibold">{report.date_range}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Generated: {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Author: User #{report.generated_by || 1}
                    </span>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span>View File</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Generate Quality Report</h2>
                  <p className="text-xs text-slate-500">Configure report scope and time interval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isGenerating}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              {generateError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to Generate Report</p>
                    <p className="mt-0.5">{generateError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Report Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="report-type"
                  value={formData.report_type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, report_type: e.target.value }))}
                  disabled={isGenerating}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white"
                >
                  <option value="DAILY_SUMMARY">Daily Summary Report</option>
                  <option value="WEEKLY_QUALITY">Weekly Quality Report</option>
                  <option value="DEFECT_ANALYSIS">Defect Classification Analysis</option>
                  <option value="BATCH_REPORT">Production Batch Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date Range <span className="text-rose-500">*</span>
                </label>
                <select
                  id="date-range"
                  value={formData.date_range}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_range: e.target.value }))}
                  disabled={isGenerating}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white"
                >
                  <option value="TODAY">Today</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-report-btn"
                  onClick={handleCloseModal}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-generate-report-btn"
                  disabled={isGenerating}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Report'
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
