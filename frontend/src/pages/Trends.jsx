import { useEffect, useRef, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState } from '../components/Shared';
import { useChart } from '../utils/useChart';
import { CHART_DEFAULTS } from '../utils/format';

export default function Trends() {
  const [range, setRange] = useState('14');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useSetPageHeader(
    'Trends',
    'Inspection volume, defect rate and severity trend over time.',
    <select className="field-input" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(e.target.value)}>
      <option value="7">Last 7 days</option>
      <option value="14">Last 14 days</option>
      <option value="30">Last 30 days</option>
    </select>
  );

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError('');
    Api.trends(range)
      .then((r) => {
        if (!cancelled) setRows(r.days);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const barRef = useRef(null);
  const lineRef = useRef(null);

  const barConfig =
    rows && rows.length
      ? {
          type: 'bar',
          data: {
            labels: rows.map((d) => d.date.slice(5)),
            datasets: [
              { label: 'Passed', data: rows.map((d) => d.passed), backgroundColor: '#33d17a', borderRadius: 5, stack: 's' },
              { label: 'Defects', data: rows.map((d) => d.defects), backgroundColor: '#f0475a', borderRadius: 5, stack: 's' },
            ],
          },
          options: {
            plugins: { legend: { labels: { color: CHART_DEFAULTS.color, boxWidth: 10, font: { size: 11 } } } },
            scales: {
              x: { stacked: true, ticks: { color: CHART_DEFAULTS.color }, grid: { display: false } },
              y: { stacked: true, ticks: { color: CHART_DEFAULTS.color, precision: 0 }, grid: { color: CHART_DEFAULTS.grid } },
            },
          },
        }
      : null;

  const lineConfig =
    rows && rows.length
      ? {
          type: 'line',
          data: {
            labels: rows.map((d) => d.date.slice(5)),
            datasets: [
              {
                label: 'Avg Severity',
                data: rows.map((d) => d.avg_severity),
                borderColor: '#f2b544',
                backgroundColor: 'rgba(242,181,68,0.12)',
                fill: true,
                tension: 0.35,
              },
            ],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: CHART_DEFAULTS.color }, grid: { display: false } },
              y: { ticks: { color: CHART_DEFAULTS.color }, grid: { color: CHART_DEFAULTS.grid }, suggestedMax: 100 },
            },
          },
        }
      : null;

  useChart(barRef, barConfig);
  useChart(lineRef, lineConfig);

  if (error) return <ErrorBanner message={error} />;
  if (!rows) {
    return (
      <>
        <div className="card">
          <Skeleton h={280} />
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <Skeleton h={220} />
        </div>
      </>
    );
  }
  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState title="Not enough data yet" subtitle="Trends populate once inspections start being recorded." />
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
          Inspection Volume &amp; Defects
        </h3>
        <canvas ref={barRef} height={90}></canvas>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 15 }}>
          Average Severity Score
        </h3>
        <canvas ref={lineRef} height={80}></canvas>
      </div>
    </>
  );
}
