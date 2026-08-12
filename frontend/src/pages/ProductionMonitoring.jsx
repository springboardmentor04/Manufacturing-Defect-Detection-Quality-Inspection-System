function ProductionMonitoring() {
  return (
    <div className="page-container">

      <h1>⚙️ Production Monitoring</h1>

      <p>Monitor the current production line status.</p>

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
            <th style={{ padding: "15px" }}>Production Line</th>
            <th>Status</th>
            <th>Products Produced</th>
          </tr>
        </thead>

        <tbody>
          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Line 1</td>
            <td style={{ color: "#22c55e" }}>Running</td>
            <td>520</td>
          </tr>

          <tr style={{ background: "#111827" }}>
            <td style={{ padding: "15px" }}>Line 2</td>
            <td style={{ color: "#22c55e" }}>Running</td>
            <td>480</td>
          </tr>

          <tr style={{ background: "#0f172a" }}>
            <td style={{ padding: "15px" }}>Line 3</td>
            <td style={{ color: "#f59e0b" }}>Maintenance</td>
            <td>0</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

export default ProductionMonitoring;