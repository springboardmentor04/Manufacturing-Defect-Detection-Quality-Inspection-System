import React, { useMemo, useState } from "react";
import "./SupervisorSubPages.css";

const inspectionData = [
  {
    id: "#INS-001",
    product: "images.jpg",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 95.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-002",
    product: "images.jpg",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 95.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-003",
    product: "images.jpg",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 95.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-004",
    product: "images.jpg",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 95.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-005",
    product: "005.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-006",
    product: "005.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-007",
    product: "002.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-008",
    product: "002.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-009",
    product: "005.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-010",
    product: "003.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-011",
    product: "019.png",
    prediction: "Defective",
    defect: "Manufacturing Defect",
    confidence: 24.72,
    severity: "High",
    decision: "FAIL",
  },
  {
    id: "#INS-012",
    product: "020.png",
    prediction: "Defective",
    defect: "Manufacturing Defect",
    confidence: 12.59,
    severity: "High",
    decision: "FAIL",
  },
  {
    id: "#INS-013",
    product: "015.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-014",
    product: "001.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 26.03,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-015",
    product: "001.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 26.03,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-016",
    product: "015.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-017",
    product: "015.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-018",
    product: "020.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 12.59,
    severity: "Low",
    decision: "REVIEW",
  },
  {
    id: "#INS-019",
    product: "020.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 12.59,
    severity: "Low",
    decision: "REVIEW",
  },
  {
    id: "#INS-020",
    product: "004.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-021",
    product: "000.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-022",
    product: "002.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-023",
    product: "019.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 28.82,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-024",
    product: "003.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-025",
    product: "004.png",
    prediction: "Passed",
    defect: "No Defect",
    confidence: 0.0,
    severity: "Low",
    decision: "PASS",
  },
  {
    id: "#INS-026",
    product: "017.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 6.29,
    severity: "Low",
    decision: "REVIEW",
  },
  {
    id: "#INS-027",
    product: "006.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 23.86,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-028",
    product: "006.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 23.86,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-029",
    product: "002.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 5.11,
    severity: "Low",
    decision: "REVIEW",
  },
  {
    id: "#INS-030",
    product: "021.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 7.99,
    severity: "Low",
    decision: "REVIEW",
  },
  {
    id: "#INS-031",
    product: "006.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 23.86,
    severity: "Medium",
    decision: "REVIEW",
  },
  {
    id: "#INS-032",
    product: "018.png",
    prediction: "Defective",
    defect: "broken_small",
    confidence: 16.17,
    severity: "Low",
    decision: "REVIEW",
  },
];

function SupervisorResults() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filteredData = useMemo(() => {
    return inspectionData.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.product.toLowerCase().includes(search.toLowerCase()) ||
        item.defect.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" ||
        (filter === "PASSED" && item.prediction === "Passed") ||
        (filter === "DEFECTIVE" && item.prediction === "Defective") ||
        (filter === "REVIEW" && item.decision === "REVIEW");

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const passed = inspectionData.filter(
    (item) => item.prediction === "Passed"
  ).length;

  const defective = inspectionData.filter(
    (item) => item.prediction === "Defective"
  ).length;

  const review = inspectionData.filter(
    (item) => item.decision === "REVIEW"
  ).length;

  return (
    <div className="supervisor-results-page">
      <main className="supervisor-results-main">

        <div className="supervisor-results-header">
          <div>
            <p className="supervisor-results-label">
              INSPECTION MONITORING
            </p>

            <h1>Inspection Results</h1>

            <p className="supervisor-results-description">
              Review completed product inspections and AI predictions.
            </p>
          </div>

          <div className="results-summary">
            <div>
              <strong>{inspectionData.length}</strong>
              <span>Total Inspections</span>
            </div>

            <div className="summary-pass">
              <strong>{passed}</strong>
              <span>Passed</span>
            </div>

            <div className="summary-defect">
              <strong>{defective}</strong>
              <span>Defective</span>
            </div>

            <div className="summary-review">
              <strong>{review}</strong>
              <span>Review</span>
            </div>
          </div>
        </div>

        <section className="results-panel">

          <div className="results-toolbar">

            <div className="results-filter-buttons">
              <button
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
              </button>

              <button
                className={filter === "PASSED" ? "active" : ""}
                onClick={() => setFilter("PASSED")}
              >
                Passed
              </button>

              <button
                className={filter === "DEFECTIVE" ? "active" : ""}
                onClick={() => setFilter("DEFECTIVE")}
              >
                Defective
              </button>

              <button
                className={filter === "REVIEW" ? "active" : ""}
                onClick={() => setFilter("REVIEW")}
              >
                Review
              </button>
            </div>

            <div className="results-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search inspection, product or defect..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

          <div className="results-table-wrapper">

            <table className="supervisor-results-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Prediction</th>
                  <th>Defect</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Decision</th>
                </tr>
              </thead>

              <tbody>

                {filteredData.map((item) => (
                  <tr key={item.id}>

                    <td className="inspection-id">
                      {item.id}
                    </td>

                    <td className="product-name">
                      {item.product}
                    </td>

                    <td>
                      <span
                        className={`prediction-badge ${
                          item.prediction === "Passed"
                            ? "prediction-pass"
                            : "prediction-defective"
                        }`}
                      >
                        {item.prediction}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          item.defect === "No Defect"
                            ? "no-defect"
                            : "defect-name"
                        }
                      >
                        {item.defect}
                      </span>
                    </td>

                    <td>
                      <div className="confidence-cell">
                        <span>
                          {item.confidence.toFixed(2)}%
                        </span>

                        <div className="confidence-track">
                          <div
                            className={`confidence-fill ${
                              item.prediction === "Passed"
                                ? "confidence-green"
                                : "confidence-red"
                            }`}
                            style={{
                              width: `${Math.min(
                                item.confidence,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`severity-badge severity-${item.severity.toLowerCase()}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`decision-badge decision-${item.decision.toLowerCase()}`}
                      >
                        {item.decision}
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

            {filteredData.length === 0 && (
              <div className="no-results">
                No inspection results found.
              </div>
            )}

          </div>

          <div className="results-footer">
            Showing <strong>{filteredData.length}</strong> of{" "}
            <strong>{inspectionData.length}</strong> inspections
          </div>

        </section>

      </main>
    </div>
  );
}

export default SupervisorResults;