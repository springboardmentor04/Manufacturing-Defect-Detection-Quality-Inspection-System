import React from "react";
import "./SupervisorSubPages.css";

const inspectionData = [
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Defective", decision: "FAIL", severity: "High", defect: "Manufacturing Defect" },
  { prediction: "Defective", decision: "FAIL", severity: "High", defect: "Manufacturing Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Passed", decision: "PASS", severity: "Low", defect: "No Defect" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Medium", defect: "broken_small" },
  { prediction: "Defective", decision: "REVIEW", severity: "Low", defect: "broken_small" },
];

function SupervisorAnalytics() {
  const total = inspectionData.length;

  const passed = inspectionData.filter(
    (item) => item.prediction === "Passed"
  ).length;

  const defective = inspectionData.filter(
    (item) => item.prediction === "Defective"
  ).length;

  const review = inspectionData.filter(
    (item) => item.decision === "REVIEW"
  ).length;

  const passRate = ((passed / total) * 100).toFixed(1);
  const defectRate = ((defective / total) * 100).toFixed(1);
  const reviewRate = ((review / total) * 100).toFixed(1);

  const high = inspectionData.filter(
    (item) => item.severity === "High"
  ).length;

  const medium = inspectionData.filter(
    (item) => item.severity === "Medium"
  ).length;

  const low = inspectionData.filter(
    (item) => item.severity === "Low"
  ).length;

  return (
    <div className="supervisor-analytics-page">

      <main className="supervisor-analytics-main">

        <div className="analytics-header">
          <div>
            <p className="analytics-label">
              QUALITY ANALYTICS
            </p>

            <h1>Production Analytics</h1>

            <p>
              Analyze inspection performance, manufacturing defects
              and quality trends.
            </p>
          </div>

          <div className="analytics-status">
            <span></span>
            Live Data
          </div>
        </div>

        {/* KPI CARDS */}

        <section className="analytics-kpi-grid">

          <div className="analytics-kpi blue">
            <div className="analytics-kpi-icon">⌕</div>

            <div>
              <span>Total Inspections</span>
              <strong>{total}</strong>
              <small>Overall inspections</small>
            </div>
          </div>

          <div className="analytics-kpi green">
            <div className="analytics-kpi-icon">✓</div>

            <div>
              <span>Pass Rate</span>
              <strong>{passRate}%</strong>
              <small>{passed} passed products</small>
            </div>
          </div>

          <div className="analytics-kpi red">
            <div className="analytics-kpi-icon">!</div>

            <div>
              <span>Defect Rate</span>
              <strong>{defectRate}%</strong>
              <small>{defective} defective products</small>
            </div>
          </div>

          <div className="analytics-kpi purple">
            <div className="analytics-kpi-icon">⌕</div>

            <div>
              <span>Review Rate</span>
              <strong>{reviewRate}%</strong>
              <small>{review} require review</small>
            </div>
          </div>

        </section>

        {/* QUALITY OVERVIEW */}

        <section className="analytics-card">

          <div className="analytics-card-header">
            <div>
              <h2>Quality Overview</h2>
              <p>Current production inspection performance</p>
            </div>
          </div>

          <div className="quality-overview">

            <div className="quality-circle">
              <div>
                <strong>{passRate}%</strong>
                <span>Pass Rate</span>
              </div>
            </div>

            <div className="quality-bars">

              <div className="quality-bar-row">
                <div>
                  <span>Passed Products</span>
                  <strong>{passed}</strong>
                </div>

                <div className="analytics-progress">
                  <div
                    className="analytics-progress-green"
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>

              <div className="quality-bar-row">
                <div>
                  <span>Defective Products</span>
                  <strong>{defective}</strong>
                </div>

                <div className="analytics-progress">
                  <div
                    className="analytics-progress-red"
                    style={{ width: `${defectRate}%` }}
                  />
                </div>
              </div>

              <div className="quality-bar-row">
                <div>
                  <span>Manual Review</span>
                  <strong>{review}</strong>
                </div>

                <div className="analytics-progress">
                  <div
                    className="analytics-progress-purple"
                    style={{ width: `${reviewRate}%` }}
                  />
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* TWO COLUMN ANALYTICS */}

        <section className="analytics-two-column">

          {/* DEFECT DISTRIBUTION */}

          <div className="analytics-card">

            <div className="analytics-card-header">
              <div>
                <h2>Inspection Distribution</h2>
                <p>Passed vs defective products</p>
              </div>
            </div>

            <div className="distribution-chart">

              <div className="distribution-item">
                <div
                  className="distribution-circle green-circle"
                  style={{
                    "--value": `${passRate}%`,
                  }}
                >
                  <strong>{passRate}%</strong>
                </div>

                <div>
                  <strong>Passed</strong>
                  <span>{passed} inspections</span>
                </div>
              </div>

              <div className="distribution-item">
                <div
                  className="distribution-circle red-circle"
                >
                  <strong>{defectRate}%</strong>
                </div>

                <div>
                  <strong>Defective</strong>
                  <span>{defective} inspections</span>
                </div>
              </div>

            </div>

          </div>

          {/* SEVERITY */}

          <div className="analytics-card">

            <div className="analytics-card-header">
              <div>
                <h2>Severity Analysis</h2>
                <p>Inspection severity distribution</p>
              </div>
            </div>

            <div className="severity-list">

              <div className="severity-row">
                <div>
                  <span className="severity-dot high"></span>
                  High
                </div>

                <strong>{high}</strong>
              </div>

              <div className="severity-row">
                <div>
                  <span className="severity-dot medium"></span>
                  Medium
                </div>

                <strong>{medium}</strong>
              </div>

              <div className="severity-row">
                <div>
                  <span className="severity-dot low"></span>
                  Low
                </div>

                <strong>{low}</strong>
              </div>

            </div>

          </div>

        </section>

        {/* OPERATIONAL INSIGHTS */}

        <section className="analytics-card">

          <div className="analytics-card-header">
            <div>
              <h2>Operational Insights</h2>
              <p>Important observations from inspection data</p>
            </div>
          </div>

          <div className="analytics-insights">

            <div className="analytics-insight success">
              <span>✓</span>

              <div>
                <strong>Quality Performance</strong>
                <p>
                  {passRate}% of inspected products passed
                  the automated inspection process.
                </p>
              </div>
            </div>

            <div className="analytics-insight danger">
              <span>!</span>

              <div>
                <strong>Defect Rate</strong>
                <p>
                  {defectRate}% of inspected products were
                  classified as defective.
                </p>
              </div>
            </div>

            <div className="analytics-insight warning">
              <span>⌕</span>

              <div>
                <strong>Manual Verification</strong>
                <p>
                  {review} inspections currently require
                  quality-engineer review.
                </p>
              </div>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default SupervisorAnalytics;