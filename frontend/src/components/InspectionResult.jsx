import { useState } from 'react';
import { StatusPill, SeverityPill } from './Shared';
import { severityColor } from '../utils/format';
import { downloadInspectionReport } from '../utils/pdfReport';
import { useAuth } from '../context/AuthContext';

export default function InspectionResult({ insp, imgSrc }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadInspectionReport(insp, imgSrc, user.full_name);
    } catch (err) {
      alert('Could not generate the PDF report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 className="font-display" style={{ margin: 0, fontSize: 15 }}>
            Inspection Pipeline Output
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '4px 0 0' }}>
            {insp.product.product_name} · {insp.product.product_code}
          </p>
        </div>
        <StatusPill status={insp.status} />
      </div>

      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-soft)', marginBottom: 16 }}>
        <img src={imgSrc} style={{ width: '100%', display: 'block', maxHeight: 230, objectFit: 'cover' }} alt="Inspected product" />
        {insp.bbox && (
          <div
            className="bbox-overlay"
            style={{ left: `${insp.bbox.x}%`, top: `${insp.bbox.y}%`, width: `${insp.bbox.w}%`, height: `${insp.bbox.h}%` }}
          >
            <span className="bbox-label">
              {insp.defect_type} {insp.scores.confidence}%
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Defect Classification &amp; Multi-Factor Severity Score</span>
        <span className="font-mono" style={{ fontWeight: 700, color: severityColor(insp.severity_level) }}>
          {insp.severity_score} / 100
        </span>
      </div>
      <div className="progress-track" style={{ marginBottom: 16 }}>
        <div className="progress-fill" style={{ width: `${insp.severity_score}%`, background: severityColor(insp.severity_level) }}></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5, marginBottom: 16 }}>
        <div>Size <span className="font-mono" style={{ float: 'right' }}>{insp.scores.size}</span></div>
        <div>Location <span className="font-mono" style={{ float: 'right' }}>{insp.scores.location}</span></div>
        <div>Defect Type <span className="font-mono" style={{ float: 'right' }}>{insp.scores.type}</span></div>
        <div>Confidence <span className="font-mono" style={{ float: 'right' }}>{insp.scores.confidence}%</span></div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <SeverityPill level={insp.severity_level} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Defect: <strong style={{ color: 'var(--text)' }}>{insp.defect_type}</strong>
        </span>
      </div>

      <div style={{ background: 'var(--surface-3)', borderRadius: 9, padding: '12px 14px', fontSize: 12.5, marginBottom: 16 }}>
        <strong style={{ color: 'var(--teal)' }}>Recommendation:</strong>{' '}
        <span style={{ color: 'var(--text-muted)' }}>{insp.recommendation}</span>
      </div>

      <button type="button" className="btn-ghost" style={{ width: '100%' }} onClick={handleDownload} disabled={downloading}>
        {downloading ? (
          <>
            <span className="spinner"></span> Preparing PDF…
          </>
        ) : (
          '↓ Download Inspection Report (PDF)'
        )}
      </button>
    </>
  );
}
