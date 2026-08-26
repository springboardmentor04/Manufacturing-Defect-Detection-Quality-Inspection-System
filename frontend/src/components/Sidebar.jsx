import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QE_NAV = [
  { to: '/app/dashboard', icon: '▣', label: 'Dashboard' },
  { to: '/app/upload', icon: '↑', label: 'Upload Product Image' },
  { to: '/app/results', icon: '🔍', label: 'Product Inspection Results' },
  { to: '/app/analytics', icon: '📊', label: 'Defect Analytics' },
  { to: '/app/history', icon: '🕔', label: 'Inspection History' },
  { to: '/app/reports', icon: '📋', label: 'Quality Reports' },
];

const SUP_NAV = [
  { to: '/app/dashboard', icon: '▣', label: 'Dashboard' },
  { to: '/app/overview', icon: '🏭', label: 'Production Overview' },
  { to: '/app/monitoring', icon: '📡', label: 'Production Monitoring' },
  { to: '/app/trends', icon: '📈', label: 'Trends' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user.role === 'supervisor' ? SUP_NAV : QE_NAV;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 22px' }}>
        <div className="logo-mark">V</div>
        <div>
          <div className="font-display" style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 }}>
            VisionInspect AI
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>QUALITY INSPECTION</div>
        </div>
      </div>

      <div>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="icon">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
        <div style={{ padding: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--teal)',
                fontSize: 13,
              }}
            >
              {(user.full_name || 'U').slice(0, 1)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 150,
                }}
              >
                {user.full_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
        <div className="sidebar-nav-item" style={{ color: '#ff9aa4' }} onClick={handleLogout}>
          <span className="icon">➤</span> Sign Out
        </div>
      </div>
    </aside>
  );
}
