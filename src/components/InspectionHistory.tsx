import React from 'react';
import { InspectionRecord } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface InspectionHistoryProps {
  inspectionHistory: InspectionRecord[];
  historyFilter: 'ALL' | 'PASS' | 'FAIL';
  onSetFilter: (value: 'ALL' | 'PASS' | 'FAIL') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenRecord: (record: InspectionRecord) => void;
}

export const InspectionHistory: React.FC<InspectionHistoryProps> = ({
  inspectionHistory,
  historyFilter,
  onSetFilter,
  searchTerm,
  onSearchChange,
  onOpenRecord
}) => {
  const filteredHistory = inspectionHistory.filter((item) => {
    const matchesFilter = historyFilter === 'ALL' ? true : item.passFail === historyFilter;
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || [item.productName, item.factoryLine, item.inspectionCode, item.defects[0]?.defectType || ''].join(' ').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const exportCsv = () => {
    const rows = filteredHistory.map((item) => [
      item.inspectionCode,
      item.productName,
      item.factoryLine,
      item.defects[0]?.defectType || 'None',
      item.severityScore.toFixed(1),
      item.passFail,
      new Date(item.timestamp).toLocaleString()
    ].join(','));

    const blob = new Blob([['inspectionCode,productName,factoryLine,defectType,severityScore,status,timestamp', ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inspection-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="section-history" className="glass-card p-6 rounded-3xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Inspection History & Quality Audit Log</h3>
          <p className="text-xs text-slate-500 font-medium">Historical defect logs and automated pass/fail decisions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search product..."
            className="px-3 py-2 rounded-2xl border border-slate-200 bg-white/70 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 rounded-2xl border border-teal-600/20 bg-teal-600/10 text-sm font-semibold text-teal-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white/40 p-1 rounded-2xl text-xs font-semibold border border-white/60 w-fit">
        <button type="button" onClick={() => onSetFilter('ALL')} className={`px-3 py-1 rounded-xl transition-all ${historyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}>
          All ({inspectionHistory.length})
        </button>
        <button type="button" onClick={() => onSetFilter('PASS')} className={`px-3 py-1 rounded-xl transition-all ${historyFilter === 'PASS' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'}`}>
          Pass ({inspectionHistory.filter((item) => item.passFail === 'PASS').length})
        </button>
        <button type="button" onClick={() => onSetFilter('FAIL')} className={`px-3 py-1 rounded-xl transition-all ${historyFilter === 'FAIL' ? 'bg-white text-red-800 shadow-xs font-bold' : 'text-slate-600'}`}>
          Fail ({inspectionHistory.filter((item) => item.passFail === 'FAIL').length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-2.5 px-3">Code</th>
              <th className="py-2.5 px-3">Product</th>
              <th className="py-2.5 px-3">Factory Line</th>
              <th className="py-2.5 px-3">Defect Type</th>
              <th className="py-2.5 px-3">Severity Score</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 font-medium">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                  <p className="font-semibold text-slate-700">No inspections available.</p>
                  <p className="mt-1">Run your first inspection.</p>
                </td>
              </tr>
            ) : filteredHistory.map((item) => (
              <tr key={item.id} className="hover:bg-white/60 transition-colors">
                <td className="py-3 px-3 font-mono font-semibold text-slate-700">{item.inspectionCode}</td>
                <td className="py-3 px-3 text-slate-900 font-bold">{item.productName}</td>
                <td className="py-3 px-3 text-slate-500">{item.factoryLine}</td>
                <td className="py-3 px-3 text-slate-700 font-medium">{item.defects[0]?.defectType || 'None'}</td>
                <td className="py-3 px-3"><SeverityBadge level={item.severityLevel} score={item.severityScore} size="sm" /></td>
                <td className="py-3 px-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.passFail === 'PASS' ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-red-500/10 text-red-800 border border-red-500/20'}`}>
                    {item.passFail}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">{new Date(item.timestamp).toLocaleTimeString()}</td>
                <td className="py-3 px-3 text-right">
                  <button type="button" onClick={() => onOpenRecord(item)} className="px-3 py-1 text-xs font-bold text-teal-700 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-600/20 rounded-full transition-all">
                    Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
