import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getInspections } from "../utils/inspectionStorage";

function Results() {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // ============================================================
  // LOAD INSPECTIONS
  // ============================================================

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = () => {
    const data = getInspections();

    if (Array.isArray(data)) {
      setInspections(data);
    } else {
      setInspections([]);
    }
  };

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalInspections = inspections.length;

  const passedProducts = inspections.filter(
    (item) =>
      item.defect === false &&
      item.qualityDecision !== "REVIEW"
  ).length;

  const defectiveProducts = inspections.filter(
    (item) => item.defect === true
  ).length;

  const reviewProducts = inspections.filter(
    (item) => item.qualityDecision === "REVIEW"
  ).length;

  // ============================================================
  // VIEW / CLOSE
  // ============================================================

  const handleView = (inspection) => {
    setSelectedInspection(inspection);
  };

  const closeDetails = () => {
    setSelectedInspection(null);
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString();
  };

  // ============================================================
  // CONFIDENCE
  // ============================================================

  const getConfidenceValue = (inspection) => {
    const value = Number(inspection?.confidence || 0);

    if (value > 1) {
      return Math.min(value, 100);
    }

    return Math.min(value * 100, 100);
  };

  const getConfidence = (inspection) => {
    return getConfidenceValue(inspection).toFixed(2) + "%";
  };
    // ============================================================
  // MILESTONE 3 - DEFECT CLASSIFICATION
  // ============================================================

  const classifyDefect = (inspection) => {
    if (!inspection?.defect) {
      return "No Defect";
    }

    const text = String(
      inspection.defectType ||
      inspection.prediction ||
      ""
    ).toLowerCase();

    if (text.includes("crack")) {
      return "Crack";
    }

    if (
      text.includes("scratch")
    ) {
      return "Scratch";
    }

    if (
      text.includes("broken_small") ||
      text.includes("broken small")
    ) {
      return "Broken Small";
    }

    if (
      text.includes("broken_large") ||
      text.includes("broken large")
    ) {
      return "Broken Large";
    }

    if (
      text.includes("missing") ||
      text.includes("component")
    ) {
      return "Missing Component";
    }

    if (
      text.includes("contamination") ||
      text.includes("contamin")
    ) {
      return "Contamination";
    }

    if (
      text.includes("manufacturing") ||
      text.includes("manufacture")
    ) {
      return "Manufacturing Defect";
    }

    return inspection.defectType || "Other Defect";
  };
    // ============================================================
  // MILESTONE 3 - SEVERITY SCORE
  // ============================================================

  const calculateSeverity = (inspection) => {
    if (!inspection?.defect) {
      return 0;
    }

    const defectType = classifyDefect(inspection);

    // Defect Size - 30%
    let sizeScore = 40;

    if (defectType === "Broken Large") {
      sizeScore = 95;
    } else if (defectType === "Missing Component") {
      sizeScore = 90;
    } else if (defectType === "Crack") {
      sizeScore = 85;
    } else if (defectType === "Manufacturing Defect") {
      sizeScore = 70;
    } else if (defectType === "Contamination") {
      sizeScore = 60;
    } else if (defectType === "Broken Small") {
      sizeScore = 55;
    } else if (defectType === "Scratch") {
      sizeScore = 35;
    }

    // Defect Location - 25%
    let locationScore = 50;

    if (
      defectType === "Missing Component" ||
      defectType === "Broken Large" ||
      defectType === "Crack"
    ) {
      locationScore = 90;
    } else if (defectType === "Manufacturing Defect") {
      locationScore = 75;
    } else if (defectType === "Contamination") {
      locationScore = 65;
    } else if (defectType === "Scratch") {
      locationScore = 40;
    } else if (defectType === "Broken Small") {
      locationScore = 60;
    }

    // Defect Type - 25%
    let defectTypeScore = 50;

    if (
      defectType === "Crack" ||
      defectType === "Missing Component" ||
      defectType === "Broken Large"
    ) {
      defectTypeScore = 95;
    } else if (defectType === "Manufacturing Defect") {
      defectTypeScore = 75;
    } else if (defectType === "Broken Small") {
      defectTypeScore = 70;
    } else if (defectType === "Contamination") {
      defectTypeScore = 65;
    } else if (defectType === "Scratch") {
      defectTypeScore = 35;
    }

    // Detection Confidence - 20%
    const confidenceScore =
      getConfidenceValue(inspection);

    // Overall Severity
    const severityScore =
      sizeScore * 0.30 +
      locationScore * 0.25 +
      defectTypeScore * 0.25 +
      confidenceScore * 0.20;

    return Math.round(severityScore);
  };

  // ============================================================
  // SEVERITY LEVEL
  // ============================================================

  const getSeverityLevel = (score) => {
    if (score >= 80) {
      return "Critical";
    }

    if (score >= 60) {
      return "High";
    }

    if (score >= 40) {
      return "Medium";
    }

    return "Low";
  };

  const getSeverityColor = (level) => {
    if (level === "Critical") {
      return "#dc2626";
    }

    if (level === "High") {
      return "#ea580c";
    }

    if (level === "Medium") {
      return "#ca8a04";
    }

    return "#16a34a";
  };  // ============================================================
  // MILESTONE 3 - QUALITY ASSESSMENT
  // ============================================================

  const getQualityAssessment = (inspection) => {
    if (!inspection?.defect) {
      return {
        risk: "Low Risk",
        action: "Product is generally acceptable.",
        decision: "PASS"
      };
    }

    const score = calculateSeverity(inspection);

    if (score >= 80) {
      return {
        risk: "Critical Risk",
        action:
          "Reject product and trigger immediate quality inspection.",
        decision: "REJECT"
      };
    }

    if (score >= 60) {
      return {
        risk: "High Risk",
        action: "Repair or rework recommended.",
        decision: "REVIEW"
      };
    }

    if (score >= 40) {
      return {
        risk: "Moderate Risk",
        action:
          "Manual quality inspection required.",
        decision: "REVIEW"
      };
    }

    return {
      risk: "Low Risk",
      action: "Product is generally acceptable.",
      decision: "PASS"
    };
  };  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <>
      <Navbar />

      <div className="page">

        <div className="card">

          <h2>Inspection Results</h2>

          <p>
            View completed product quality inspections and
            detailed AI inspection results.
          </p>

          {/* STATISTICS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "30px",
              marginBottom: "35px"
            }}
          >

            <div
              style={{
                padding: "25px",
                border: "1px solid #dbe3ef",
                borderRadius: "14px",
                background: "#f8fafc"
              }}
            >
              <h3>Total Inspections</h3>
              <h1>{totalInspections}</h1>
            </div>

            <div
              style={{
                padding: "25px",
                border: "1px solid #b7ebcf",
                borderRadius: "14px",
                background: "#ecfdf5"
              }}
            >
              <h3>Passed</h3>

              <h1
                style={{
                  color: "#15803d"
                }}
              >
                {passedProducts}
              </h1>
            </div>

            <div
              style={{
                padding: "25px",
                border: "1px solid #fecaca",
                borderRadius: "14px",
                background: "#fff1f2"
              }}
            >
              <h3>Defective</h3>

              <h1
                style={{
                  color: "#dc2626"
                }}
              >
                {defectiveProducts}
              </h1>
            </div>

            <div
              style={{
                padding: "25px",
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                background: "#fff7ed"
              }}
            >
              <h3>Requires Review</h3>

              <h1
                style={{
                  color: "#c2410c"
                }}
              >
                {reviewProducts}
              </h1>
            </div>

          </div>

          {/* RESULTS TABLE */}

          {inspections.length === 0 ? (

            <div
              style={{
                textAlign: "center",
                padding: "50px"
              }}
            >
              <h3>No inspection results available.</h3>

              <p>
                Complete an inspection to see the results here.
              </p>
            </div>

          ) : (

            <div
              style={{
                overflowX: "auto"
              }}
            >

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse"
                }}
              >

                <thead>

                  <tr
                    style={{
                      background: "#f1f5f9"
                    }}
                  >

                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>Prediction</th>
                    <th style={thStyle}>Confidence</th>
                    <th style={thStyle}>Defect</th>
                    <th style={thStyle}>Classification</th>
                    <th style={thStyle}>Severity</th>
                    <th style={thStyle}>Decision</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Action</th>

                  </tr>

                </thead>

                <tbody>

                  {inspections.map(
                    (inspection, index) => {

                      const isDefective =
                        inspection.defect === true;

                      const severityScore =
                        calculateSeverity(
                          inspection
                        );

                      const severityLevel =
                        getSeverityLevel(
                          severityScore
                        );

                      const quality =
                        getQualityAssessment(
                          inspection
                        );

                      return (
                        <tr
                          key={
                            inspection.id ||
                            inspection.createdAt ||
                            index
                          }
                        >

                          <td style={tdStyle}>
                            {inspection.id ||
                              inspection.createdAt ||
                              index + 1}
                          </td>

                          <td style={tdStyle}>
                            {inspection.productName ||
                              inspection.product ||
                              "Product"}
                          </td>

                          <td style={tdStyle}>
                            {inspection.prediction ||
                              (isDefective
                                ? "Defective"
                                : "Passed")}
                          </td>

                          <td style={tdStyle}>
                            {getConfidence(
                              inspection
                            )}
                          </td>

                          <td style={tdStyle}>

                            <span
                              style={{
                                fontWeight: "600",
                                color: isDefective
                                  ? "#dc2626"
                                  : "#16a34a"
                              }}
                            >
                              {isDefective
                                ? "Defective"
                                : "No Defect"}
                            </span>

                          </td>

                          <td style={tdStyle}>
                            {classifyDefect(
                              inspection
                            )}
                          </td>

                          <td style={tdStyle}>

                            {isDefective ? (

                              <div>

                                <strong
                                  style={{
                                    color:
                                      getSeverityColor(
                                        severityLevel
                                      )
                                  }}
                                >
                                  {severityScore}/100
                                </strong>

                                <br />

                                <span
                                  style={{
                                    color:
                                      getSeverityColor(
                                        severityLevel
                                      ),
                                    fontWeight: "600"
                                  }}
                                >
                                  {severityLevel}
                                </span>

                              </div>

                            ) : (

                              <span
                                style={{
                                  color: "#16a34a",
                                  fontWeight: "600"
                                }}
                              >
                                Low
                              </span>

                            )}

                          </td>

                          <td style={tdStyle}>

                            <span
                              style={{
                                fontWeight: "700",
                                color:
                                  quality.decision ===
                                  "REJECT"
                                    ? "#dc2626"
                                    : quality.decision ===
                                      "REVIEW"
                                    ? "#ea580c"
                                    : "#16a34a"
                              }}
                            >
                              {quality.decision}
                            </span>

                          </td>

                          <td style={tdStyle}>
                            {formatDate(
                              inspection.createdAt ||
                              inspection.timestamp ||
                              inspection.date
                            )}
                          </td>

                          <td style={tdStyle}>

                            <button
                              onClick={() =>
                                handleView(
                                  inspection
                                )
                              }
                              style={{
                                padding:
                                  "9px 15px",
                                border: "none",
                                borderRadius: "7px",
                                background:
                                  "#2563eb",
                                color: "white",
                                fontWeight: "600",
                                cursor: "pointer"
                              }}
                            >
                              View
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>      {/* ======================================================
          INSPECTION DETAILS
      ====================================================== */}

      {selectedInspection && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "30px"
            }}
          >

            <h2>
              Inspection Details
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px"
              }}
            >

              <DetailItem
                label="Inspection ID"
                value={
                  selectedInspection.id ||
                  selectedInspection.createdAt ||
                  "Not available"
                }
              />

              <DetailItem
                label="Product"
                value={
                  selectedInspection.productName ||
                  selectedInspection.product ||
                  "Product"
                }
              />

              <DetailItem
                label="Prediction"
                value={
                  selectedInspection.prediction ||
                  (selectedInspection.defect
                    ? "Defective"
                    : "Passed")
                }
              />

              <DetailItem
                label="Confidence"
                value={getConfidence(
                  selectedInspection
                )}
              />

              <DetailItem
                label="Defect"
                value={
                  selectedInspection.defect
                    ? "Defective"
                    : "No Defect"
                }
              />

              <DetailItem
                label="Classification"
                value={classifyDefect(
                  selectedInspection
                )}
              />

              <DetailItem
                label="Severity Score"
                value={`${calculateSeverity(
                  selectedInspection
                )}/100`}
              />

              <DetailItem
                label="Severity Level"
                value={getSeverityLevel(
                  calculateSeverity(
                    selectedInspection
                  )
                )}
              />

              <DetailItem
                label="Quality Risk"
                value={
                  getQualityAssessment(
                    selectedInspection
                  ).risk
                }
              />

              <DetailItem
                label="Recommended Action"
                value={
                  getQualityAssessment(
                    selectedInspection
                  ).action
                }
              />

              <DetailItem
                label="Final Decision"
                value={
                  getQualityAssessment(
                    selectedInspection
                  ).decision
                }
              />

              <DetailItem
                label="Inspection Time"
                value={formatDate(
                  selectedInspection.createdAt ||
                  selectedInspection.timestamp ||
                  selectedInspection.date
                )}
              />

            </div>

            <button
              onClick={closeDetails}
              style={{
                marginTop: "25px",
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Close
            </button>

          </div>

        </div>

      )}

    </>
  );
}


// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({ label, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "15px"
      }}
    >

      <small
        style={{
          display: "block",
          color: "#64748b",
          marginBottom: "6px"
        }}
      >
        {label}
      </small>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// ============================================================
// TABLE STYLES
// ============================================================

const thStyle = {
  padding: "16px 12px",
  textAlign: "left",
  fontSize: "14px",
  color: "#475569",
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "16px 12px",
  borderBottom:
    "1px solid #e2e8f0",
  fontSize: "14px",
  whiteSpace: "nowrap"
};


export default Results;