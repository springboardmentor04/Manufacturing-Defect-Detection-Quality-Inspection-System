import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import QualityDashboard from "./pages/QualityDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
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
          path="/quality-dashboard"
          element={<QualityDashboard />}
        />

        <Route
          path="/supervisor-dashboard"
          element={<SupervisorDashboard />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;