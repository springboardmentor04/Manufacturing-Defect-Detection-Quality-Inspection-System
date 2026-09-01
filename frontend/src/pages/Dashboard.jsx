import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getInspections } from "../utils/inspectionStorage";

function Dashboard() {
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);
  const [user, setUser] = useState(null);

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = () => {
    // -----------------------------
    // LOAD USER
    // -----------------------------
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Unable to read user:", error);
      }
    }

    // -----------------------------
    // LOAD INSPECTIONS
    // SAME SOURCE AS RESULTS.JSX
    // -----------------------------
    const data = getInspections();

    if (Array.isArray(data)) {
      setInspections(data);
    } else {
      setInspections([]);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadData();

    // Refresh when another tab/window changes storage
    window.addEventListener("storage", loadData);

    // Small refresh interval so Dashboard stays synchronized
    // with the inspection data without changing any other page.
    const interval = setInterval(() => {
      const data = getInspections();

      if (Array.isArray(data)) {
        setInspections(data);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", loadData);
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // EXACT SAME STATISTICS AS RESULTS.JSX
  // ============================================================

  const totalInspections = inspections.length;

  const passedProducts = inspections.filter(
    (item) =>
      item.defect === false &&
      item.qualityDecision !== "REVIEW"
  ).length;

  const defectiveProducts = inspections.filter(
    (item) => item.defect === true
  ).length;

  const reviewProducts = inspections.filter(
    (item) => item.qualityDecision === "REVIEW"
  ).length;

  // ============================================================
  // PERCENTAGES
  // ============================================================

  const passRate =
    totalInspections > 0
      ? ((passedProducts / totalInspections) * 100).toFixed(1)
      : "0.0";

  const defectRate =
    totalInspections > 0
      ? ((defectiveProducts / totalInspections) * 100).toFixed(1)
      : "0.0";

  // ============================================================
  // USER
  // ============================================================

  const userName =
    user?.name ||
    user?.username ||
    "Quality Engineer";

  // ============================================================
  // RECENT INSPECTIONS
  // ============================================================

  const recentInspections = [...inspections]
    .reverse()
    .slice(0, 5);

  // ============================================================
  // PRODUCT NAME
  // ============================================================

  const getProductName = (inspection) => {
    return (
      inspection?.filename ||
      inspection?.product ||
      "Product"
    );
  };

  // ============================================================
  // PREDICTION
  // SAME LOGIC AS RESULTS.JSX
  // ============================================================

  const getPrediction = (inspection) => {
    return (
      inspection?.prediction ||
      (inspection?.defect
        ? "Defective"
        : "Passed")
    );
  };

  // ============================================================
  // CONFIDENCE
  // SAME LOGIC AS RESULTS.JSX
  // ============================================================

  const getConfidence = (inspection) => {
    const value = Number(
      inspection?.confidence || 0
    );

    if (value > 1) {
      return value.toFixed(2) + "%";
    }

    return (value * 100).toFixed(2) + "%";
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatus = (inspection) => {
    if (inspection?.qualityDecision === "REVIEW") {
      return "REVIEW";
    }

    if (inspection?.defect === true) {
      return "DEFECTIVE";
    }

    return "PASS";
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (inspection) => {
    const status = getStatus(inspection);

    if (status === "PASS") {
      return "status-pass";
    }

    if (status === "DEFECTIVE") {
      return "status-defective";
    }

    return "status-review";
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <Navbar />

      <div className="page">

        {/* ======================================================
            DASHBOARD HEADER
        ====================================================== */}

        <div className="dashboard-header">

          <div>

            <p className="dashboard-label">
              QUALITY INSPECTION WORKSPACE
            </p>

            <h1>
              Welcome, {userName} 👋
            </h1>

            <p className="dashboard-subtitle">
              Monitor product quality, perform AI-powered
              defect detection, and review inspection results.
            </p>

          </div>

          <div className="role-badge">
            <span>●</span>
            Quality Engineer
          </div>

        </div>


        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className="dashboard-stats">

          {/* TOTAL */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon">
              🔍
            </div>

            <div>

              <p>
                Total Inspections
              </p>

              <h2>
                {totalInspections}
              </h2>

              <span>
                Completed inspections
              </span>

            </div>

          </div>


          {/* PASSED */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon success">
              ✓
            </div>

            <div>

              <p>
                Passed Products
              </p>

              <h2>
                {passedProducts}
              </h2>

              <span>
                {passRate}% pass rate
              </span>

            </div>

          </div>


          {/* DEFECTIVE */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon danger">
              ⚠
            </div>

            <div>

              <p>
                Defective Products
              </p>

              <h2>
                {defectiveProducts}
              </h2>

              <span>
                {defectRate}% defect rate
              </span>

            </div>

          </div>


          {/* REVIEW */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon purple">
              🔎
            </div>

            <div>

              <p>
                Requires Review
              </p>

              <h2>
                {reviewProducts}
              </h2>

              <span>
                Manual verification
              </span>

            </div>

          </div>

        </div>


        {/* ======================================================
            INSPECTION WORKFLOW
        ====================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Inspection Workflow
              </h2>

              <p>
                Follow the product quality inspection process.
              </p>

            </div>

          </div>


          <div className="dashboard-action-grid">

            {/* UPLOAD */}

            <div className="dashboard-action-card">

              <div className="action-icon upload-icon">
                ↑
              </div>

              <h3>
                Upload Product
              </h3>

              <p>
                Upload a product image to begin
                a quality inspection.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/upload")}
              >
                Upload Image
              </button>

            </div>


            {/* DETECTION */}

            <div className="dashboard-action-card">

              <div className="action-icon detection-icon">
                ◎
              </div>

              <h3>
                AI Defect Detection
              </h3>

              <p>
                Analyze the uploaded image using
                the AI defect detection system.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/detection")}
              >
                Start Detection
              </button>

            </div>


            {/* RESULTS */}

            <div className="dashboard-action-card">

              <div className="action-icon results-icon">
                ✓
              </div>

              <h3>
                Inspection Results
              </h3>

              <p>
                View prediction, confidence,
                defect classification and decision.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/results")}
              >
                View Results
              </button>

            </div>

          </div>

        </section>


        {/* ======================================================
            QUALITY OVERVIEW
        ====================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Quality Overview
              </h2>

              <p>
                Current inspection performance.
              </p>

            </div>

          </div>


          {/* PRODUCTION QUALITY */}

          <div className="quality-overview-card">

            <div className="quality-overview-header">

              <strong>
                Production Quality
              </strong>

              <strong className="quality-percentage">
                {passRate}%
              </strong>

            </div>


            <div className="quality-progress">

              <div
                className="quality-progress-fill"
                style={{
                  width: `${passRate}%`
                }}
              />

            </div>


            <div className="quality-overview-details">

              <span>
                ✓ {passedProducts} Passed
              </span>

              <span>
                ⚠ {defectiveProducts} Defective
              </span>

              <span>
                Total: {totalInspections}
              </span>

            </div>

          </div>


          {/* MANUAL REVIEW */}

          <div className="manual-review-card">

            <div>

              <h3>
                Manual Review
              </h3>

              <p>
                {reviewProducts} inspections currently
                require Quality Engineer verification.
              </p>

            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/results")}
            >
              Review Results
            </button>

          </div>

        </section>


        {/* ======================================================
            RECENT INSPECTIONS
        ====================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>

              <h2>
                Recent Inspections
              </h2>

              <p>
                Latest product quality inspection activity.
              </p>

            </div>

            <button
              type="button"
              className="view-all-button"
              onClick={() => navigate("/results")}
            >
              View All →
            </button>

          </div>


          {/* NO DATA */}

          {recentInspections.length === 0 ? (

            <div className="empty-inspections">

              <div className="empty-icon">
                🔍
              </div>

              <h3>
                No inspections yet
              </h3>

              <p>
                Upload a product image to begin
                your first inspection.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/upload")}
              >
                Upload Product
              </button>

            </div>

          ) : (

            /* ==================================================
               TABLE
            ================================================== */

            <div className="inspection-table-wrapper">

              <table className="inspection-table">

                <thead>

                  <tr>

                    <th>
                      Product
                    </th>

                    <th>
                      Prediction
                    </th>

                    <th>
                      Confidence
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {recentInspections.map(
                    (inspection, index) => (

                      <tr
                        key={
                          inspection?.id ||
                          inspection?.createdAt ||
                          index
                        }
                      >

                        <td>
                          {getProductName(inspection)}
                        </td>

                        <td>
                          {getPrediction(inspection)}
                        </td>

                        <td>
                          {getConfidence(inspection)}
                        </td>

                        <td>

                          <span
                            className={`inspection-status ${getStatusClass(
                              inspection
                            )}`}
                          >
                            {getStatus(inspection)}
                          </span>

                        </td>

                        <td>

                          <button
                            type="button"
                            className="small-view-button"
                            onClick={() =>
                              navigate("/results")
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ======================================================
            INFORMATION
        ====================================================== */}

        <section className="dashboard-info">

          <div className="info-card">

            <div className="info-icon">
              🤖
            </div>

            <div>

              <h3>
                AI-Powered Inspection
              </h3>

              <p>
                VisionInspectAI analyzes product
                images using an AI-based computer
                vision defect detection system.
              </p>

            </div>

          </div>


          <div className="info-card">

            <div className="info-icon">
              📊
            </div>

            <div>

              <h3>
                Quality Monitoring
              </h3>

              <p>
                Monitor passed products, defective
                products, confidence and inspection
                performance.
              </p>

            </div>

          </div>


          <div className="info-card">

            <div className="info-icon">
              ⚠
            </div>

            <div>

              <h3>
                Manual Review
              </h3>

              <p>
                Low-confidence and defective
                predictions can be manually reviewed
                by the Quality Engineer.
              </p>

            </div>

          </div>

        </section>


        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className="dashboard-footer">
          VisionInspectAI • Smart Manufacturing
          Quality Inspection System
        </footer>

      </div>
    </>
  );
}

export default Dashboard;