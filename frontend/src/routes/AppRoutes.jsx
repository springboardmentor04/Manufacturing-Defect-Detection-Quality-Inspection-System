import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";

import QualityEngineerDashboard from "../pages/QualityEngineerDashboard";
import FactorySupervisorDashboard from "../pages/FactorySupervisorDashboard";

import Upload from "../pages/Upload";
import InspectionResults from "../pages/InspectionResults";
import DefectDetails from "../pages/DefectDetails";
import QualityReports from "../pages/QualityReports";
import InspectionHistory from "../pages/InspectionHistory";
import Profile from "../pages/Profile";

import ProductionOverview from "../pages/ProductionOverview";
import InspectionReports from "../pages/InspectionReports";
import DefectTrends from "../pages/DefectTrends";
import QualityAnalytics from "../pages/QualityAnalytics";
import ProductionMonitoring from "../pages/ProductionMonitoring";
import UserManagement from "../pages/UserManagement";

import NotFound from "../pages/NotFound";

import {
  getToken,
  getRole,
  normalizeRole,
} from "../utils/auth";


/* ============================================================
   PROTECTED ROUTE
============================================================ */

function ProtectedRoute({
  allowedRoles = [],
}) {

  const location = useLocation();

  const token = getToken();
  const role = normalizeRole(
    getRole()
  );


  /* ----------------------------------------------------------
     NOT AUTHENTICATED
  ---------------------------------------------------------- */

  if (!token) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }


  /* ----------------------------------------------------------
     INVALID ROLE
  ---------------------------------------------------------- */

  if (!role) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  /* ----------------------------------------------------------
     ROLE RESTRICTION
  ---------------------------------------------------------- */

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {

    if (
      role === "quality_engineer"
    ) {

      return (
        <Navigate
          to="/quality-engineer/dashboard"
          replace
        />
      );
    }


    if (
      role === "factory_supervisor"
    ) {

      return (
        <Navigate
          to="/factory-supervisor/dashboard"
          replace
        />
      );
    }


    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  return <Outlet />;
}


/* ============================================================
   PUBLIC ROUTE
   Prevent logged-in users from returning to login.
============================================================ */

function PublicRoute() {

  const token = getToken();
  const role = normalizeRole(
    getRole()
  );


  if (token && role) {

    if (
      role === "quality_engineer"
    ) {

      return (
        <Navigate
          to="/quality-engineer/dashboard"
          replace
        />
      );
    }


    if (
      role === "factory_supervisor"
    ) {

      return (
        <Navigate
          to="/factory-supervisor/dashboard"
          replace
        />
      );
    }
  }


  return <Outlet />;
}


/* ============================================================
   APPLICATION ROUTES
============================================================ */

function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>


        {/* =====================================================
            PUBLIC
        ===================================================== */}

        <Route element={<PublicRoute />}>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

        </Route>


        {/* =====================================================
            QUALITY ENGINEER
        ===================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "quality_engineer",
              ]}
            />
          }
        >

          <Route
            path="/quality-engineer/dashboard"
            element={
              <QualityEngineerDashboard />
            }
          />

          <Route
            path="/upload"
            element={<Upload />}
          />

          <Route
            path="/inspection-results"
            element={
              <InspectionResults />
            }
          />

          <Route
            path="/defect-details"
            element={
              <DefectDetails />
            }
          />

          <Route
            path="/quality-reports"
            element={
              <QualityReports />
            }
          />

          <Route
            path="/inspection-history"
            element={
              <InspectionHistory />
            }
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

        </Route>


        {/* =====================================================
            FACTORY SUPERVISOR
        ===================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "factory_supervisor",
              ]}
            />
          }
        >

          <Route
            path="/factory-supervisor/dashboard"
            element={
              <FactorySupervisorDashboard />
            }
          />

          <Route
            path="/factory-supervisor/production-overview"
            element={
              <ProductionOverview />
            }
          />

          <Route
            path="/factory-supervisor/inspection-reports"
            element={
              <InspectionReports />
            }
          />

          <Route
            path="/factory-supervisor/defect-trends"
            element={
              <DefectTrends />
            }
          />

          <Route
            path="/factory-supervisor/quality-analytics"
            element={
              <QualityAnalytics />
            }
          />

          <Route
            path="/factory-supervisor/production-monitoring"
            element={
              <ProductionMonitoring />
            }
          />

          <Route
            path="/factory-supervisor/user-management"
            element={
              <UserManagement />
            }
          />

        </Route>


        {/* =====================================================
            404
        ===================================================== */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>
  );
}


export default AppRoutes;