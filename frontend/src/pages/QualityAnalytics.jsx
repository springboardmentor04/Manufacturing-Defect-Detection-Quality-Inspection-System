function QualityAnalytics() {
  return (
    <div className="page-container">

      <h1>📊 Quality Analytics</h1>

      <p>AI-powered quality analysis of factory production.</p>

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
            <th style={{ padding: "15px" }}>Metric</th>
            <th style={{ padding: "15px" }}>Value</th>
          </tr>
        </thead>

        <tbody>
          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Inspection Accuracy</td>
            <td style={{ padding: "15px", color: "#22c55e" }}>98%</td>
          </tr>

          <tr style={{ background: "#111827" }}>
            <td style={{ padding: "15px" }}>Pass Rate</td>
            <td style={{ padding: "15px", color: "#22c55e" }}>96%</td>
          </tr>

          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Defect Rate</td>
            <td style={{ padding: "15px", color: "#ef4444" }}>4%</td>
          </tr>

          <tr style={{ background: "#111827" }}>
            <td style={{ padding: "15px" }}>Average Inspection Time</td>
            <td style={{ padding: "15px" }}>2.1 sec</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

export default QualityAnalytics;