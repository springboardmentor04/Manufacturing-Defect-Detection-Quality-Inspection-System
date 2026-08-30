import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Supervisor.css";
import { getInspections } from "../utils/inspectionStorage";

function Supervisor() {
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadInspections = () => {
    try {
      const data = getInspections();

      setInspections(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Error loading inspections:",
        error
      );

      setInspections([]);
    }
  };

  useEffect(() => {
    loadInspections();

    const handleStorage = () => {
      loadInspections();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    try {
      // Remove login/session information
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Also remove possible authentication/session keys
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // Navigate to login page
      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      // Fallback navigation
      window.location.href = "/login";
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getPrediction = (item) => {
    return String(
      item?.prediction || ""
    )
      .trim()
      .toLowerCase();
  };

  const getDecision = (item) => {
    return String(
      item?.qualityDecision ||
        item?.decision ||
        ""
    )
      .trim()
      .toUpperCase();
  };

  const isDefective = (item) => {
    if (item?.defect === true) {
      return true;
    }

    const prediction =
      getPrediction(item);

    return (
      prediction === "defective" ||
      prediction === "defect"
    );
  };

  const isReview = (item) => {
    return (
      getDecision(item) ===
      "REVIEW"
    );
  };

  const isPassed = (item) => {
    return (
      !isDefective(item) &&
      !isReview(item)
    );
  };

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalInspections =
    inspections.length;

  const passedProducts =
    inspections.filter(
      isPassed
    ).length;

  const defectiveProducts =
    inspections.filter(
      isDefective
    ).length;

  const reviewProducts =
    inspections.filter(
      isReview
    ).length;

  const qualityRate =
    totalInspections > 0
      ? (
          (passedProducts /
            totalInspections) *
          100
        ).toFixed(1)
      : "0.0";

  const defectRate =
    totalInspections > 0
      ? (
          (defectiveProducts /
            totalInspections) *
          100
        ).toFixed(1)
      : "0.0";

  // ============================================================
  // DEFECT TYPES
  // ============================================================

  const brokenLarge =
    inspections.filter(
      (item) =>
        String(
          item?.defectType || ""
        ).toLowerCase() ===
        "broken_large"
    ).length;

  const brokenSmall =
    inspections.filter(
      (item) =>
        String(
          item?.defectType || ""
        ).toLowerCase() ===
        "broken_small"
    ).length;

  const contamination =
    inspections.filter(
      (item) =>
        String(
          item?.defectType || ""
        ).toLowerCase() ===
        "contamination"
    ).length;

  // ============================================================
  // SEVERITY
  // ============================================================

  const highSeverity =
    inspections.filter(
      (item) =>
        String(
          item?.severityLevel || ""
        ).toLowerCase() ===
        "high"
    ).length;

  const mediumSeverity =
    inspections.filter(
      (item) =>
        String(
          item?.severityLevel || ""
        ).toLowerCase() ===
        "medium"
    ).length;

  const lowSeverity =
    inspections.filter(
      (item) =>
        String(
          item?.severityLevel || ""
        ).toLowerCase() ===
        "low"
    ).length;

  // ============================================================
  // AVERAGE CONFIDENCE
  // ============================================================

  const averageConfidence =
    totalInspections > 0
      ? (
          (inspections.reduce(
            (sum, item) => {
              let confidence =
                Number(
                  item?.confidence || 0
                );

              if (
                confidence > 1 &&
                confidence <= 100
              ) {
                confidence =
                  confidence / 100;
              }

              return (
                sum + confidence
              );
            },
            0
          ) /
            totalInspections) *
          100
        ).toFixed(1)
      : "0.0";

  // ============================================================
  // RECENT INSPECTIONS
  // ============================================================

  const recentInspections =
    [...inspections]
      .sort(
        (a, b) =>
          new Date(
            b?.createdAt || 0
          ) -
          new Date(
            a?.createdAt || 0
          )
      )
      .slice(0, 10);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="supervisor-page">

      {/* ======================================================
          SUPERVISOR NAVBAR
      ====================================================== */}

      <nav className="supervisor-navbar">

        <div className="supervisor-brand">

          <span className="brand-logo">
            🔍
          </span>

          <span>
            VisionInspectAI
          </span>

        </div>

        <div className="supervisor-nav-links">

          <button
            type="button"
            className="nav-link active"
            onClick={() =>
              navigate("/supervisor")
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={() =>
              navigate(
                "/supervisor/results"
              )
            }
          >
            Inspection Results
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={() =>
              navigate(
                "/supervisor/analytics"
              )
            }
          >
            Analytics
          </button>

          {/* ================================
              WORKING LOGOUT BUTTON
          ================================= */}

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </nav>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="supervisor-main">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="supervisor-header">

          <div>

            <p className="page-label">
              FACTORY OPERATIONS
            </p>

            <h1>
              Supervisor Dashboard
            </h1>

            <p className="header-description">
              Monitor production quality,
              inspection performance,
              defect trends and
              operational insights.
            </p>

          </div>

          <div className="supervisor-user">

            <div className="user-icon">
              👤
            </div>

            <div>

              <strong>
                {user?.name ||
                  "Factory Supervisor"}
              </strong>

              <span>
                Factory Supervisor
              </span>

            </div>

          </div>

        </div>

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <section className="statistics-section">

          <div className="stat-card blue">

            <div className="stat-icon">
              🔍
            </div>

            <div>

              <h2>
                {totalInspections}
              </h2>

              <p>
                Total Inspections
              </p>

              <span className="stat-info">
                Overall inspections
              </span>

            </div>

          </div>

          <div className="stat-card green">

            <div className="stat-icon">
              ✓
            </div>

            <div>

              <h2>
                {passedProducts}
              </h2>

              <p>
                Passed Products
              </p>

              <span className="stat-info">
                {qualityRate}% pass rate
              </span>

            </div>

          </div>

          <div className="stat-card red">

            <div className="stat-icon">
              ⚠
            </div>

            <div>

              <h2>
                {defectiveProducts}
              </h2>

              <p>
                Defective Products
              </p>

              <span className="stat-info">
                {defectRate}% defect rate
              </span>

            </div>

          </div>

          <div className="stat-card purple">

            <div className="stat-icon">
              📊
            </div>

            <div>

              <h2>
                {reviewProducts}
              </h2>

              <p>
                Requires Review
              </p>

              <span className="stat-info">
                Manual quality review
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            PRODUCTION MONITORING
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                Production Monitoring
              </h2>

              <p>
                Current manufacturing
                quality performance
              </p>

            </div>

            <span className="live-status">
              ● LIVE MONITORING
            </span>

          </div>

          <div className="production-card">

            <div className="production-header">

              <span>
                Production Quality
              </span>

              <strong>
                {qualityRate}%
              </strong>

            </div>

            <div className="progress-container">

              <div
                className="progress-bar"
                style={{
                  width:
                    `${qualityRate}%`,
                }}
              />

            </div>

            <div className="production-details">

              <span>
                ✓ {passedProducts} Passed
              </span>

              <span>
                ⚠ {defectiveProducts} Defective
              </span>

              <span>
                🔎 {reviewProducts} Review
              </span>

              <span>
                Total: {totalInspections}
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            AI INSPECTION PERFORMANCE
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                AI Inspection Performance
              </h2>

              <p>
                Computer vision prediction
                performance
              </p>

            </div>

          </div>

          <div className="insights-grid">

            <div className="insight-card info">

              <span>
                🤖
              </span>

              <div>

                <h3>
                  Average AI Confidence
                </h3>

                <p>
                  {averageConfidence}%
                </p>

              </div>

            </div>

            <div className="insight-card success">

              <span>
                ✓
              </span>

              <div>

                <h3>
                  Successful Inspections
                </h3>

                <p>
                  {passedProducts}
                </p>

              </div>

            </div>

            <div className="insight-card warning">

              <span>
                ⚠
              </span>

              <div>

                <h3>
                  Detected Defects
                </h3>

                <p>
                  {defectiveProducts}
                </p>

              </div>

            </div>

            <div className="insight-card warning">

              <span>
                🔎
              </span>

              <div>

                <h3>
                  Manual Reviews
                </h3>

                <p>
                  {reviewProducts}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            DEFECT DETECTION MONITORING
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                Defect Detection Monitoring
              </h2>

              <p>
                AI-detected manufacturing
                defect distribution
              </p>

            </div>

            <strong>
              {defectiveProducts} total defects
            </strong>

          </div>

          <div className="insights-grid">

            <div className="insight-card warning">

              <span>
                🔴
              </span>

              <div>

                <h3>
                  Broken Small
                </h3>

                <p>
                  {brokenSmall}
                </p>

              </div>

            </div>

            <div className="insight-card warning">

              <span>
                🟠
              </span>

              <div>

                <h3>
                  Broken Large
                </h3>

                <p>
                  {brokenLarge}
                </p>

              </div>

            </div>

            <div className="insight-card info">

              <span>
                🧪
              </span>

              <div>

                <h3>
                  Contamination
                </h3>

                <p>
                  {contamination}
                </p>

              </div>

            </div>

            <div className="insight-card success">

              <span>
                🏭
              </span>

              <div>

                <h3>
                  Manufacturing Defects
                </h3>

                <p>
                  {defectiveProducts -
                    brokenSmall -
                    brokenLarge -
                    contamination}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            SEVERITY DISTRIBUTION
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                Severity Distribution
              </h2>

              <p>
                Defect severity across
                inspected products
              </p>

            </div>

          </div>

          <div className="production-details">

            <span>
              <strong>
                High
              </strong>
              <br />
              {highSeverity}
            </span>

            <span>
              <strong>
                Medium
              </strong>
              <br />
              {mediumSeverity}
            </span>

            <span>
              <strong>
                Low
              </strong>
              <br />
              {lowSeverity}
            </span>

          </div>

        </section>

        {/* ====================================================
            OPERATIONAL INSIGHTS
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                Operational Insights
              </h2>

              <p>
                Current observations from
                inspection data
              </p>

            </div>

          </div>

          <div className="insights-grid">

            <div className="insight-card success">

              <span>
                ✓
              </span>

              <div>

                <h3>
                  Inspection Activity
                </h3>

                <p>
                  {totalInspections === 0
                    ? "No inspections have been recorded yet."
                    : `${totalInspections} inspection${
                        totalInspections !== 1
                          ? "s"
                          : ""
                      } recorded in the system.`}
                </p>

              </div>

            </div>

            <div className="insight-card warning">

              <span>
                ⚠
              </span>

              <div>

                <h3>
                  Quality Review
                </h3>

                <p>
                  {reviewProducts === 0
                    ? "No inspections currently require quality-engineer review."
                    : `${reviewProducts} inspection${
                        reviewProducts !== 1
                          ? "s"
                          : ""
                      } currently require quality-engineer review.`}
                </p>

              </div>

            </div>

            <div className="insight-card info">

              <span>
                📊
              </span>

              <div>

                <h3>
                  Quality Performance
                </h3>

                <p>
                  {totalInspections === 0
                    ? "No production quality data is available yet."
                    : `Current production pass rate is ${qualityRate}%.`}
                </p>

              </div>

            </div>

            <div className="insight-card warning">

              <span>
                🔴
              </span>

              <div>

                <h3>
                  Defect Rate
                </h3>

                <p>
                  {totalInspections === 0
                    ? "No defect data is available yet."
                    : `${defectRate}% of inspected products are classified as defective.`}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            RECENT INSPECTIONS
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-title">

            <div>

              <h2>
                Recent Inspections
              </h2>

              <p>
                Latest AI inspection activity
              </p>

            </div>

            <button
              type="button"
              className="nav-link"
              onClick={() =>
                navigate(
                  "/supervisor/results"
                )
              }
            >
              View All
            </button>

          </div>

          <div className="results-table-container">

            <table className="results-table">

              <thead>

                <tr>

                  <th>ID</th>
                  <th>Product</th>
                  <th>Prediction</th>
                  <th>Defect</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Decision</th>

                </tr>

              </thead>

              <tbody>

                {recentInspections.length === 0 ? (

                  <tr>

                    <td
                      colSpan="7"
                      style={{
                        textAlign:
                          "center",
                        padding:
                          "30px",
                      }}
                    >
                      No inspections
                      available.
                    </td>

                  </tr>

                ) : (

                  recentInspections.map(
                    (item, index) => {

                      const confidence =
                        Number(
                          item?.confidence ||
                            0
                        );

                      const prediction =
                        isDefective(
                          item
                        )
                          ? "Defective"
                          : "Passed";

                      const decision =
                        getDecision(
                          item
                        ) ||
                        (
                          isDefective(
                            item
                          )
                            ? "FAIL"
                            : "PASS"
                        );

                      const defectType =
                        item?.defectType ||
                        (
                          isDefective(
                            item
                          )
                            ? "Manufacturing Defect"
                            : "No Defect"
                        );

                      const severity =
                        item?.severityLevel ||
                        "Low";

                      return (
                        <tr
                          key={
                            item?.id ||
                            item?._id ||
                            index
                          }
                        >

                          <td>
                            #
                            {item?.id ||
                              item?._id ||
                              index + 1}
                          </td>

                          <td>
                            {item?.productName ||
                              item?.filename ||
                              "Product"}
                          </td>

                          <td>
                            <strong>
                              {prediction}
                            </strong>
                          </td>

                          <td>
                            {String(
                              defectType
                            ).replace(
                              /_/g,
                              " "
                            )}
                          </td>

                          <td>
                            {confidence.toFixed(
                              2
                            )}
                            %
                          </td>

                          <td>
                            {String(
                              severity
                            ).toLowerCase()}
                          </td>

                          <td>
                            <strong>
                              {decision}
                            </strong>
                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="supervisor-footer">

          <p>
            VisionInspectAI • Smart Manufacturing
            Quality Inspection System
          </p>

          <span>
            Factory Supervisor Monitoring
          </span>

        </footer>

      </main>

    </div>
  );
}

export default Supervisor;