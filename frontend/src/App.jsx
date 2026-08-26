import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import AppShell from './pages/AppShell';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Results from './pages/Results';
import AnalyticsPage from './pages/Analytics';
import History from './pages/History';
import Reports from './pages/Reports';
import Overview from './pages/Overview';
import Monitoring from './pages/Monitoring';
import Trends from './pages/Trends';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Quality Engineer routes */}
            <Route
              path="upload"
              element={
                <RoleRoute roles={['quality_engineer']}>
                  <Upload />
                </RoleRoute>
              }
            />
            <Route
              path="results"
              element={
                <RoleRoute roles={['quality_engineer']}>
                  <Results />
                </RoleRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <RoleRoute roles={['quality_engineer']}>
                  <AnalyticsPage />
                </RoleRoute>
              }
            />
            <Route
              path="history"
              element={
                <RoleRoute roles={['quality_engineer']}>
                  <History />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute roles={['quality_engineer']}>
                  <Reports />
                </RoleRoute>
              }
            />

            {/* Supervisor routes */}
            <Route
              path="overview"
              element={
                <RoleRoute roles={['supervisor']}>
                  <Overview />
                </RoleRoute>
              }
            />
            <Route
              path="monitoring"
              element={
                <RoleRoute roles={['supervisor']}>
                  <Monitoring />
                </RoleRoute>
              }
            />
            <Route
              path="trends"
              element={
                <RoleRoute roles={['supervisor']}>
                  <Trends />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
