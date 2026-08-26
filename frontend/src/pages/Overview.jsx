import { useEffect, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, LineStatusPill, ProductionLinesTable } from '../components/Shared';

export default function Overview() {
  useSetPageHeader('Production Overview', 'Yield and defect performance broken down by production line.');

  const [lines, setLines] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Api.productionLines()
      .then((r) => {
        if (!cancelled) setLines(r.lines);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!lines) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Skeleton h={120} />
        <Skeleton h={120} />
        <Skeleton h={120} />
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="card">
        <EmptyState title="No production line data yet" subtitle="Line performance appears once inspections start being logged." />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 14, marginBottom: 20 }}>
        {lines.map((l) => (
          <div className="card" key={l.production_line}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>{l.production_line}</div>
              <LineStatusPill status={l.status} />
            </div>
            <div className="kpi-value" style={{ fontSize: 24 }}>
              {l.yield_percent}%
            </div>
            <div className="kpi-label" style={{ marginBottom: 12 }}>
              Yield Rate
            </div>
            <div className="progress-track" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: `${l.yield_percent}%`, background: 'var(--teal)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-muted)' }}>
              <span>{l.total_inspected} inspected</span>
              <span>{l.defects} defects</span>
              <span>Avg sev. {l.avg_severity}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
          All Lines — Detail
        </h3>
        <ProductionLinesTable lines={lines} />
      </div>
    </>
  );
}
