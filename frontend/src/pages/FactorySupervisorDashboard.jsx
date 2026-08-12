import { Link } from "react-router-dom";

function FactorySupervisorDashboard() {
  return (
    <div className="dashboard">

      {/* Hero */}
      <div className="hero">
        <h1>Factory Supervisor Dashboard</h1>
        <p>Production Monitoring & Quality Analytics</p>

        <div className="hero-btns">
          <button>Production Overview</button>
          <button className="outline">Factory Reports</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="cards">

        <div className="card">
          <h2>1500</h2>
          <p>Total Production</p>
        </div>

        <div className="card">
          <h2>1420</h2>
          <p>Total Inspections</p>
        </div>

        <div className="card">
          <h2>80</h2>
          <p>Total Defects</p>
        </div>

        <div className="card">
          <h2>95%</h2>
          <p>Production Efficiency</p>
        </div>

      </div>

      {/* Graph Section */}
      <div className="graph-section">

        <div className="graph-card">
          <h2>Production Overview</h2>

          <div className="fake-chart">
            <div style={{ height: "55%" }}></div>
            <div style={{ height: "75%" }}></div>
            <div style={{ height: "90%" }}></div>
            <div style={{ height: "65%" }}></div>
            <div style={{ height: "100%" }}></div>
          </div>
        </div>

        <div className="graph-card">
          <h2>Production Efficiency</h2>

          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: "95%" }}
            ></div>
          </div>

          <h3>95%</h3>

          <h2 style={{ marginTop: "30px" }}>Quality Analytics</h2>

          <div
            style={{
              width: "170px",
              height: "170px",
              borderRadius: "50%",
              background:
                "conic-gradient(#22c55e 0% 95%, #ef4444 95% 100%)",
              margin: "20px auto",
            }}
          ></div>

        </div>

      </div>

      {/* Features */}
      <div className="section">

        <h2>Features</h2>

        <div className="feature-grid">

          <Link to="/production-overview">
  <div>🏭 Production Overview</div>
</Link>

          <Link to="/inspection-reports">
  <div>📄 Inspection Reports</div>
</Link>

          <div>📈 Defect Trends</div>

          <Link to="/quality-analytics">
  <div>📊 Quality Analytics</div>
</Link>

        <Link to="/production-monitoring">
  <div>⚙️ Production Monitoring</div>
</Link>

          <Link to="/factory-performance">
  <div>🏆 Factory Performance</div>
</Link>

        </div>

      </div>


    </div>
  );
}

export default FactorySupervisorDashboard;