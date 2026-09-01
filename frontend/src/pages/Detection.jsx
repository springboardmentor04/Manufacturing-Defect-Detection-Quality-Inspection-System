import { useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { saveInspection } from "../utils/inspectionStorage";

function Detection() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadedImage = localStorage.getItem("uploadedImage");

  const runDetection = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    if (!uploadedImage) {
      alert("Please upload a product image first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.post(
        "/detection/predict",
        {
          filename: uploadedImage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      console.log("Backend Detection Response:", data);

      // ==================================================
      // BACKEND VALUES
      // ==================================================

      const severity = data.severity || {};
      const qualityControl = data.quality_control || {};
      const imageQuality = data.image_quality || {};

      const confidence = Number(data.confidence || 0);

      const confidenceScore = Number(
        severity.confidence_score ??
          confidence * 100
      );

      // ==================================================
      // COMPLETE INSPECTION DATA
      // ==================================================

      const inspectionData = {
        id: Date.now(),

        // Basic information
        filename:
          data.filename || uploadedImage,

        prediction:
          data.prediction || "Unknown",

        confidence:
          confidence,

        defect:
          data.defect === true,

        defectType:
          data.defect_classification ||
          "No Defect",

        // ==================================================
        // IMAGE QUALITY
        // ==================================================

        image_quality:
          imageQuality,

        // ==================================================
        // SEVERITY
        // ==================================================

        sizeScore:
          Number(
            severity.size_score ?? 0
          ),

        locationScore:
          Number(
            severity.location_score ?? 0
          ),

        defectTypeScore:
          Number(
            severity.defect_type_score ?? 0
          ),

        confidenceScore:
          Number(confidenceScore),

        severityScore:
          Number(
            severity.overall_score ?? 0
          ),

        severityLevel:
          severity.level || "Low",

        // ==================================================
        // QUALITY CONTROL
        // ==================================================

        qualityDecision:
          qualityControl.decision ||
          "REVIEW",

        recommendedAction:
          qualityControl.recommended_action ||
          "Manual inspection required.",

        // ==================================================
        // USER
        // ==================================================

        inspectedBy:
          data.inspected_by ||
          "Unknown User",

        role:
          data.role ||
          "Quality Engineer",

        // ==================================================
        // TIMESTAMP
        // ==================================================

        createdAt:
          new Date().toISOString(),
      };

      console.log(
        "Complete Inspection Data:",
        inspectionData
      );

      // ==================================================
      // DISPLAY RESULT
      // ==================================================

      setResult(inspectionData);

      // ==================================================
      // SAVE LATEST RESULT
      // ==================================================

      localStorage.setItem(
        "inspectionResult",
        JSON.stringify(
          inspectionData
        )
      );

      // ==================================================
      // SAVE INSPECTION HISTORY
      // ==================================================

      saveInspection(
        inspectionData
      );

      alert(
        "Inspection completed successfully!"
      );

    } catch (error) {
      console.error(
        "Detection Error:",
        error
      );

      if (error.response) {
        alert(
          error.response.data.detail ||
            "Detection failed."
        );
      } else {
        alert(
          "Cannot connect to backend."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="card">

          {/* ==================================================
              PAGE TITLE
          ================================================== */}

          <h2>
            AI Product Inspection
          </h2>

          <p>
            Inspect the uploaded product image
            for quality defects.
          </p>

          {/* ==================================================
              UPLOADED IMAGE
          ================================================== */}

          {uploadedImage ? (

            <div
              style={{
                marginTop: "25px",
                marginBottom: "25px",
              }}
            >

              <h3>
                Uploaded Product
              </h3>

              <img
                src={`http://127.0.0.1:8000/uploads/${uploadedImage}`}
                alt="Uploaded Product"
                style={{
                  width: "350px",
                  maxWidth: "100%",
                  maxHeight: "350px",
                  objectFit: "contain",
                  display: "block",
                  marginTop: "15px",
                  borderRadius: "12px",
                  border:
                    "1px solid #e0e0e0",
                }}
              />

            </div>

          ) : (

            <div
              style={{
                marginTop: "25px",
                marginBottom: "25px",
                padding: "20px",
                background:
                  "#f8f9fb",
                borderRadius: "10px",
              }}
            >

              <p>
                No image uploaded yet.
              </p>

              <p>
                Please go to the Upload
                page first.
              </p>

            </div>
          )}

          {/* ==================================================
              INSPECT BUTTON
          ================================================== */}

          <button
            onClick={runDetection}
            disabled={loading}
          >

            {loading
              ? "Inspecting..."
              : "Inspect Product"}

          </button>

          {/* ==================================================
              INSPECTION RESULT
          ================================================== */}

          {result && (

            <div
              style={{
                marginTop: "30px",
                padding: "25px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e3e8ef",
                borderRadius: "12px",
              }}
            >

              <h3>
                Inspection Result
              </h3>

              <hr />

              {/* ==================================================
                  BASIC RESULT
              ================================================== */}

              <p>
                <strong>
                  Prediction:
                </strong>{" "}
                {result.prediction}
              </p>

              <p>
                <strong>
                  Confidence:
                </strong>{" "}
                {(
                  result.confidence *
                  100
                ).toFixed(2)}
                %
              </p>

              <p>
                <strong>
                  Defect:
                </strong>{" "}
                {result.defect
                  ? "Yes"
                  : "No"}
              </p>

              <p>
                <strong>
                  Defect Classification:
                </strong>{" "}
                {result.defectType}
              </p>

              <hr />

              {/* ==================================================
                  IMAGE QUALITY
              ================================================== */}

              <h3>
                Image Quality Analysis
              </h3>

              {result.image_quality ? (

                <>
                  <p>
                    <strong>
                      Dimensions:
                    </strong>{" "}
                    {result.image_quality.image?.width ||
                      "-"}{" "}
                    ×{" "}
                    {result.image_quality.image?.height ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Format:
                    </strong>{" "}
                    {result.image_quality.image?.format ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Brightness:
                    </strong>{" "}
                    {result.image_quality.quality?.brightness ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Brightness Value:
                    </strong>{" "}
                    {result.image_quality.quality?.brightness_value ??
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Contrast:
                    </strong>{" "}
                    {result.image_quality.quality?.contrast ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Contrast Value:
                    </strong>{" "}
                    {result.image_quality.quality?.contrast_value ??
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Blur:
                    </strong>{" "}
                    {result.image_quality.quality?.blur ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Blur Value:
                    </strong>{" "}
                    {result.image_quality.quality?.blur_value ??
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Overall Image Quality:
                    </strong>{" "}
                    {result.image_quality.quality?.overall ||
                      "-"}
                  </p>

                </>

              ) : (

                <p>
                  Image quality analysis
                  unavailable.
                </p>

              )}

              <hr />

              {/* ==================================================
                  SEVERITY
              ================================================== */}

              <h3>
                Severity Assessment
              </h3>

              <p>
                <strong>
                  Size Score:
                </strong>{" "}
                {result.sizeScore}
                /100
              </p>

              <p>
                <strong>
                  Location Score:
                </strong>{" "}
                {result.locationScore}
                /100
              </p>

              <p>
                <strong>
                  Defect Type Score:
                </strong>{" "}
                {result.defectTypeScore}
                /100
              </p>

              <p>
                <strong>
                  Confidence Score:
                </strong>{" "}
                {result.confidenceScore.toFixed(
                  0
                )}
                /100
              </p>

              <p>
                <strong>
                  Overall Severity Score:
                </strong>{" "}
                {result.severityScore}
                /100
              </p>

              <p>
                <strong>
                  Severity Level:
                </strong>{" "}
                {result.severityLevel}
              </p>

              <hr />

              {/* ==================================================
                  QUALITY CONTROL
              ================================================== */}

              <h3>
                Quality Control Decision
              </h3>

              <p>
                <strong>
                  Decision:
                </strong>{" "}

                <span
                  style={{
                    fontWeight: "bold",
                    padding:
                      "5px 10px",
                    borderRadius:
                      "6px",
                    background:
                      result.qualityDecision ===
                      "PASS"
                        ? "#dcfce7"
                        : result.qualityDecision ===
                          "REJECT"
                        ? "#fee2e2"
                        : "#fef3c7",
                  }}
                >
                  {result.qualityDecision}
                </span>
              </p>

              <p>
                <strong>
                  Recommended Action:
                </strong>{" "}
                {result.recommendedAction}
              </p>

              <hr />

              {/* ==================================================
                  INSPECTION DETAILS
              ================================================== */}

              <h3>
                Inspection Details
              </h3>

              <p>
                <strong>
                  Inspected By:
                </strong>{" "}
                {result.inspectedBy}
              </p>

              <p>
                <strong>
                  Role:
                </strong>{" "}
                {result.role}
              </p>

              <p>
                <strong>
                  Image:
                </strong>{" "}
                {result.filename}
              </p>

              <p>
                <strong>
                  Inspection Time:
                </strong>{" "}
                {result.createdAt
                  ? new Date(
                      result.createdAt
                    ).toLocaleString()
                  : "-"}
              </p>

            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default Detection;