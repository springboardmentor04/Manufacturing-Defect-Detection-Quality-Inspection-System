import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";


function InspectionResults() {

    const [results, setResults] = useState([]);


    /* ============================================================
       LOAD INSPECTION RESULTS
    ============================================================ */

    useEffect(() => {

        api.get("/inspection-results")

            .then((response) => {

                setResults(
                    Array.isArray(response.data)
                        ? response.data
                        : []
                );

            })

            .catch((error) => {

                console.log(error);

            });

    }, []);


    /* ============================================================
       CALCULATE RESULT SUMMARY
    ============================================================ */

    const totalResults = results.length;


    const passedResults = results.filter(
        (item) =>
            String(
                item.inspection_status ?? ""
            ).toUpperCase() === "PASS"
    ).length;


    const failedResults = results.filter(
        (item) =>
            String(
                item.inspection_status ?? ""
            ).toUpperCase() === "FAIL"
    ).length;


    const averageConfidence =
        totalResults > 0
            ? (
                results.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.confidence_score ?? 0
                        ),
                    0
                ) / totalResults
            ).toFixed(1)
            : "0.0";


    /* ============================================================
       PAGE
    ============================================================ */

    return (

        <div className="dashboard-container">

            <Sidebar />


            <div className="dashboard-main">

                <DashboardHeader />


                {/* =================================================
                    PAGE TITLE
                ================================================= */}

                <div className="results-page-header">

                    <div>

                        <h1>
                            Inspection Results
                        </h1>

                        <p>
                            Monitor the latest AI-based product
                            inspection outcomes.
                        </p>

                    </div>

                </div>


                {/* =================================================
                    RESULT SUMMARY
                ================================================= */}

                <div className="results-summary-grid">


                    <div className="result-summary-card">

                        <span>
                            Total Results
                        </span>

                        <strong>
                            {totalResults}
                        </strong>

                        <small>
                            AI inspections
                        </small>

                    </div>


                    <div className="result-summary-card result-summary-pass">

                        <span>
                            Passed
                        </span>

                        <strong>
                            {passedResults}
                        </strong>

                        <small>
                            Successful inspections
                        </small>

                    </div>


                    <div className="result-summary-card result-summary-fail">

                        <span>
                            Failed
                        </span>

                        <strong>
                            {failedResults}
                        </strong>

                        <small>
                            Requiring attention
                        </small>

                    </div>


                    <div className="result-summary-card">

                        <span>
                            Average Confidence
                        </span>

                        <strong>
                            {averageConfidence}%
                        </strong>

                        <small>
                            AI prediction confidence
                        </small>

                    </div>


                </div>


                {/* =================================================
                    INSPECTION RESULT MONITOR
                ================================================= */}

                <div className="results-monitor-panel">


                    <div className="results-monitor-header">

                        <div>

                            <h2>
                                Inspection Result Monitor
                            </h2>

                            <p>
                                AI classification results from
                                completed inspections.
                            </p>

                        </div>


                        <div className="results-live-indicator">

                            <span></span>

                            Live Results

                        </div>

                    </div>


                    {/* =================================================
                        RESULTS
                    ================================================= */}

                    {

                        results.length === 0 ? (

                            <div className="no-results">

                                <h3>
                                    No inspection results
                                </h3>

                                <p>
                                    No completed inspections are
                                    currently available.
                                </p>

                            </div>

                        )

                        :

                        (

                            <div className="result-list">


                                {

                                    results.map((item) => {


                                        const status =
                                            String(
                                                item.inspection_status ?? ""
                                            ).toUpperCase();


                                        const confidence =
                                            Number(
                                                item.confidence_score ?? 0
                                            );


                                        return (

                                            <div
                                                className="inspection-result-card"
                                                key={item.id}
                                            >


                                                {/* PRODUCT */}

                                                <div className="result-product">

                                                    <span className="result-label">
                                                        PRODUCT
                                                    </span>

                                                    <h3>
                                                        {
                                                            item.product_name ||
                                                            "-"
                                                        }
                                                    </h3>

                                                    <p>
                                                        {
                                                            item.product_code ||
                                                            "-"
                                                        }
                                                    </p>

                                                </div>


                                                {/* STATUS */}

                                                <div className="result-status">

                                                    <span className="result-label">
                                                        RESULT
                                                    </span>

                                                    <span
                                                        className={
                                                            status === "PASS"
                                                                ? "result-status-badge pass"
                                                                : status === "FAIL"
                                                                    ? "result-status-badge fail"
                                                                    : "result-status-badge"
                                                        }
                                                    >

                                                        {
                                                            status || "-"
                                                        }

                                                    </span>

                                                </div>


                                                {/* CONFIDENCE */}

                                                <div className="result-confidence">

                                                    <span className="result-label">
                                                        CONFIDENCE
                                                    </span>


                                                    <div className="confidence-value">

                                                        {
                                                            confidence.toFixed(1)
                                                        }%

                                                    </div>


                                                    <div className="confidence-track">

                                                        <div
                                                            className="confidence-fill"
                                                            style={{
                                                                width: `${Math.min(
                                                                    Math.max(
                                                                        confidence,
                                                                        0
                                                                    ),
                                                                    100
                                                                )}%`
                                                            }}
                                                        ></div>

                                                    </div>

                                                </div>


                                                {/* PROCESSING TIME */}

                                                <div className="result-processing">

                                                    <span className="result-label">
                                                        PROCESSING TIME
                                                    </span>

                                                    <strong>
                                                        {
                                                            item.processing_time ??
                                                            "-"
                                                        }
                                                    </strong>

                                                </div>


                                            </div>

                                        );

                                    })

                                }


                            </div>

                        )

                    }


                </div>


            </div>

        </div>

    );

}


export default InspectionResults;