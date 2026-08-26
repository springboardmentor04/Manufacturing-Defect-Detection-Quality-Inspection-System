import { useEffect, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, InspectionsTable } from '../components/Shared';

export default function History() {
  useSetPageHeader('Inspection History', "Full inspection log with filters for status and production line.");

  const [statusFilter, setStatusFilter] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ status: '', line: '' });
  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setInspections(null);
    setError('');
    const params = { limit: 100 };
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.line) params.line = appliedFilters.line;
    Api.listInspections(params)
      .then((r) => {
        if (!cancelled) setInspections(r.inspections);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  function applyFilters() {
    setAppliedFilters({ status: statusFilter, line: lineFilter.trim() });
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="field-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <input
            className="field-input"
            placeholder="Filter by production line…"
            style={{ width: 220 }}
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
          />
          <button className="btn-ghost" onClick={applyFilters}>
            Apply Filters
          </button>
        </div>
      </div>
      <div className="card">
        {error ? (
          <ErrorBanner message={error} />
        ) : !inspections ? (
          <Skeleton h={320} />
        ) : inspections.length ? (
          <InspectionsTable rows={inspections} />
        ) : (
          <EmptyState title="No matching inspections" subtitle="Try adjusting your filters." />
        )}
      </div>
    </>
  );
}
