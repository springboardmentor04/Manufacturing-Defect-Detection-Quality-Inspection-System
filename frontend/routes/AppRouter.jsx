import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ======================================================
// Public Pages
// ======================================================

import Home from "../pages/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import NotFound from "../pages/common/NotFound";

// ======================================================
// Route Guards
// ======================================================

import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

// ======================================================
// Layout
// ======================================================

import DashboardLayout from "../components/layout/DashboardLayout";

// ======================================================
// Quality Engineer Pages
// ======================================================

import QEDashboard from "../pages/engineer/Dashboard";
import UploadImage from "../pages/engineer/UploadImage";
import InspectionHistory from "../pages/engineer/InspectionHistory";
import QEReports from "../pages/engineer/Reports";
import QEProfile from "../pages/engineer/Profile";

// ⭐ NEW — QE Defect Analytics
import DefectAnalytics from "../pages/engineer/DefectAnalytics";

// ======================================================
// Factory Supervisor Pages
// ======================================================

import SupervisorDashboard from "../pages/supervisor/Dashboard";
import Analytics from "../pages/supervisor/Analytics";
import SupervisorReports from "../pages/supervisor/Reports";
import Users from "../pages/supervisor/Users";
import SupervisorProfile from "../pages/supervisor/Profile";


export default function AppRouter() {

  return (

    <BrowserRouter>

      <Routes>

        {/* ==================================================
            PUBLIC ROUTES
        ================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        {/* ==================================================
            PROTECTED ROUTES
        ================================================== */}

        <Route element={<ProtectedRoute />}>


          {/* =================================================
              QUALITY ENGINEER
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allow={["quality_engineer"]}
              />
            }
          >

            <Route
              path="/qe"
              element={<DashboardLayout />}
            >

              {/* ---------------------------------------------
                  Default QE Route
              --------------------------------------------- */}

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
                }
              />


              {/* ---------------------------------------------
                  QE Dashboard
              --------------------------------------------- */}

              <Route
                path="dashboard"
                element={<QEDashboard />}
              />


              {/* ---------------------------------------------
                  Image Upload / AI Inspection
              --------------------------------------------- */}

              <Route
                path="upload"
                element={<UploadImage />}
              />


              {/* ---------------------------------------------
                  Inspection History
              --------------------------------------------- */}

              <Route
                path="history"
                element={<InspectionHistory />}
              />


              {/* ---------------------------------------------
                  Inspection Reports
              --------------------------------------------- */}

              <Route
                path="reports"
                element={<QEReports />}
              />


              {/* =================================================
                  ⭐ NEW — DEFECT ANALYTICS
                  
                  URL:
                  /qe/analytics
              ================================================= */}

              <Route
                path="analytics"
                element={<DefectAnalytics />}
              />


              {/* ---------------------------------------------
                  QE Profile
              --------------------------------------------- */}

              <Route
                path="profile"
                element={<QEProfile />}
              />

            </Route>

          </Route>


          {/* =================================================
              FACTORY SUPERVISOR
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allow={["supervisor"]}
              />
            }
          >

            <Route
              path="/supervisor"
              element={<DashboardLayout />}
            >

              {/* ---------------------------------------------
                  Default Supervisor Route
              --------------------------------------------- */}

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
                }
              />


              {/* ---------------------------------------------
                  Supervisor Dashboard
              --------------------------------------------- */}

              <Route
                path="dashboard"
                element={<SupervisorDashboard />}
              />


              {/* ---------------------------------------------
                  Supervisor Analytics
              --------------------------------------------- */}

              <Route
                path="analytics"
                element={<Analytics />}
              />


              {/* ---------------------------------------------
                  Supervisor Reports
              --------------------------------------------- */}

              <Route
                path="reports"
                element={<SupervisorReports />}
              />


              {/* ---------------------------------------------
                  User Management
              --------------------------------------------- */}

              <Route
                path="users"
                element={<Users />}
              />


              {/* ---------------------------------------------
                  Supervisor Profile
              --------------------------------------------- */}

              <Route
                path="profile"
                element={<SupervisorProfile />}
              />

            </Route>

          </Route>

        </Route>


        {/* ==================================================
            ERROR ROUTES
        ================================================== */}

        <Route
          path="/404"
          element={<NotFound />}
        />

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>

  );
}