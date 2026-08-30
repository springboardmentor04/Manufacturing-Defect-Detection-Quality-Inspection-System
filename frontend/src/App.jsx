import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

import QEDashboard from "./pages/QualityEngineer/Dashboard";
import UploadImage from "./pages/QualityEngineer/UploadImage";
import InspectionHistory from "./pages/QualityEngineer/InspectionHistory";
import QualityReports from "./pages/QualityEngineer/QualityReports";
import AiCalibration from "./pages/QualityEngineer/AiCalibration";
import AnnotationStudio from "./pages/QualityEngineer/AnnotationStudio";
import AuditLogs from "./pages/QualityEngineer/AuditLogs";

import FSDashboard from "./pages/FactorySupervisor/Dashboard";
import InspectionReports from "./pages/FactorySupervisor/InspectionReports";
import DefectTrends from "./pages/FactorySupervisor/DefectTrends";
import QualityAnalytics from "./pages/FactorySupervisor/QualityAnalytics";
import ProductionMonitoring from "./pages/FactorySupervisor/ProductionMonitoring";
import UserManagement from "./pages/FactorySupervisor/UserManagement";
import IncidentCenter from "./pages/FactorySupervisor/IncidentCenter";
import LineHealth from "./pages/FactorySupervisor/LineHealth";
import BatchAnalytics from "./pages/FactorySupervisor/BatchAnalytics";

// Renders the correct dashboard depending on the logged-in user's role
function RoleDashboard() {
  const { user } = useAuth();
  return user?.role === "factory_supervisor" ? <FSDashboard /> : <QEDashboard />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleDashboard />
          </ProtectedRoute>
        }
      />

      {/* Quality Engineer only */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <UploadImage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspections"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <InspectionHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <QualityReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-calibration"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <AiCalibration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/annotation-studio"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <AnnotationStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute allowedRoles={["quality_engineer"]}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />

      {/* Factory Supervisor only */}
      <Route
        path="/incident-center"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <IncidentCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/line-health"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <LineHealth />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batch-analytics"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <BatchAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspection-reports"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <InspectionReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/defect-trends"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <DefectTrends />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quality-analytics"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <QualityAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-monitoring"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <ProductionMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <ProtectedRoute allowedRoles={["factory_supervisor"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Shared */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}
