import React, { useMemo } from "react";
import {
  analyzeInspection,
  generateProductionReport
} from "../utils/milestone3Analytics";

const QualityReport = ({ inspections = [] }) => {

  const report = useMemo(
    () =>
      generateProductionReport(
        inspections
      ),
    [inspections]
  );

  const analyzed =
    inspections.map((item) => ({
      ...item,
      analysis:
        analyzeInspection(item)
    }));

  return (
    <div
      style={{
        padding: "30px",
        background: "#f5f7fb",
        minHeight: "100vh"
      }}
    >
      <h1>
        Production Quality Report
      </h1>

      <p>
        Manufacturing quality assessment
        and defect risk report.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "25px"
        }}
      >
        <ReportCard
          title="Total Inspections"
          value={report.total}
        />

        <ReportCard
          title="Passed"
          value={report.passed}
        />

        <ReportCard
          title="Defective"
          value={report.defective}
        />

        <ReportCard
          title="Pass Rate"
          value={`${report.passRate}%`}
        />
      </div>

      <div
        style={{
          background: "white",
          marginTop: "30px",
          padding: "25px",
          borderRadius: "12px"
        }}
      >
        <h2>
          Quality Assessment
        </h2>

        <p>
          Defect Rate:
          {" "}
          <strong>
            {report.defectRate}%
          </strong>
        </p>

        <p>
          Products requiring review:
          {" "}
          <strong>
            {report.review}
          </strong>
        </p>
      </div>

      <div
        style={{
          background: "white",
          marginTop: "30px",
          padding: "25px",
          borderRadius: "12px",
          overflowX: "auto"
        }}
      >
        <h2>
          Defect Classification
        </h2>

        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
            marginTop: "15px"
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Prediction</th>
              <th>Classification</th>
              <th>Severity Score</th>
              <th>Severity</th>
              <th>Decision</th>
            </tr>
          </thead>

          <tbody>
            {analyzed.map(
              (item, index) => (
                <tr key={index}>
                  <td>
                    {item.id ||
                      item.inspectionId ||
                      `INS-${index + 1}`}
                  </td>

                  <td>
                    {item.prediction ||
                      "N/A"}
                  </td>

                  <td>
                    {
                      item.analysis
                        .classification
                    }
                  </td>

                  <td>
                    {
                      item.analysis
                        .severityScore
                    }
                  </td>

                  <td>
                    {
                      item.analysis
                        .severityLevel
                    }
                  </td>

                  <td>
                    {
                      item.analysis
                        .decision
                    }
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const ReportCard = ({
  title,
  value
}) => (
  <div
    style={{
      background: "white",
      padding: "22px",
      borderRadius: "12px",
      boxShadow:
        "0 2px 8px rgba(0,0,0,0.06)"
    }}
  >
    <div
      style={{
        color: "#64748b"
      }}
    >
      {title}
    </div>

    <div
      style={{
        fontSize: "30px",
        fontWeight: "700",
        marginTop: "8px"
      }}
    >
      {value}
    </div>
  </div>
);

export default QualityReport;