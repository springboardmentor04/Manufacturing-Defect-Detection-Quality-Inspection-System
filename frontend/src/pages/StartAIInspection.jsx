import React, { useState } from "react";

function StartAIInspection() {
  const [status, setStatus] = useState("Waiting for Inspection");
  const [defect, setDefect] = useState("--");
  const [confidence, setConfidence] = useState("--");

  const startInspection = () => {
    setStatus("✅ PASS");
    setDefect("No Defect Found");
    setConfidence("98%");
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        textAlign: "center",
      }}
    >
      <h1>🤖 Start AI Inspection</h1>

      <p>AI Manufacturing Defect Detection & Quality Inspection System</p>

      <hr />

      <h2>Uploaded Product</h2>

      <div
        style={{
          width: "350px",
          height: "250px",
          border: "2px dashed gray",
          borderRadius: "10px",
          margin: "20px auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: "bold",
        }}
      >
        Product Image Preview
      </div>

      <button
        onClick={startInspection}
        style={{
          background: "#2563eb",
          color: "white",
          border: "none",
          padding: "12px 30px",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Start Inspection
      </button>

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          border: "1px solid #555",
          borderRadius: "10px",
          textAlign: "left",
        }}
      >
        <h2>Inspection Result</h2>

        <p><strong>Status :</strong> {status}</p>

        <p><strong>Defect Type :</strong> {defect}</p>

        <p><strong>Confidence :</strong> {confidence}</p>
      </div>
    </div>
  );
}

export default StartAIInspection;