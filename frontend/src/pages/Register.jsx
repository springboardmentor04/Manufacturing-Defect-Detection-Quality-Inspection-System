import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plant, setPlant] = useState('');
  const [role, setRole] = useState('quality_engineer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) return <Navigate to="/app" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        plant: plant.trim() || 'Main Plant',
        role,
      };
      const { token, user } = await Api.register(payload);
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
          Create your account
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '0 0 24px' }}>
          Register with your work email and select your role to get started.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Full Name</label>
            <input
              className="field-input"
              type="text"
              placeholder="Dr. Alex Rowe"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
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
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Plant / Facility</label>
            <input
              className="field-input"
              type="text"
              placeholder="Main Plant"
              value={plant}
              onChange={(e) => setPlant(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label className="field-label">User Role</label>
            <select className="field-input" required value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="quality_engineer">Quality Engineer (Image Upload &amp; Defect Pipeline)</option>
              <option value="supervisor">Factory Supervisor (Production Monitoring &amp; Trends)</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Creating account…
              </>
            ) : (
              'Register Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          Already have an account? <Link className="link-teal" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
