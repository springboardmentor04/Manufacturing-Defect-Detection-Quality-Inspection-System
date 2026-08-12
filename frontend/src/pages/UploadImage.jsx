import { useState } from "react";

function UploadImage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));

    // Clear previous result when a new image is selected
    setResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch(
        "http://127.0.0.1:8000/inspect",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Inspection failed."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

    } catch (error) {
      console.error("Inspection error:", error);
      setError(
        error.message ||
        "Unable to connect to the VisionInspect AI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">

      <div className="upload-left">

        <h1>📤 Upload Product Image</h1>

        <p>
          Upload a manufacturing product image for AI-powered
          defect detection and quality inspection.
        </p>

        <div className="upload-features">
          <p>✅ Supports JPG, PNG & JPEG</p>
          <p>🤖 AI Defect Detection</p>
          <p>⚡ Fast Inspection</p>
          <p>📄 Automatic Report Generation</p>
        </div>

      </div>

      <div className="upload-card">

        <div className="upload-icon">
          📷
        </div>

        <h2>Select Image</h2>

        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          onChange={handleFileChange}
        />

        {preview && (
          <div style={{ marginTop: "20px" }}>
            <img
              src={preview}
              alt="Selected product"
              style={{
                width: "250px",
                maxHeight: "250px",
                objectFit: "contain",
                borderRadius: "10px",
              }}
            />
          </div>
        )}

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading
            ? "🔍 Inspecting..."
            : "🚀 Upload & Inspect"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "10px",
              backgroundColor: "#ffe5e5",
              color: "#b00020",
            }}
          >
            ❌ {error}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #ddd",
            }}
          >

            <h2>🔍 Inspection Result</h2>

            <h3>
              {result.result === "DEFECT"
                ? "⚠️ DEFECT DETECTED"
                : "✅ NO DEFECT DETECTED"}
            </h3>

            <p>
              <strong>Prediction:</strong>{" "}
              {result.prediction}
            </p>

            <p>
              <strong>Confidence:</strong>{" "}
              {result.confidence}%
            </p>

            <p>
              <strong>Inspection:</strong>{" "}
              {result.inspection_result}
            </p>

            <p>
              <strong>File:</strong>{" "}
              {result.filename}
            </p>
            <p>
  <strong>Database:</strong>{" "}
  {result.database_status === "Saved"
    ? "✅ Inspection saved successfully"
    : "⚠️ Database save failed"}
</p>

          </div>
        )}

      </div>

    </div>
  );
}

export default UploadImage;