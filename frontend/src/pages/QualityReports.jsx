import React from "react";

function QualityReports() {
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
            <th style={{ border: "1px solid #ddd" }}>Inspection Time</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>
              R001
            </td>
            <td style={{ border: "1px solid #ddd" }}>Bottle</td>
            <td style={{ border: "1px solid #ddd" }}>No Defect</td>
            <td style={{ border: "1px solid #ddd", color: "green" }}>
              PASS
            </td>
            <td style={{ border: "1px solid #ddd" }}>98%</td>
            <td style={{ border: "1px solid #ddd" }}>2.1 sec</td>
          </tr>

          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>
              R002
            </td>
            <td style={{ border: "1px solid #ddd" }}>Cable</td>
            <td style={{ border: "1px solid #ddd" }}>Scratch</td>
            <td style={{ border: "1px solid #ddd", color: "red" }}>
              FAIL
            </td>
            <td style={{ border: "1px solid #ddd" }}>95%</td>
            <td style={{ border: "1px solid #ddd" }}>2.4 sec</td>
          </tr>

          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>
              R003
            </td>
            <td style={{ border: "1px solid #ddd" }}>Metal Nut</td>
            <td style={{ border: "1px solid #ddd" }}>No Defect</td>
            <td style={{ border: "1px solid #ddd", color: "green" }}>
              PASS
            </td>
            <td style={{ border: "1px solid #ddd" }}>99%</td>
            <td style={{ border: "1px solid #ddd" }}>1.9 sec</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default QualityReports;