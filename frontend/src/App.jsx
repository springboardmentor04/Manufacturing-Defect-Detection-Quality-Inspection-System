import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import QualityEngineerDashboard from "./pages/QualityEngineerDashboard";
import FactorySupervisorDashboard from "./pages/FactorySupervisorDashboard";
import UploadImage from "./pages/UploadImage";
import InspectionResult from "./pages/InspectionResult";
import QualityReports from "./pages/QualityReports";
import InspectionHistory from "./pages/InspectionHistory";
import StartAIInspection from "./pages/StartAIInspection";
import Profile from "./pages/Profile";
import ProductionOverview from "./pages/ProductionOverview";
import InspectionReports from "./pages/InspectionReports";
import QualityAnalytics from "./pages/QualityAnalytics";
import ProductionMonitoring from "./pages/ProductionMonitoring";
import FactoryPerformance from "./pages/FactoryPerformance";
function Layout() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboards */}
        <Route
          path="/quality-dashboard"
          element={<QualityEngineerDashboard />}
        />

        <Route
  path="/supervisor-dashboard"
  element={<FactorySupervisorDashboard />}
/>
<Route path="/production-overview" element={<ProductionOverview />} />
<Route path="/inspection-reports" element={<InspectionReports />} />
<Route path="/quality-analytics" element={<QualityAnalytics />} />
<Route
  path="/production-monitoring"
  element={<ProductionMonitoring />}
/>
<Route
  path="/factory-performance"
  element={<FactoryPerformance />}
/>

        {/* Quality Engineer Pages */}
        <Route path="/upload" element={<UploadImage />} />
        <Route
          path="/inspection-result"
          element={<InspectionResult />}
        />
        <Route path="/start-ai-inspection" element={<StartAIInspection />} />
        <Route path="/quality-reports" element={<QualityReports />} />
        <Route path="/inspection-history" element={<InspectionHistory />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
      </Routes>

      <Footer />
    </>
  );
}

function App() {
  return <Layout />;
}

export default App;