import { useCallback, useEffect, useRef, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, InspectionsTable } from '../components/Shared';

export default function Monitoring() {
  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(() => {
    Api.listInspections({ limit: 20 })
      .then((r) => {
        setInspections(r.inspections);
        setLastUpdated(new Date());
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);

  useSetPageHeader(
    'Production Monitoring',
    'Live feed of the most recent inspections across the plant.',
    <button className="btn-ghost" onClick={load}>
      ↺ Refresh Now
    </button>
  );

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 20000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  return (
    <div className="card">
      {error ? (
        <ErrorBanner message={error} />
      ) : !inspections ? (
        <Skeleton h={360} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--low)',
                display: 'inline-block',
                boxShadow: '0 0 8px var(--low)',
              }}
            ></span>
            Auto-refreshing every 20s · last updated {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : '—'}
          </div>
          {inspections.length ? (
            <InspectionsTable rows={inspections} />
          ) : (
            <EmptyState title="No recent activity" subtitle="Inspections logged by quality engineers will appear here in real time." />
          )}
        </>
      )}
    </div>
  );
}
