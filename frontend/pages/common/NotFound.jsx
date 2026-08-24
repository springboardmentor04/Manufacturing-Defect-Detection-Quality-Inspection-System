import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div style={{ textAlign: 'center' }}>
        <div className="auth-eyebrow mono">Error 404</div>
        <h1 style={{ fontSize: 36, marginBottom: 12 }}>Page not found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          That page doesn't exist, or you don't have access to it.
        </p>
        <Link to="/"><Button>Back to home</Button></Link>
      </div>
    </div>
  );
}
