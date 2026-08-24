import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function Home() {
  return (
    <div className="auth-shell">
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div className="auth-eyebrow">AI-Powered Visual Quality Inspection</div>
        <h1 style={{ fontSize: 40, marginBottom: 16 }}>VisionInspect-AI</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          Catch defects before they leave the line. Upload a photo, get a pass/fail
          call backed by a trained vision model, in seconds.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/login"><Button variant="primary">Sign in</Button></Link>
          <Link to="/register"><Button variant="secondary">Create account</Button></Link>
        </div>
      </div>
    </div>
  );
}
