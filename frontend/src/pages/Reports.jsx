import { Fragment, useEffect, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, StatusPill, SeverityPill } from '../components/Shared';

function ReportDetailRow({ date }) {
  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Api.reportDetail(date)
      .then((r) => {
        if (!cancelled) setInspections(r.inspections);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0 }}>
        <div style={{ padding: '14px 4px' }}>
          {error ? (
            <ErrorBanner message={error} />
          ) : !inspections ? (
            <Skeleton h={80} />
          ) : inspections.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Line</th>
                  <th>Defect</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product_name}</td>
                    <td>{i.production_line || '—'}</td>
                    <td>{i.defect_type}</td>
                    <td>
                      <StatusPill status={i.status} />
                    </td>
                    <td>
                      <SeverityPill level={i.severity_level} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No detail available" subtitle="" />
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Reports() {
  useSetPageHeader('Quality Reports', "Daily inspection summaries — click a row to see that day's detail.");

  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  const [openDate, setOpenDate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Api.reports(30)
      .then((r) => {
        if (!cancelled) setReports(r.reports);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!reports) return <Skeleton h={400} />;
  if (!reports.length) {
    return (
      <div className="card">
        <EmptyState title="No reports yet" subtitle="Reports are generated automatically from your daily inspections." />
      </div>
    );
  }

  return (
    <div className="card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Inspected</th>
            <th>Passed</th>
            <th>Defects</th>
            <th>Critical</th>
            <th>High</th>
            <th>Yield</th>
            <th>Avg Confidence</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <Fragment key={r.report_date}>
              <tr
                className="report-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpenDate(openDate === r.report_date ? null : r.report_date)}
              >
                <td className="font-mono">{r.report_date}</td>
                <td>{r.total_inspected}</td>
                <td style={{ color: 'var(--low)' }}>{r.passed}</td>
                <td style={{ color: r.defects ? 'var(--critical)' : 'var(--text-muted)' }}>{r.defects}</td>
                <td>{r.critical_defects}</td>
                <td>{r.high_defects}</td>
                <td className="font-mono">{r.yield_percent}%</td>
                <td className="font-mono">{r.avg_confidence}%</td>
              </tr>
              {openDate === r.report_date && <ReportDetailRow date={r.report_date} />}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
