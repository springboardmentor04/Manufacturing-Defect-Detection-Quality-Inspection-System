import { Fragment, useEffect, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, StatusPill, SeverityPill } from '../components/Shared';
import { downloadInspectionReport } from '../utils/pdfReport';
import { useAuth } from '../context/AuthContext';

function ReportDetailRow({ date }) {
  const { user } = useAuth();
  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

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

  async function handleAction(inspectionId, mode) {
    setDownloadingId(inspectionId);
    try {
      const { inspection } = await Api.getInspection(inspectionId);

      // Convert the stored image to a base64 data URI so it embeds in the PDF
      let imgSrc = null;
      if (inspection.product?.image_url) {
        try {
          const res = await fetch(Api.fileUrl(inspection.product.image_url));
          const blob = await res.blob();
          imgSrc = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imgErr) {
          // If the image can't be fetched, continue without it
          imgSrc = null;
        }
      }

      await downloadInspectionReport(inspection, imgSrc, user.full_name, mode);
    } catch (err) {
      alert('Could not generate the PDF report: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  }

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
                  <th>Report</th>
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
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: 11.5, padding: '5px 10px' }}
                          onClick={() => handleAction(i.id, 'view')}
                          disabled={downloadingId === i.id}
                        >
                          {downloadingId === i.id ? <span className="spinner"></span> : '👁 View'}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: 11.5, padding: '5px 10px' }}
                          onClick={() => handleAction(i.id, 'download')}
                          disabled={downloadingId === i.id}
                        >
                          {downloadingId === i.id ? <span className="spinner"></span> : '↓ PDF'}
                        </button>
                      </div>
                    </td>
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