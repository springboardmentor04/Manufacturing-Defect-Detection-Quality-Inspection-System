import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { KpiCard, Skeleton, ErrorBanner, EmptyState, ProductionLinesTable } from '../components/Shared';

export default function SupDashboard() {
  const { user } = useAuth();
  useSetPageHeader('Production Overview Dashboard', `Welcome back, ${user.full_name.split(' ')[0]} — plant-wide quality at a glance.`);

  const [summary, setSummary] = useState(null);
  const [lines, setLines] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([Api.summary(), Api.productionLines()])
      .then(([s, l]) => {
        if (cancelled) return;
        setSummary(s);
        setLines(l.lines);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;

  if (!summary || !lines) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <Skeleton h={96} />
          <Skeleton h={96} />
          <Skeleton h={96} />
          <Skeleton h={96} />
        </div>
        <Skeleton h={260} />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Total Products Inspected" value={summary.total_products_inspected} />
        <KpiCard label="Overall Quality Score" value={summary.quality_score_percent} suffix="%" />
        <KpiCard label="Active Production Lines" value={lines.length} />
        <KpiCard label="Avg AI Confidence" value={summary.ai_confidence_percent} suffix="%" />
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 15 }}>
            Production Line Status
          </h3>
          <Link to="/app/overview" className="link-teal" style={{ fontSize: 12.5 }}>
            Full overview →
          </Link>
        </div>
        {lines.length ? (
          <ProductionLinesTable lines={lines} />
        ) : (
          <EmptyState title="No production data yet" subtitle="Data will appear once quality engineers begin logging inspections." />
        )}
      </div>
    </>
  );
}
