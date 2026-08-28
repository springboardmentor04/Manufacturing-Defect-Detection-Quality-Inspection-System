"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { reportsService } from '@/services/reports';
import { FileText, Download, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit } = useForm();
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getRecent();
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onGenerate = async (data: any) => {
    try {
      setGenerating(true);
      await reportsService.generate(data.report_type, data.date_range);
      setIsModalOpen(false);
      fetchReports();
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          Generate Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No reports generated yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                    <FileText size={24} />
                  </div>
                  <button className="text-slate-400 hover:text-blue-600">
                    <Download size={20} />
                  </button>
                </div>
                <h3 className="font-bold text-slate-800">{report.report_type.replace('_', ' ')}</h3>
                <p className="text-sm text-slate-500 mb-2">{report.date_range}</p>
                <p className="text-xs text-slate-400">Generated: {new Date(report.created_at).toLocaleString()}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded">By: User {report.generated_by}</span>
                  <a href={`http://localhost:8000/${report.file_path}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
                    View report
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate New Report</h2>
            <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Report Type</label>
                <select {...register("report_type")} className="w-full p-2 border rounded">
                  <option value="DAILY_SUMMARY">Daily Summary</option>
                  <option value="WEEKLY_QUALITY">Weekly Quality</option>
                  <option value="DEFECT_ANALYSIS">Defect Analysis</option>
                  <option value="BATCH_REPORT">Batch Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date Range</label>
                <select {...register("date_range")} className="w-full p-2 border rounded">
                  <option value="TODAY">Today</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
