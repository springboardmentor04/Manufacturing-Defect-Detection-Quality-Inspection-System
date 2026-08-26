import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { KpiCard, Skeleton, ErrorBanner, EmptyState, InspectionsTable } from '../components/Shared';

export default function QEDashboard() {
  const { user } = useAuth();
  useSetPageHeader(
    'Dashboard',
    `Welcome back, ${user.full_name.split(' ')[0]} — here's how quality looks right now.`,
    <Link to="/app/upload" className="btn-primary" style={{ width: 'auto', display: 'inline-block', textDecoration: 'none', padding: '10px 16px' }}>
      + Upload Product Image
    </Link>
  );

  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setRecent(null);
    setError('');
    Promise.all([Api.summary(), Api.listInspections({ limit: 6 })])
      .then(([s, r]) => {
        if (cancelled) return;
        setSummary(s);
        setRecent(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;

  if (!summary || !recent) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <Skeleton h={96} />
          <Skeleton h={96} />
          <Skeleton h={96} />
          <Skeleton h={96} />
        </div>
        <Skeleton h={280} />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Total Products Inspected" value={summary.total_products_inspected} />
        <KpiCard label="Defects Detected" value={summary.defects_detected} accent="var(--critical)" />
        <KpiCard label="Quality Score" value={summary.quality_score_percent} suffix="%" />
        <KpiCard label="AI Confidence" value={summary.ai_confidence_percent} suffix="%" />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 15 }}>
            Recent Inspections
          </h3>
          <Link to="/app/results" className="link-teal" style={{ fontSize: 12.5 }}>
            View all →
          </Link>
        </div>
        {recent.inspections.length ? (
          <InspectionsTable rows={recent.inspections} />
        ) : (
          <EmptyState title="No inspections yet" subtitle="Upload a product image to run your first AI inspection." />
        )}
      </div>
    </>
  );
}
