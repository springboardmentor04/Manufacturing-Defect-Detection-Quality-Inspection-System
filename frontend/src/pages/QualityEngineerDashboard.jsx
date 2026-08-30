import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function QualityEngineerDashboard() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const loadInspections = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/inspections"
      );

      const data = await response.json();

      if (data.success) {
        setInspections(data.inspections);
      }
    } catch (error) {
      console.error("Failed to load inspections:", error);
    } finally {
      setLoading(false);
    }
  };
const loadAnalytics = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/inspection-analytics"
    );

    const data = await response.json();

    if (data.success) {
      setAnalytics(data);
    }

  } catch (error) {

    console.error(
      "Failed to load analytics:",
      error
    );

  }
};
  useEffect(() => {
  loadInspections();
  loadAnalytics();
}, []);
  const totalInspections = inspections.length;

  const passedProducts = inspections.filter(
    (item) => item.result === "GOOD"
  ).length;

  const defectiveProducts = inspections.filter(
    (item) => item.result === "DEFECT"
  ).length;
  const defectRate =
  totalInspections > 0
    ? ((defectiveProducts / totalInspections) * 100).toFixed(2)
    : 0;

  return (
    <div className="dashboard">

      {/* Hero Section */}
      <div className="hero">
        <h1>QualityEngineerDashboard</h1>
        <p>
          AI Manufacturing Defect Detection & Quality Inspection System
        </p>

        <div className="hero-btns">
          <button>Start Inspection</button>
          <button className="outline">
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="cards">

        <div className="card">
          <h2>{totalInspections}</h2>
          <p>Total Inspections</p>
        </div>

        <div className="card">
          <h2>{passedProducts}</h2>
          <p>Passed Products</p>
        </div>

        <div className="card">
          <h2>{defectiveProducts}</h2>
          <p>Defective Products</p>
        </div>

        <div className="card">
  <h2>{defectRate}%</h2>
  <p>Defect Rate</p>
</div>

      </div>

      {/* Graphs */}
      <div className="graph-section">

        <div className="graph-card">
          <h2>AI Inspection Trend</h2>

          <div className="fake-chart">
            <div style={{ height: "60%" }}></div>
            <div style={{ height: "90%" }}></div>
            <div style={{ height: "75%" }}></div>
            <div style={{ height: "100%" }}></div>
            <div style={{ height: "80%" }}></div>
          </div>
        </div>

        <div className="graph-card">
          <h2>Quality Score</h2>

          <div className="progress">
            <div className="progress-fill"></div>
          </div>

          <h3>98%</h3>

          <br />

          <h2>Defect Distribution</h2>

          <div
            style={{
              width: "170px",
              height: "170px",
              borderRadius: "50%",
              background:
                "conic-gradient(#22c55e 0% 80%, #ef4444 80% 100%)",
              margin: "20px auto",
            }}
          ></div>
        </div>

      </div>

      {/* Recent Inspection Results */}
      <div className="section">

        <h2>Recent Inspection Results</h2>

        {loading ? (
          <p>Loading inspection results...</p>
        ) : inspections.length === 0 ? (
          <p>No inspections available yet.</p>
        ) : (
          <div>

            {inspections.map((inspection, index) => (

              <div
                key={index}
                style={{
                  padding: "15px",
                  marginBottom: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                }}
              >

                <p>
                  <strong>Image:</strong>{" "}
                  {inspection.filename}
                </p>

                <p>
                  <strong>Result:</strong>{" "}
                  {inspection.result}
                </p>

                <p>
                  <strong>Prediction:</strong>{" "}
                  {inspection.prediction}
                </p>
                <p>
  <strong>Defect Type:</strong>{" "}
  {inspection.defect_type}
</p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {inspection.confidence}%
                </p>
                <p>
  <strong>Severity Score:</strong>{" "}
  {inspection.severity_score ?? "Not available"}
</p>

<p>
  <strong>Severity Level:</strong>{" "}
  {inspection.severity_level ?? "Not available"}
</p>
<p>
  <strong>Quality Decision:</strong>{" "}
  {inspection.quality_decision}
</p>

<p>
  <strong>Quality Recommendation:</strong>{" "}
  {inspection.quality_recommendation}
</p>

                <p>
                  <strong>Inspection:</strong>{" "}
                  {inspection.inspection_result}
                </p>

              </div>

            ))}

          </div>
        )}

      </div>

      {/* Features */}
      <div className="section">

        <h2>Features</h2>

        <div className="feature-grid">

          <Link to="/upload">
            <div>📤 Upload Product Image</div>
          </Link>

          <Link to="/start-ai-inspection">
            <div>🤖 Start AI Inspection</div>
          </Link>

          <Link to="/inspection-result">
            <div>📄 Inspection Results</div>
          </Link>

          <Link to="/quality-reports">
            <div>📊 Quality Reports</div>
          </Link>

          <Link to="/inspection-history">
            <div>🕒 Inspection History</div>
          </Link>

          <Link to="/profile">
            <div>👤 Profile</div>
          </Link>

        </div>

      </div>

      {/* Responsibilities */}
      <div className="section">

        <h2>Responsibilities</h2>

        <ul>
          <li>✔ Upload Product Images</li>
          <li>✔ Perform AI Inspection</li>
          <li>✔ Review Defect Details</li>
          <li>✔ Verify Pass/Fail Status</li>
          <li>✔ Generate Inspection Reports</li>
        </ul>

      </div>

    </div>
  );
}

export default QualityEngineerDashboard;