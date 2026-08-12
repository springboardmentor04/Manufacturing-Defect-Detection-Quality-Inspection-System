import React from "react";

function InspectionHistory() {
  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "auto" }}>
      <h1>🕒 Inspection History</h1>

      <p>View all previous AI inspections performed on products.</p>

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
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>Inspection ID</th>
            <th style={{ border: "1px solid #ddd" }}>Product</th>
            <th style={{ border: "1px solid #ddd" }}>Result</th>
            <th style={{ border: "1px solid #ddd" }}>Defect</th>
            <th style={{ border: "1px solid #ddd" }}>Date</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>INS001</td>
            <td style={{ border: "1px solid #ddd" }}>Bottle</td>
            <td style={{ color: "green", border: "1px solid #ddd" }}>PASS</td>
            <td style={{ border: "1px solid #ddd" }}>No Defect</td>
            <td style={{ border: "1px solid #ddd" }}>29-07-2026</td>
          </tr>

          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>INS002</td>
            <td style={{ border: "1px solid #ddd" }}>Cable</td>
            <td style={{ color: "red", border: "1px solid #ddd" }}>FAIL</td>
            <td style={{ border: "1px solid #ddd" }}>Scratch</td>
            <td style={{ border: "1px solid #ddd" }}>29-07-2026</td>
          </tr>

          <tr>
            <td style={{ padding: "12px", border: "1px solid #ddd" }}>INS003</td>
            <td style={{ border: "1px solid #ddd" }}>Metal Nut</td>
            <td style={{ color: "green", border: "1px solid #ddd" }}>PASS</td>
            <td style={{ border: "1px solid #ddd" }}>No Defect</td>
            <td style={{ border: "1px solid #ddd" }}>29-07-2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default InspectionHistory;