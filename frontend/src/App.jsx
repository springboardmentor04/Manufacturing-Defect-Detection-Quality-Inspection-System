import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Detection from "./pages/Detection";
import Results from "./pages/Results";

import Supervisor from "./pages/Supervisor";
import SupervisorResults from "./pages/SupervisorResults";
import SupervisorAnalytics from "./pages/SupervisorAnalytics";


// ============================================================
// ROLE PROTECTED ROUTE
// ============================================================

function RoleRoute({ allowedRole, children }) {

  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  // Not logged in
  if (!token || !userData) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  let user;

  try {
    user = JSON.parse(userData);
  } catch (error) {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const userRole = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase();

  const requiredRole = String(
    allowedRole || ""
  )
    .trim()
    .toLowerCase();


  // ==========================================================
  // WRONG ROLE
  // ==========================================================

  if (userRole !== requiredRole) {

    if (
      userRole ===
      "factory supervisor"
    ) {
      return (
        <Navigate
          to="/supervisor"
          replace
        />
      );
    }


    if (
      userRole ===
      "quality engineer"
    ) {
      return (
        <Navigate
          to="/dashboard"
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


  return children;
}


// ============================================================
// APPLICATION
// ============================================================

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* ==================================================
            LOGIN
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


        {/* ==================================================
            QUALITY ENGINEER
        ================================================== */}

        <Route
          path="/dashboard"
          element={
            <RoleRoute
              allowedRole="Quality Engineer"
            >
              <Dashboard />
            </RoleRoute>
          }
        />


        <Route
          path="/upload"
          element={
            <RoleRoute
              allowedRole="Quality Engineer"
            >
              <Upload />
            </RoleRoute>
          }
        />


        <Route
          path="/detection"
          element={
            <RoleRoute
              allowedRole="Quality Engineer"
            >
              <Detection />
            </RoleRoute>
          }
        />


        <Route
          path="/results"
          element={
            <RoleRoute
              allowedRole="Quality Engineer"
            >
              <Results />
            </RoleRoute>
          }
        />


        {/* ==================================================
            FACTORY SUPERVISOR
        ================================================== */}

        <Route
          path="/supervisor"
          element={
            <RoleRoute
              allowedRole="Factory Supervisor"
            >
              <Supervisor />
            </RoleRoute>
          }
        />


        <Route
          path="/supervisor/results"
          element={
            <RoleRoute
              allowedRole="Factory Supervisor"
            >
              <SupervisorResults />
            </RoleRoute>
          }
        />


        <Route
          path="/supervisor/analytics"
          element={
            <RoleRoute
              allowedRole="Factory Supervisor"
            >
              <SupervisorAnalytics />
            </RoleRoute>
          }
        />


        {/* ==================================================
            UNKNOWN ROUTE
        ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;