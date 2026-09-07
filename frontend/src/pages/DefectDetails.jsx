import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Image as ImageIcon,
  Database,
  BrainCircuit,
  Clock3,
  Hash,
  Activity,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../utils/api";

import "../styles/DefectDetails.css";



/* ============================================================
   HELPERS
============================================================ */

const displayValue = (
  value,
  fallback = "Not available"
) => {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
};


const normalize = (
  value
) => {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
};


const formatConfidence = (
  value
) => {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "Not available";
  }

  return `${Math.min(
    Math.max(number, 0),
    100
  ).toFixed(2)}%`;
};


const formatDate = (
  value
) => {

  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString();
};


const isPassDecision = (
  value
) => {

  const normalized =
    normalize(value);

  return (
    normalized === "pass" ||
    normalized === "passed"
  );
};


const isWarningDecision = (
  value
) => {

  const normalized =
    normalize(value);

  return (
    normalized === "warning" ||
    normalized === "review" ||
    normalized === "pending"
  );
};


const isDefectivePrediction = (
  value
) => {

  const normalized =
    normalize(value);

  return (
    normalized === "defective" ||
    normalized === "defect" ||
    normalized === "failed" ||
    normalized === "fail"
  );
};


/* ============================================================
   COMPONENT
============================================================ */

function DefectDetails() {

  const navigate =
    useNavigate();


  const [
    inspection,
    setInspection,
  ] = useState(null);

  const [inspectionImageUrl, setInspectionImageUrl] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  /* ==========================================================
     FETCH INSPECTION

     No useless try/catch wrapper.
     Errors are allowed to propagate to the caller.
  ========================================================== */

  const fetchInspection =
    useCallback(
      async () => {

        const savedResult =
          localStorage.getItem(
            "inspectionResult"
          );


        if (!savedResult) {

          throw new Error(
            "No inspection result is available. Complete an inspection first."
          );

        }


        let result;


        try {

          result =
            JSON.parse(
              savedResult
            );

        } catch {

          throw new Error(
            "The saved inspection result is invalid."
          );

        }


                const inspectionId =
          result?.inspection_id ||
          result?._id ||
          result?.id;

        if (!inspectionId) {
          throw new Error(
            "Inspection ID is missing from the saved result."
          );
        }

        let response;

        try {
          response = await api.get(
            `/inspection/${encodeURIComponent(
              inspectionId
            )}`
          );
        } catch (requestError) {
          const detail =
            requestError?.response?.data?.detail;

          throw new Error(
            typeof detail === "string"
              ? detail
              : requestError?.message ||
                  "Unable to retrieve inspection details.", { cause: requestError }
          );
        }

        const data = response.data;

        if (
          !data ||
          typeof data !== "object"
        ) {
          throw new Error(
            "The inspection response is invalid."
          );
        }

        return data;

      },
      []
    );


  /* ==========================================================
     INITIAL LOAD

     State updates happen after the asynchronous request.
  ========================================================== */

  useEffect(() => {

    let cancelled =
      false;


    const initialize =
      async () => {

        try {

          const data =
            await fetchInspection();


          if (
            cancelled
          ) {
            return;
          }


          setInspection(
            data
          );

          setError("");

        } catch (
          err
        ) {

          if (
            cancelled
          ) {
            return;
          }


          console.error(
            "Defect Details:",
            err
          );


          setInspection(
            null
          );


          setError(
            err?.message ||
            "Unable to load live inspection details."
          );

        } finally {

          if (
            !cancelled
          ) {

            setLoading(
              false
            );

          }

        }

      };


    initialize();


    return () => {

      cancelled =
        true;

    };

  }, [fetchInspection]);


  /* ==========================================================
     AUTHENTICATED INSPECTION IMAGE
     ========================================================== */

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const loadInspectionImage = async () => {
      setInspectionImageUrl(null);

      if (!inspection?.filename) {
        return;
      }

      try {
        const response = await api.get(
          `/inspection/image/${encodeURIComponent(inspection.filename)}`,
          { responseType: "blob" }
        );

        if (cancelled) return;
        if (!response.data || response.data.size === 0) {
          throw new Error("Inspection image is empty.");
        }

        objectUrl = window.URL.createObjectURL(response.data);
        setInspectionImageUrl(objectUrl);
      } catch (imageError) {
        if (!cancelled) {
          console.error("Inspection image error:", imageError);
          setInspectionImageUrl(null);
        }
      }
    };

    loadInspectionImage();

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [inspection?.filename]);


  /* ==========================================================
     MANUAL REFRESH
  ========================================================== */

  const loadInspection =
    async () => {

      setRefreshing(
        true
      );

      setError("");


      try {

        const data =
          await fetchInspection();


        setInspection(
          data
        );

      } catch (
        err
      ) {

        console.error(
          "Defect Details refresh:",
          err
        );


        setError(
          err?.message ||
          "Unable to refresh inspection details."
        );

      } finally {

        setRefreshing(
          false
        );

      }

    };


  /* ==========================================================
     DERIVED VALUES
  ========================================================== */

  const values =
    useMemo(
      () => {

        if (!inspection) {
          return null;
        }


        const prediction =
          inspection.prediction ??
          inspection.classification ??
          null;


        const status =
          inspection.status ??
          null;


        const confidence =
          Number(
            inspection.confidence
          );


        const severity =
          inspection.severity ??
          null;


        const severityScore =
          inspection.severity_score ??
          null;


        const riskLevel =
          inspection.risk_level ??
          inspection.risk ??
          null;


        const qualityDecision =
          inspection.quality_decision ??
          inspection.decision ??
          null;


        const defectCategory =
          inspection.defect_category ??
          inspection.defect_class ??
          inspection.defect ??
          null;


        const categoryType =
          inspection.category_type ??
          inspection.category ??
          null;


        const isDefective =
          isDefectivePrediction(
            prediction
          );


        const isPassed =
          isPassDecision(
            qualityDecision
          ) ||
          (
            !qualityDecision &&
            isPassDecision(
              status
            )
          );


        const isWarning =
          isWarningDecision(
            qualityDecision
          ) ||
          (
            !qualityDecision &&
            isWarningDecision(
              status
            )
          );


        return {

          prediction,

          status,

          confidence,

          severity,

          severityScore,

          riskLevel,

          qualityDecision,

          defectCategory,

          categoryType,

          isDefective,

          isPassed,

          isWarning,

          uploadedDate:
            formatDate(
              inspection.uploaded_at ??
              inspection.created_at ??
              inspection.inspected_at ??
              inspection.inspection_date ??
              inspection.timestamp ??
              inspection.date
            ),

        };

      },
      [
        inspection,
      ]
    );


  /* ==========================================================
     REPORT
  ========================================================== */

  const downloadReport =
    async () => {

      if (
        !inspection?.report
      ) {

        window.alert(
          "No inspection report is available for this inspection."
        );

        return;

      }


      try {
        const response = await api.get(
          `/inspection/report/${encodeURIComponent(
            inspection.report
          )}`,
          {
            responseType: "blob",
          }
        );

        const blob = response.data;

        if (!blob || blob.size === 0) {
          throw new Error(
            "The inspection report is empty."
          );
        }

        const blobUrl =
          window.URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.download = inspection.report;

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error(
          "Report download error:",
          error
        );

        const detail =
          error?.response?.data?.detail;

        window.alert(
          typeof detail === "string"
            ? detail
            : error?.message ||
                "Unable to download the inspection report."
        );
      }

    };


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {

    return (

      <>

        <Sidebar />


        <div className="dashboard">

          <Navbar
            title="Defect Details"
          />


          <main className="defect-details-container">

            <div className="defect-state-card">

              <RefreshCw
                size={28}
                className="defect-loading-icon spin"
              />


              <h2>
                Loading Inspection
              </h2>


              <p>
                Retrieving the latest inspection
                classification.
              </p>

            </div>

          </main>

        </div>

      </>

    );

  }


  /* ==========================================================
     EMPTY / ERROR
  ========================================================== */

  if (
    error ||
    !inspection ||
    !values
  ) {

    return (

      <>

        <Sidebar />


        <div className="dashboard">

          <Navbar
            title="Defect Details"
          />


          <main className="defect-details-container">

            <div
              className={
                "defect-state-card defect-error-state"
              }
            >

              <AlertTriangle
                size={28}
              />


              <h2>
                No Inspection Available
              </h2>


              <p>
                {error ||
                  "Complete an inspection before viewing defect details."}
              </p>


              <div className="defect-state-actions">

                <button
                  type="button"

                  className="secondary-btn"

                  onClick={
                    loadInspection
                  }
                >

                  <RefreshCw
                    size={15}
                  />

                  Retry

                </button>


                <button
                  type="button"

                  className="primary-btn"

                  onClick={() =>
                    navigate(
                      "/upload"
                    )
                  }
                >

                  Upload Product Image

                </button>

              </div>

            </div>

          </main>

        </div>

      </>

    );

  }


  /* ==========================================================
     DECISION
  ========================================================== */

  const decisionClass =
    values.isPassed
      ? "decision-pass"
      : values.isWarning
        ? "decision-warning"
        : "decision-fail";


  const DecisionIcon =
    values.isPassed
      ? CheckCircle2
      : values.isWarning
        ? AlertTriangle
        : XCircle;


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <>

      <Sidebar />


      <div className="dashboard">

        <Navbar
          title="Defect Details"
        />


        <main className="defect-details-container">


          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="defect-page-header">

            <div>

              <span className="defect-eyebrow">
                QUALITY INSPECTION
              </span>


              <h1>
                Defect Classification
              </h1>


              <p>
                Live classification and quality
                assessment from the selected inspection.
              </p>

            </div>


            <div
              className={
                `defect-decision-pill ${decisionClass}`
              }
            >

              <DecisionIcon
                size={17}
              />


              <span>

                {
                  displayValue(
                    values.qualityDecision ??
                    values.status
                  )
                }

              </span>

            </div>

          </header>


          {/* ==================================================
              WORKFLOW
          ================================================== */}

          <section
            className={
              "classification-workflow"
            }
          >

            <div className="workflow-step">

              <span className="workflow-number">
                01
              </span>


              <div>

                <span>
                  AI PREDICTION
                </span>


                <strong>
                  {
                    displayValue(
                      values.prediction
                    )
                  }
                </strong>

              </div>

            </div>


            <div className="workflow-connector" />


            <div className="workflow-step">

              <span className="workflow-number">
                02
              </span>


              <div>

                <span>
                  CATEGORY
                </span>


                <strong>
                  {
                    displayValue(
                      values.defectCategory
                    )
                  }
                </strong>

              </div>

            </div>


            <div className="workflow-connector" />


            <div className="workflow-step">

              <span className="workflow-number">
                03
              </span>


              <div>

                <span>
                  SEVERITY
                </span>


                <strong>
                  {
                    displayValue(
                      values.severity
                    )
                  }
                </strong>

              </div>

            </div>


            <div className="workflow-connector" />


            <div className="workflow-step">

              <span className="workflow-number">
                04
              </span>


              <div>

                <span>
                  RISK
                </span>


                <strong>
                  {
                    displayValue(
                      values.riskLevel
                    )
                  }
                </strong>

              </div>

            </div>


            <div className="workflow-connector" />


            <div className="workflow-step">

              <span className="workflow-number">
                05
              </span>


              <div>

                <span>
                  DECISION
                </span>


                <strong>
                  {
                    displayValue(
                      values.qualityDecision
                    )
                  }
                </strong>

              </div>

            </div>

          </section>


          {/* ==================================================
              CLASSIFICATION SUMMARY
          ================================================== */}

          <section
            className={
              "classification-summary"
            }
          >

            <div
              className={
                `classification-main ${
                  values.isDefective
                    ? "classification-defective"
                    : "classification-normal"
                }`
              }
            >

              <div className="classification-main-icon">

                {values.isDefective ? (

                  <XCircle
                    size={25}
                  />

                ) : (

                  <CheckCircle2
                    size={25}
                  />

                )}

              </div>


              <div>

                <span>
                  CLASSIFICATION RESULT
                </span>


                <h2>
                  {
                    displayValue(
                      values.prediction
                    )
                  }
                </h2>


                <p>

                  Category type:{" "}

                  <strong>
                    {
                      displayValue(
                        values.categoryType
                      )
                    }
                  </strong>

                </p>

              </div>

            </div>


            <div className="confidence-panel">

              <div className="confidence-header">

                <span>
                  AI CONFIDENCE
                </span>


                <strong>
                  {
                    formatConfidence(
                      values.confidence
                    )
                  }
                </strong>

              </div>


              <div className="confidence-track">

                <div
                  className={
                    `confidence-fill ${
                      values.isDefective
                        ? "confidence-defective"
                        : "confidence-normal"
                    }`
                  }

                  style={{
                    width:
                      Number.isFinite(
                        values.confidence
                      )
                        ? `${Math.min(
                            Math.max(
                              values.confidence,
                              0
                            ),
                            100
                          )}%`
                        : "0%",
                  }}

                />

              </div>


              <span className="confidence-note">
                Confidence recorded by the AI
                classification result.
              </span>

            </div>

          </section>


          {/* ==================================================
              ASSESSMENT
          ================================================== */}

          <section
            className="assessment-grid"
          >

            <div className="assessment-card">

              <span className="card-eyebrow">
                DEFECT CATEGORY
              </span>


              <div className="assessment-icon">

                <AlertTriangle
                  size={19}
                />

              </div>


              <h3>
                {
                  displayValue(
                    values.defectCategory
                  )
                }
              </h3>


              <p>
                Recorded defect classification
                from the inspection result.
              </p>

            </div>


            <div className="assessment-card">

              <span className="card-eyebrow">
                CATEGORY TYPE
              </span>


              <div className="assessment-icon">

                <FileText
                  size={19}
                />

              </div>


              <h3>
                {
                  displayValue(
                    values.categoryType
                  )
                }
              </h3>


              <p>
                Product classification associated
                with the AI prediction.
              </p>

            </div>


            <div className="assessment-card">

              <span className="card-eyebrow">
                SEVERITY
              </span>


              <div className="assessment-icon">

                <AlertTriangle
                  size={19}
                />

              </div>


              <h3>
                {
                  displayValue(
                    values.severity
                  )
                }
              </h3>


              <p>

                Recorded severity score:{" "}

                <strong>
                  {
                    displayValue(
                      values.severityScore
                    )
                  }
                </strong>

              </p>

            </div>


            <div className="assessment-card">

              <span className="card-eyebrow">
                QUALITY RISK
              </span>


              <div className="assessment-icon">

                <ShieldCheck
                  size={19}
                />

              </div>


              <h3>
                {
                  displayValue(
                    values.riskLevel
                  )
                }
              </h3>


              <p>
                Risk level recorded by the
                quality assessment module.
              </p>

            </div>

          </section>


          {/* ==================================================
              INSPECTION INFORMATION
          ================================================== */}

          <section className="info-card">

            <div className="card-heading">

              <div>

                <span className="card-eyebrow">
                  LIVE DATA
                </span>


                <h2>
                  Inspection Information
                </h2>

              </div>


              <button
                type="button"

                className="icon-refresh-btn"

                onClick={
                  loadInspection
                }

                disabled={
                  refreshing
                }

                title="Refresh inspection"
              >

                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? "spin"
                      : ""
                  }
                />

              </button>

            </div>


            <div className="info-grid">

              <div className="info-item">

                <span>
                  Inspection ID
                </span>


                <strong>
                  {
                    displayValue(
                      inspection._id ??
                      inspection.inspection_id ??
                      inspection.id
                    )
                  }
                </strong>

              </div>


              <div className="info-item">

                <span>
                  Prediction
                </span>


                <strong
                  className={
                    values.isDefective
                      ? "defective-text"
                      : "normal-text"
                  }
                >
                  {
                    displayValue(
                      values.prediction
                    )
                  }
                </strong>

              </div>


              <div className="info-item">

                <span>
                  Inspection Status
                </span>


                <strong>
                  {
                    displayValue(
                      values.status
                    )
                  }
                </strong>

              </div>


              <div className="info-item">

                <span>
                  Confidence
                </span>


                <strong>
                  {
                    formatConfidence(
                      values.confidence
                    )
                  }
                </strong>

              </div>


              <div className="info-item">

                <span>
                  Filename
                </span>


                <strong
                  className="filename-value"

                  title={
                    inspection.filename ??
                    ""
                  }
                >
                  {
                    displayValue(
                      inspection.filename
                    )
                  }
                </strong>

              </div>


              <div className="info-item">

                <span>
                  Inspected At
                </span>


                <strong>
                  {
                    values.uploadedDate
                  }
                </strong>

              </div>

            </div>

          </section>


          {/* ==================================================
              IMAGE + MODEL
          ================================================== */}

          <section className="image-section">


            <div className="image-card">

              <div className="image-card-header">

                <div>

                  <span>
                    SOURCE
                  </span>


                  <h3>
                    Inspection Image
                  </h3>

                </div>


                <span className="image-tag">
                  ORIGINAL
                </span>

              </div>


              <div className="inspection-image-wrapper">

                {inspection.filename ? (

                  <img
                    src={inspectionImageUrl}

                    alt="Inspected product"

                    className="inspection-image"

                    onError={(
                      event
                    ) => {

                      event.currentTarget.style.display =
                        "none";

                      event.currentTarget.parentElement.classList.add(
                        "image-unavailable"
                      );

                    }}

                  />

                ) : null}


                <div className="image-unavailable-text">

                  <ImageIcon
                    size={22}
                  />


                  <span>
                    Inspection image unavailable
                  </span>

                </div>

              </div>


              <div className="image-footer">

                <span>
                  File
                </span>


                <strong>
                  {
                    displayValue(
                      inspection.filename
                    )
                  }
                </strong>

              </div>

            </div>


            <div className="image-card">

              <div className="image-card-header">

                <div>

                  <span>
                    AI ANALYSIS
                  </span>


                  <h3>
                    Classification Result
                  </h3>

                </div>


                <span className="image-tag">
                  MODEL DATA
                </span>

              </div>


              <div className="model-details">

                <div>

                  <span>
                    Model
                  </span>


                  <strong>
                    {
                      displayValue(
                        inspection.model_name ??
                        inspection.model ??
                        inspection.model_version
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Classification
                  </span>


                  <strong>
                    {
                      displayValue(
                        values.prediction
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Processing
                  </span>


                  <strong>
                    {
                      displayValue(
                        inspection.processing_status ??
                        inspection.processing
                      )
                    }
                  </strong>

                </div>

              </div>


              <div className="model-note">

                <BrainCircuit
                  size={15}
                />


                <p>
                  Classification information shown
                  here is taken directly from the
                  recorded inspection response.
                </p>

              </div>

            </div>

          </section>


          {/* ==================================================
              RECORD
          ================================================== */}

          <section className="info-card">

            <div className="card-heading">

              <div>

                <span className="card-eyebrow">
                  INSPECTION RECORD
                </span>


                <h2>
                  Recorded Result
                </h2>

              </div>

            </div>


            <div className="record-meta-grid">

              <div className="record-meta-item">

                <Hash
                  size={15}
                />


                <div>

                  <span>
                    Record ID
                  </span>


                  <strong>
                    {
                      displayValue(
                        inspection._id ??
                        inspection.inspection_id ??
                        inspection.id
                      )
                    }
                  </strong>

                </div>

              </div>


              <div className="record-meta-item">

                <Database
                  size={15}
                />


                <div>

                  <span>
                    Status
                  </span>


                  <strong>
                    {
                      displayValue(
                        inspection.status
                      )
                    }
                  </strong>

                </div>

              </div>


              <div className="record-meta-item">

                <Clock3
                  size={15}
                />


                <div>

                  <span>
                    Timestamp
                  </span>


                  <strong>
                    {
                      values.uploadedDate
                    }
                  </strong>

                </div>

              </div>


              <div className="record-meta-item">

                <Activity
                  size={15}
                />


                <div>

                  <span>
                    Decision
                  </span>


                  <strong>
                    {
                      displayValue(
                        values.qualityDecision
                      )
                    }
                  </strong>

                </div>

              </div>

            </div>

          </section>


          {/* ==================================================
              RECOMMENDATION
          ================================================== */}

          <section className="recommendation-card">

            <span className="card-eyebrow">
              QUALITY CONTROL
            </span>


            <h2>
              Quality Recommendation
            </h2>


            <div className="recommendation-content">

              <p>

                {
                  inspection.recommendation
                    ? inspection.recommendation
                    : "No recommendation was recorded for this inspection."
                }

              </p>

            </div>

          </section>


          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="action-buttons">

            <button
              type="button"

              className="secondary-btn"

              onClick={() =>
                navigate(
                  "/inspection-results"
                )
              }
            >

              Back to Results

            </button>


            <button
              type="button"

              className="secondary-btn"

              onClick={() =>
                navigate(
                  "/inspection-history"
                )
              }
            >

              Inspection History

            </button>


            <button
              type="button"

              className="primary-btn"

              onClick={
                downloadReport
              }

              disabled={
                !inspection.report
              }
            >

              <Download
                size={15}
              />

              Download Report

            </button>

          </div>


        </main>

      </div>

    </>

  );

}


export default DefectDetails;