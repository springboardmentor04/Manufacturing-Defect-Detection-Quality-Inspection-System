import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) return <Navigate to="/app" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await Api.login({ email: email.trim(), password });
      login(token, user);
      navigate('/app');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div className="logo-mark">V</div>
          <div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
              VisionInspect AI
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              QUALITY INSPECTION SYSTEM
            </div>
          </div>
        </div>

        <h1 className="font-display" style={{ fontSize: 22, margin: '0 0 4px' }}>
          Sign in to your account
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '0 0 24px' }}>
          Enter your registered email and password to access your inspection dashboard.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Email Address</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@plant.com"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          Don't have an account? <Link className="link-teal" to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
