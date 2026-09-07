import { useEffect, useMemo, useState } from "react";

import {
  Search,
  RefreshCw,
  Eye,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../utils/api";

import "../styles/RecentInspections.css";


function RecentInspections() {

  const navigate = useNavigate();


  /* ============================================================
     STATE
  ============================================================ */

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");


  /* ============================================================
     INITIAL LOAD
     Async work is defined inside the effect so the effect itself
     does not synchronously invoke a state-changing function.
  ============================================================ */

  useEffect(() => {

    let cancelled = false;


    const fetchHistory = async () => {

      try {

        const response =
          await api.get(
            "/inspection/history"
          );


        if (cancelled) {
          return;
        }


        const data =
          Array.isArray(response.data)
            ? response.data
            : response.data?.inspections ||
              response.data?.history ||
              [];


        setHistory(
          Array.isArray(data)
            ? data
            : []
        );

        setError("");


      } catch (err) {

        if (cancelled) {
          return;
        }


        console.error(
          "Recent inspections error:",
          err
        );


        if (
          err.response?.status === 401
        ) {

          setError(
            "Your session has expired. Please login again."
          );

        } else if (
          err.response?.status === 403
        ) {

          setError(
            "You do not have permission to view inspections."
          );

        } else {

          setError(
            err.response?.data?.detail ||
            "Unable to load recent inspections."
          );

        }


      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };


    fetchHistory();


    return () => {

      cancelled = true;

    };

  }, []);


  /* ============================================================
     MANUAL REFRESH
  ============================================================ */

  const loadHistory = async () => {

    try {

      setRefreshing(true);

      setError("");


      const response =
        await api.get(
          "/inspection/history"
        );


      const data =
        Array.isArray(response.data)
          ? response.data
          : response.data?.inspections ||
            response.data?.history ||
            [];


      setHistory(
        Array.isArray(data)
          ? data
          : []
      );


    } catch (err) {

      console.error(
        "Recent inspections refresh error:",
        err
      );


      if (
        err.response?.status === 401
      ) {

        setError(
          "Your session has expired. Please login again."
        );

      } else if (
        err.response?.status === 403
      ) {

        setError(
          "You do not have permission to view inspections."
        );

      } else {

        setError(
          err.response?.data?.detail ||
          "Unable to refresh recent inspections."
        );

      }

    } finally {

      setRefreshing(false);

    }

  };


  /* ============================================================
     HELPERS
  ============================================================ */

  const getStatus = (item) => {

    const rawStatus =
      item?.status ??
      item?.inspection_status ??
      item?.result ??
      item?.prediction_status ??
      "";


    const value =
      String(rawStatus)
        .trim()
        .toLowerCase();


    if (
      value.includes("pass") ||
      value.includes("normal") ||
      value === "ok"
    ) {

      return "passed";

    }


    if (
      value.includes("fail") ||
      value.includes("defect") ||
      value.includes("reject")
    ) {

      return "failed";

    }


    if (
      value.includes("warning") ||
      value.includes("review")
    ) {

      return "warning";

    }


    return "unknown";

  };


  const getStatusLabel = (status) => {

    if (status === "passed") {
      return "Passed";
    }

    if (status === "failed") {
      return "Failed";
    }

    if (status === "warning") {
      return "Warning";
    }

    return "Unknown";

  };


  const getStatusIcon = (status) => {

    if (status === "passed") {
      return CheckCircle2;
    }

    if (status === "failed") {
      return XCircle;
    }

    if (status === "warning") {
      return AlertTriangle;
    }

    return Clock3;

  };


  const getConfidence = (item) => {

    const raw =
      item?.confidence ??
      item?.confidence_score ??
      item?.prediction_confidence;


    const number =
      Number(raw);


    if (
      !Number.isFinite(number)
    ) {

      return null;

    }


    return Math.min(
      100,
      Math.max(
        0,
        number
      )
    );

  };


  const getPrediction = (item) => {

    return (
      item?.prediction ??
      item?.predicted_class ??
      item?.defect_class ??
      item?.classification ??
      "Not available"
    );

  };


  const getCategory = (item) => {

    return (
      item?.category ??
      item?.product_category ??
      item?.product_type ??
      item?.class_name ??
      ""
    );

  };


  const getFilename = (item) => {

    return (
      item?.filename ??
      item?.file_name ??
      item?.image_name ??
      item?.image_filename ??
      "Inspection"
    );

  };


  const getInspectionId = (item) => {

    return (
      item?._id ??
      item?.id ??
      item?.inspection_id ??
      ""
    );

  };


  const getDate = (item) => {

    const rawDate =
      item?.created_at ??
      item?.createdAt ??
      item?.inspection_date ??
      item?.timestamp ??
      item?.date;


    if (!rawDate) {
      return "Date unavailable";
    }


    const date =
      new Date(rawDate);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(
        rawDate
      );

    }


    return date.toLocaleString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  };


  /* ============================================================
     FILTERED DATA
  ============================================================ */

  const filteredHistory =
    useMemo(() => {

      const query =
        searchQuery
          .trim()
          .toLowerCase();


      return history
        .slice()
        .reverse()
        .filter((item) => {

          const status =
            getStatus(item);


          const prediction =
            String(
              getPrediction(item)
            ).toLowerCase();


          const filename =
            String(
              getFilename(item)
            ).toLowerCase();


          const category =
            String(
              getCategory(item)
            ).toLowerCase();


          const matchesSearch =
            !query ||
            filename.includes(query) ||
            prediction.includes(query) ||
            category.includes(query);


          const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;


          return (
            matchesSearch &&
            matchesStatus
          );

        });

    }, [
      history,
      searchQuery,
      statusFilter,
    ]);


  /* ============================================================
     SUMMARY
  ============================================================ */

  const summary = useMemo(() => {

    let passed = 0;
    let failed = 0;
    let warning = 0;


    history.forEach((item) => {

      const status =
        getStatus(item);


      if (status === "passed") {
        passed++;
      }

      if (status === "failed") {
        failed++;
      }

      if (status === "warning") {
        warning++;
      }

    });


    const total =
      history.length;


    const passRate =
      total > 0
        ? ((passed / total) * 100)
            .toFixed(1)
        : "0.0";


    return {
      total,
      passed,
      failed,
      warning,
      passRate,
    };

  }, [history]);


  /* ============================================================
     VIEW INSPECTION
  ============================================================ */

  const handleViewInspection =
    (item) => {

      const id =
        getInspectionId(item);


      try {

        sessionStorage.setItem(
          "selectedInspection",
          JSON.stringify(item)
        );

      } catch {
        // Ignore storage errors.
      }


      if (id) {

        navigate(
          `/inspection-results?id=${encodeURIComponent(
            id
          )}`
        );

      } else {

        navigate(
          "/inspection-results"
        );

      }

    };


  /* ============================================================
     RENDER
  ============================================================ */

  return (

    <div className="history-card">


      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="history-header">

        <div className="history-heading">

          <div className="history-title-row">

            <div className="history-title-icon">

              <ClipboardCheck
                size={18}
              />

            </div>


            <div>

              <span className="history-eyebrow">
                ACTIVITY
              </span>

              <h2>
                Recent Inspections
              </h2>

            </div>

          </div>


          <p>
            Latest AI-powered product quality inspections
          </p>

        </div>


        <button
          type="button"
          className="history-refresh-button"

          onClick={
            loadHistory
          }

          disabled={
            loading ||
            refreshing
          }
        >

          <RefreshCw
            size={15}
            className={
              refreshing
                ? "history-refresh-spinning"
                : ""
            }
          />

          <span>
            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </span>

        </button>

      </div>


      {/* ========================================================
          SUMMARY
      ======================================================== */}

      {!loading &&
        !error &&
        history.length > 0 && (

          <div className="history-summary">

            <div className="history-summary-item">

              <span className="history-summary-label">
                TOTAL
              </span>

              <strong>
                {summary.total}
              </strong>

            </div>


            <div className="history-summary-item passed">

              <span className="history-summary-label">
                PASSED
              </span>

              <strong>
                {summary.passed}
              </strong>

            </div>


            <div className="history-summary-item failed">

              <span className="history-summary-label">
                FAILED
              </span>

              <strong>
                {summary.failed}
              </strong>

            </div>


            <div className="history-summary-item warning">

              <span className="history-summary-label">
                WARNING
              </span>

              <strong>
                {summary.warning}
              </strong>

            </div>


            <div className="history-summary-item rate">

              <span className="history-summary-label">
                PASS RATE
              </span>

              <strong>
                {summary.passRate}%
              </strong>

            </div>

          </div>

        )}


      {/* ========================================================
          FILTERS
      ======================================================== */}

      {!loading &&
        !error &&
        history.length > 0 && (

          <div className="history-toolbar">

            <div className="history-search">

              <Search
                size={16}
              />

              <input
                type="text"
                value={
                  searchQuery
                }

                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }

                placeholder={
                  "Search inspections..."
                }

                aria-label="Search inspections"
              />

            </div>


            <div className="history-filters">

              <button
                type="button"

                className={
                  `history-filter ${
                    statusFilter === "all"
                      ? "active"
                      : ""
                  }`
                }

                onClick={() =>
                  setStatusFilter(
                    "all"
                  )
                }
              >
                All
              </button>


              <button
                type="button"

                className={
                  `history-filter ${
                    statusFilter === "passed"
                      ? "active passed"
                      : ""
                  }`
                }

                onClick={() =>
                  setStatusFilter(
                    "passed"
                  )
                }
              >
                Passed
              </button>


              <button
                type="button"

                className={
                  `history-filter ${
                    statusFilter === "failed"
                      ? "active failed"
                      : ""
                  }`
                }

                onClick={() =>
                  setStatusFilter(
                    "failed"
                  )
                }
              >
                Failed
              </button>


              <button
                type="button"

                className={
                  `history-filter ${
                    statusFilter === "warning"
                      ? "active warning"
                      : ""
                  }`
                }

                onClick={() =>
                  setStatusFilter(
                    "warning"
                  )
                }
              >
                Warning
              </button>

            </div>

          </div>

        )}


      {/* ========================================================
          LOADING
      ======================================================== */}

      {loading && (

        <div className="history-state">

          <div className="history-loading-icon">

            <RefreshCw
              size={20}
              className="history-refresh-spinning"
            />

          </div>


          <strong>
            Loading inspections
          </strong>


          <span>
            Fetching the latest inspection activity...
          </span>

        </div>

      )}


      {/* ========================================================
          ERROR
      ======================================================== */}

      {!loading &&
        error && (

          <div className="history-state history-error">

            <div className="history-state-icon error">

              <AlertTriangle
                size={20}
              />

            </div>


            <strong>
              Unable to load inspections
            </strong>


            <span>
              {error}
            </span>


            <button
              type="button"
              className="history-state-action"

              onClick={
                loadHistory
              }
            >
              Try Again
            </button>

          </div>

        )}


      {/* ========================================================
          EMPTY DATABASE
      ======================================================== */}

      {!loading &&
        !error &&
        history.length === 0 && (

          <div className="history-state">

            <div className="history-state-icon">

              <ClipboardCheck
                size={22}
              />

            </div>


            <strong>
              No inspections yet
            </strong>


            <span>
              Complete your first AI inspection to start
              building inspection history.
            </span>


            <button
              type="button"
              className="history-state-action"

              onClick={() =>
                navigate("/upload")
              }
            >
              Start Inspection

              <ChevronRight
                size={15}
              />

            </button>

          </div>

        )}


      {/* ========================================================
          NO FILTER RESULTS
      ======================================================== */}

      {!loading &&
        !error &&
        history.length > 0 &&
        filteredHistory.length === 0 && (

          <div className="history-state">

            <div className="history-state-icon">

              <Search
                size={22}
              />

            </div>


            <strong>
              No matching inspections
            </strong>


            <span>
              Try changing your search or status filter.
            </span>


            <button
              type="button"
              className="history-state-action"

              onClick={() => {

                setSearchQuery("");

                setStatusFilter(
                  "all"
                );

              }}
            >
              Clear Filters
            </button>

          </div>

        )}


      {/* ========================================================
          TABLE
      ======================================================== */}

      {!loading &&
        !error &&
        filteredHistory.length > 0 && (

          <div className="history-table-wrapper">

            <table className="history-table">

              <thead>

                <tr>

                  <th>
                    INSPECTION
                  </th>

                  <th>
                    PREDICTION
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    CONFIDENCE
                  </th>

                  <th>
                    DATE
                  </th>

                  <th>
                    ACTION
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredHistory
                  .slice(0, 8)
                  .map(
                    (item, index) => {

                      const status =
                        getStatus(item);


                      const StatusIcon =
                        getStatusIcon(
                          status
                        );


                      const confidence =
                        getConfidence(
                          item
                        );


                      const category =
                        getCategory(item);


                      return (

                        <tr
                          key={
                            getInspectionId(
                              item
                            ) ||
                            `${getFilename(
                              item
                            )}-${index}`
                          }
                        >


                          {/* INSPECTION */}

                          <td>

                            <div className="inspection-name-cell">

                              <div className="inspection-file-icon">

                                <ClipboardCheck
                                  size={16}
                                />

                              </div>


                              <div>

                                <strong
                                  title={
                                    getFilename(
                                      item
                                    )
                                  }
                                >
                                  {
                                    getFilename(
                                      item
                                    )
                                  }
                                </strong>


                                {category && (

                                  <span>
                                    {category}
                                  </span>

                                )}

                              </div>

                            </div>

                          </td>


                          {/* PREDICTION */}

                          <td>

                            <span
                              className="inspection-prediction"
                              title={
                                getPrediction(
                                  item
                                )
                              }
                            >
                              {
                                getPrediction(
                                  item
                                )
                              }
                            </span>

                          </td>


                          {/* STATUS */}

                          <td>

                            <span
                              className={
                                `inspection-status ${
                                  status
                                }`
                              }
                            >

                              <StatusIcon
                                size={14}
                              />

                              {
                                getStatusLabel(
                                  status
                                )
                              }

                            </span>

                          </td>


                          {/* CONFIDENCE */}

                          <td>

                            {confidence !== null ? (

                              <div className="confidence-cell">

                                <div className="confidence-top">

                                  <strong>
                                    {
                                      confidence.toFixed(
                                        1
                                      )
                                    }%
                                  </strong>

                                </div>


                                <div className="confidence-track">

                                  <div
                                    className={
                                      `confidence-fill ${
                                        confidence >= 80
                                          ? "high"
                                          : confidence >= 60
                                            ? "medium"
                                            : "low"
                                      }`
                                    }

                                    style={{
                                      width:
                                        `${confidence}%`,
                                    }}
                                  />

                                </div>

                              </div>

                            ) : (

                              <span className="confidence-na">
                                —
                              </span>

                            )}

                          </td>


                          {/* DATE */}

                          <td>

                            <span className="inspection-date">

                              <Clock3
                                size={13}
                              />

                              {
                                getDate(
                                  item
                                )
                              }

                            </span>

                          </td>


                          {/* ACTION */}

                          <td>

                            <button
                              type="button"

                              className="inspection-view-button"

                              onClick={() =>
                                handleViewInspection(
                                  item
                                )
                              }

                              title="View inspection details"
                              aria-label="View inspection details"
                            >

                              <Eye
                                size={15}
                              />

                              <span>
                                View
                              </span>

                              <ChevronRight
                                size={14}
                              />

                            </button>

                          </td>

                        </tr>

                      );

                    }
                  )}

              </tbody>

            </table>


            {/* MORE RECORDS */}

            {filteredHistory.length > 8 && (

              <div className="history-table-footer">

                <span>

                  Showing{" "}
                  <strong>
                    8
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {filteredHistory.length}
                  </strong>{" "}
                  matching inspections

                </span>


                <button
                  type="button"

                  onClick={() =>
                    navigate(
                      "/inspection-history"
                    )
                  }
                >

                  View Full History

                  <ChevronRight
                    size={15}
                  />

                </button>

              </div>

            )}

          </div>

        )}

    </div>

  );

}


export default RecentInspections;