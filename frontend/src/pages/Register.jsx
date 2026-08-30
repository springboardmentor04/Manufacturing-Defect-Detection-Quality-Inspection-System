import Navbar from "../components/Navbar";

function Results() {
  const savedResult = localStorage.getItem("inspectionResult");

  const result = savedResult ? JSON.parse(savedResult) : null;

  if (!result) {
    return (
      <>
        <Navbar />

        <div className="page">
          <div className="card">
            <h2>Inspection Results</h2>
            <p>No inspection has been completed yet.</p>
          </div>
        </div>
      </>
    );
  }

  const confidence = ((result.confidence || 0) * 100).toFixed(1);

  const severity = result.severity || {};
  const qualityControl = result.quality_control || {};

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="card">

          <h2>Inspection Results</h2>

          <p>
            Detailed product quality inspection report.
          </p>

          {/* BASIC RESULT */}

          <div className="result-summary">

            <div className="result-box">
              <h4>Prediction</h4>
              <strong>{result.prediction}</strong>
            </div>

            <div className="result-box">
              <h4>Confidence</h4>
              <strong>{confidence}%</strong>
            </div>

            <div className="result-box">
              <h4>Defect</h4>
              <strong>
                {result.defect ? "Yes" : "No"}
              </strong>
            </div>

            <div className="result-box">
              <h4>Defect Classification</h4>
              <strong>
                {result.defect_classification || "No Defect"}
              </strong>
            </div>

          </div>

          {/* PRODUCT INFORMATION */}

          <h3>Product Information</h3>

          <div className="details-grid">

            <p>
              <strong>Filename:</strong>{" "}
              {result.filename}
            </p>

            <p>
              <strong>Inspected By:</strong>{" "}
              {result.inspected_by}
            </p>

            <p>
              <strong>Role:</strong>{" "}
              {result.role}
            </p>

          </div>

          {/* DETECTIONS */}

          <h3>Detected Defects</h3>

          {result.detections && result.detections.length > 0 ? (
            <table className="results-table">

              <thead>
                <tr>
                  <th>Defect Type</th>
                  <th>Confidence</th>
                </tr>
              </thead>

              <tbody>
                {result.detections.map((detection, index) => (
                  <tr key={index}>
                    <td>{detection.class}</td>
                    <td>
                      {(detection.confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          ) : (
            <p>No defects detected.</p>
          )}

          {/* SEVERITY */}

          <h3>Severity Assessment</h3>

          <div className="severity-grid">

            <p>
              <strong>Size Score:</strong>{" "}
              {severity.size_score}/100
            </p>

            <p>
              <strong>Location Score:</strong>{" "}
              {severity.location_score}/100
            </p>

            <p>
              <strong>Defect Type Score:</strong>{" "}
              {severity.defect_type_score}/100
            </p>

            <p>
              <strong>Confidence Score:</strong>{" "}
              {severity.confidence_score}/100
            </p>

            <p>
              <strong>Overall Severity:</strong>{" "}
              {severity.overall_score}/100
            </p>

            <p>
              <strong>Severity Level:</strong>{" "}
              {severity.level}
            </p>

          </div>

          {/* QUALITY CONTROL */}

          <h3>Quality Control Decision</h3>

          <div className="quality-control">

            <p>
              <strong>Decision:</strong>{" "}
              {qualityControl.decision}
            </p>

            <p>
              <strong>Recommended Action:</strong>{" "}
              {qualityControl.recommended_action}
            </p>

          </div>

        </div>
      </div>
    </>
  );
}

export default Results;