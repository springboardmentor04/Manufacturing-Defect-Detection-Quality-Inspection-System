import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

// Admin Sub-Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import UserManagementPage from './pages/admin/UserManagementPage.jsx';
import DatasetManagementPage from './pages/admin/DatasetManagementPage.jsx';
import AIModelManagementPage from './pages/admin/AIModelManagementPage.jsx';
import SystemHealthPage from './pages/admin/SystemHealthPage.jsx';
import ActivityLogsPage from './pages/admin/ActivityLogsPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';

// Supervisor Sub-Pages
import ProductionOverviewPage from './pages/supervisor/ProductionOverviewPage.jsx';
import InspectionReportsPage from './pages/supervisor/InspectionReportsPage.jsx';
import DefectTrendsPage from './pages/supervisor/DefectTrendsPage.jsx';
import QualityAnalyticsPage from './pages/supervisor/QualityAnalyticsPage.jsx';
import ProductionMonitoringPage from './pages/supervisor/ProductionMonitoringPage.jsx';

// Quality Engineer Sub-Pages
import UploadImagePage from './pages/quality/UploadImagePage.jsx';
import InspectionResultPage from './pages/quality/InspectionResultPage.jsx';
import DefectDetailsPage from './pages/quality/DefectDetailsPage.jsx';
import QualityReportPage from './pages/quality/QualityReportPage.jsx';
import InspectionHistoryPage from './pages/quality/InspectionHistoryPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root & Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin Portal Nested Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/datasets" element={<DatasetManagementPage />} />
        <Route path="/admin/models" element={<AIModelManagementPage />} />
        <Route path="/admin/system-health" element={<SystemHealthPage />} />
        <Route path="/admin/activity-logs" element={<ActivityLogsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />

        {/* Supervisor Portal Nested Routes */}
        <Route path="/supervisor" element={<Navigate to="/supervisor/production-overview" replace />} />
        <Route path="/supervisor/production-overview" element={<ProductionOverviewPage />} />
        <Route path="/supervisor/inspection-reports" element={<InspectionReportsPage />} />
        <Route path="/supervisor/defect-trends" element={<DefectTrendsPage />} />
        <Route path="/supervisor/quality-analytics" element={<QualityAnalyticsPage />} />
        <Route path="/supervisor/production-monitoring" element={<ProductionMonitoringPage />} />

        {/* Quality Engineer Portal Nested Routes */}
        <Route path="/quality" element={<Navigate to="/quality/upload-image" replace />} />
        <Route path="/quality/upload-image" element={<UploadImagePage />} />
        <Route path="/quality/inspection-result" element={<InspectionResultPage />} />
        <Route path="/quality/inspection-result/:id" element={<InspectionResultPage />} />
        <Route path="/quality/defect-details" element={<DefectDetailsPage />} />
        <Route path="/quality/defect-details/:id" element={<DefectDetailsPage />} />
        <Route path="/quality/quality-report" element={<QualityReportPage />} />
        <Route path="/quality/quality-report/:id" element={<QualityReportPage />} />
        <Route path="/quality/inspection-history" element={<InspectionHistoryPage />} />

        {/* Legacy redirect compatibility */}
        <Route path="/quality-engineer" element={<Navigate to="/quality/upload-image" replace />} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
