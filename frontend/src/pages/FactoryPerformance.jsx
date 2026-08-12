function FactoryPerformance() {
  return (
    <div className="page-container">

      <h1>🏆 Factory Performance</h1>

      <p>Overall factory production and quality performance.</p>

      <table
        style={{
          width: "100%",
          marginTop: "30px",
          borderCollapse: "collapse",
          textAlign: "center",
          color: "white",
        }}
      >
        <thead style={{ background: "#2563eb" }}>
          <tr>
            <th style={{ padding: "15px" }}>Performance Metric</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Overall Efficiency</td>
            <td style={{ color: "#22c55e" }}>95%</td>
          </tr>

          <tr style={{ background: "#111827" }}>
            <td style={{ padding: "15px" }}>Products Produced</td>
            <td>5000</td>
          </tr>

          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Passed Products</td>
            <td style={{ color: "#22c55e" }}>4800</td>
          </tr>

          <tr style={{ background: "#111827" }}>
            <td style={{ padding: "15px" }}>Defective Products</td>
            <td style={{ color: "#ef4444" }}>200</td>
          </tr>

          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Factory Status</td>
            <td style={{ color: "#22c55e" }}>Excellent</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

export default FactoryPerformance;