import { BrowserRouter, Routes, Route } from "react-router-dom";
import InspectionHistoryPage from "./pages/InspectionHistoryPage";
import Login from "./pages/Login";
import DefectAnalytics from "./pages/DefectAnalyticsPage";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InspectionResults from "./pages/InspectionResults";
import UploadProduct from "./pages/UploadProduct";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import ProductionOverview from "./pages/ProductionOverview";
import InspectionReports from "./pages/InspectionReports";
import DefectTrends from "./pages/DefectTrends";
import QualityReports from "./pages/QualityReports";
function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />
                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />
                <Route
    path="/inspection-history"
    element={<InspectionHistoryPage />}
                />
                <Route path="/inspection-results" element={<InspectionResults />} />

                <Route path="/upload-product" element={<UploadProduct />} />

                <Route path="/defect-analytics" element={<DefectAnalytics />} />
                <Route
    path="/supervisor/dashboard"
    element={<SupervisorDashboard/>}
/>
                <Route
    path="/supervisor/production-overview"
    element={<ProductionOverview/>}
/>  
                <Route
    path="/supervisor/inspection-reports"
    element={<InspectionReports />}
/>
                <Route
    path="/supervisor/defect-trends"
    element={<DefectTrends/>}
/>
<Route
        path="/quality-reports"
        element={<QualityReports />}
    />
            </Routes>
          


        </BrowserRouter>

    );

}

export default App;