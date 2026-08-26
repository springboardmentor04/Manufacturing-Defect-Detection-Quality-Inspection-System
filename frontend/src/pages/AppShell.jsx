import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { PageHeaderProvider, usePageHeader } from '../context/PageHeaderContext';

function Topbar() {
  const { title, subtitle, actions } = usePageHeader();
  return (
    <div className="topbar">
      <div>
        <h1 className="font-display" style={{ fontSize: 21, margin: 0 }}>
          {title}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{subtitle}</p>
      </div>
      <div>{actions}</div>
    </div>
  );
}

export default function AppShell() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <PageHeaderProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Topbar />
          <div>
            <Outlet />
          </div>
        </main>
      </div>
    </PageHeaderProvider>
  );
}
