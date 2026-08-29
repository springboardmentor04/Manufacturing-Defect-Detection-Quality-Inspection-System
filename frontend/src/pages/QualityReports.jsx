import React, { useEffect, useState } from "react";

function QualityReports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/inspections")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setReports(data.inspections);
        }
      })
      .catch((error) => {
        console.error("Failed to load quality reports:", error);
      });
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h1>📊 Quality Reports</h1>

      <p>
        View AI-generated inspection reports for manufactured products.
      </p>

      <table
        style={{
          width: "100%",
          marginTop: "25px",
          borderCollapse: "collapse",
          textAlign: "center",
        }}
      >
        <thead>
          <tr style={{ background: "#2563eb", color: "white" }}>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>
              Report ID
            </th>
            <th style={{ border: "1px solid #ddd" }}>Product</th>
            <th style={{ border: "1px solid #ddd" }}>Defect</th>
            <th style={{ border: "1px solid #ddd" }}>Status</th>
            <th style={{ border: "1px solid #ddd" }}>Confidence</th>
            <th style={{ border: "1px solid #ddd" }}>Inspection</th>
          </tr>
        </thead>

        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: "20px" }}>
                No inspection reports available.
              </td>
            </tr>
          ) : (
            reports.map((report, index) => (
              <tr key={index}>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  R{String(index + 1).padStart(3, "0")}
                </td>

                <td style={{ border: "1px solid #ddd" }}>
                  {report.filename}
                </td>

                <td style={{ border: "1px solid #ddd" }}>
                  {report.defect_type || "No Defect"}
                </td>

                <td style={{ border: "1px solid #ddd" }}>
                  {report.result === "GOOD" ? "PASS" : "FAIL"}
                </td>

                <td style={{ border: "1px solid #ddd" }}>
                  {report.confidence}%
                </td>

                <td style={{ border: "1px solid #ddd" }}>
                  {report.inspection_result}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default QualityReports;