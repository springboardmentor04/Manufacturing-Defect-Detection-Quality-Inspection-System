import React from "react";

function ProductionOverview() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>🏭 Production Overview</h1>

      <p>Monitor today's factory production and inspection summary.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <div
          style={{
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#38bdf8" }}>520</h2>
          <p>Total Products</p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#22c55e" }}>500</h2>
          <p>Products Inspected</p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#a855f7" }}>480</h2>
          <p>Passed</p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#ef4444" }}>40</h2>
          <p>Defective</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px",
        }}
      >
        <h2>Factory Summary</h2>

        <p><strong>Production Efficiency:</strong> 96%</p>

        <p><strong>AI Inspection Accuracy:</strong> 98%</p>

        <p><strong>Current Shift:</strong> Morning Shift</p>

        <p><strong>Factory Status:</strong> 🟢 Running Normally</p>
      </div>
    </div>
  );
}

export default ProductionOverview;