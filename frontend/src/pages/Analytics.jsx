import { useEffect, useRef, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState } from '../components/Shared';
import { useChart } from '../utils/useChart';
import { CHART_DEFAULTS } from '../utils/format';

export default function Analytics() {
  useSetPageHeader('Defect Analytics', 'Defect trends and classification breakdown across all inspections.');

  const [breakdown, setBreakdown] = useState(null);
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([Api.defectBreakdown(), Api.trends(14)])
      .then(([b, t]) => {
        if (cancelled) return;
        setBreakdown(b);
        setTrends(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const barRef = useRef(null);
  const donutRef = useRef(null);
  const lineRef = useRef(null);

  const barConfig =
    breakdown && breakdown.breakdown.length
      ? {
          type: 'bar',
          data: {
            labels: breakdown.breakdown.map((b) => b.defect_type),
            datasets: [{ label: 'Occurrences', data: breakdown.breakdown.map((b) => b.count), backgroundColor: '#17c9b2', borderRadius: 6 }],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: CHART_DEFAULTS.color }, grid: { display: false } },
              y: { ticks: { color: CHART_DEFAULTS.color, precision: 0 }, grid: { color: CHART_DEFAULTS.grid } },
            },
          },
        }
      : null;

  const SEVERITY_COLORS = { Critical: '#f0475a', High: '#f2884a', Medium: '#f2c744', Low: '#33d17a' };
  const donutConfig =
    breakdown && breakdown.severity_breakdown.length
      ? {
          type: 'doughnut',
          data: {
            labels: breakdown.severity_breakdown.map((s) => s.severity_level),
            datasets: [
              {
                data: breakdown.severity_breakdown.map((s) => s.count),
                backgroundColor: breakdown.severity_breakdown.map((s) => SEVERITY_COLORS[s.severity_level] || '#8a97b3'),
                borderWidth: 0,
              },
            ],
          },
          options: { plugins: { legend: { position: 'bottom', labels: { color: CHART_DEFAULTS.color, boxWidth: 10, font: { size: 11 } } } } },
        }
      : null;

  const lineConfig =
    trends && trends.days.length
      ? {
          type: 'line',
          data: {
            labels: trends.days.map((d) => d.date.slice(5)),
            datasets: [
              { label: 'Total Inspected', data: trends.days.map((d) => d.total), borderColor: '#17c9b2', backgroundColor: 'rgba(23,201,178,0.12)', fill: true, tension: 0.35 },
              { label: 'Defects', data: trends.days.map((d) => d.defects), borderColor: '#f0475a', backgroundColor: 'rgba(240,71,90,0.08)', fill: true, tension: 0.35 },
            ],
          },
          options: {
            plugins: { legend: { labels: { color: CHART_DEFAULTS.color, boxWidth: 10, font: { size: 11 } } } },
            scales: {
              x: { ticks: { color: CHART_DEFAULTS.color }, grid: { display: false } },
              y: { ticks: { color: CHART_DEFAULTS.color, precision: 0 }, grid: { color: CHART_DEFAULTS.grid } },
            },
          },
        }
      : null;

  useChart(barRef, barConfig);
  useChart(donutRef, donutConfig);
  useChart(lineRef, lineConfig);

  if (error) return <ErrorBanner message={error} />;

  if (!breakdown || !trends) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Skeleton h={260} />
          <Skeleton h={260} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Skeleton h={260} />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
            Defect Type Breakdown
          </h3>
          {breakdown.breakdown.length ? (
            <canvas ref={barRef} height={220}></canvas>
          ) : (
            <EmptyState title="No defects recorded" subtitle="Great news — no defective products yet." />
          )}
        </div>
        <div className="card">
          <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
            Severity Distribution
          </h3>
          {breakdown.severity_breakdown.length ? (
            <canvas ref={donutRef} height={220}></canvas>
          ) : (
            <EmptyState title="No severity data" subtitle="Severity levels will appear once defects are detected." />
          )}
        </div>
      </div>
      <div className="card">
        <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
          14-Day Inspection Trend
        </h3>
        {trends.days.length ? (
          <canvas ref={lineRef} height={90}></canvas>
        ) : (
          <EmptyState title="Not enough data yet" subtitle="Trends will populate as inspections are recorded each day." />
        )}
      </div>
    </>
  );
}
