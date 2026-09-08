import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import api from "../services/api";

import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Factory,
    Package,
    Radio,
    ShieldAlert,
    Square,
    TrendingUp
} from "lucide-react";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";
import "../styles/ProductionMonitoring.css";


function ProductionMonitoring() {

    const [data, setData] = useState({
        summary: {
            total_lines: 0,
            running_lines: 0,
            stopped_lines: 0,
            waiting_lines: 0
        },

        active_line: null,

        production_lines: []
    });

    const [loading, setLoading] = useState(true);

    const [lastUpdated, setLastUpdated] = useState(null);


    // ============================================================
    // FETCH MONITORING DATA
    // ============================================================

    const fetchMonitoringData = async () => {

        try {

            const response =
                await api.get(
                    "/supervisor/production-monitoring"
                );

            console.log(
                "Production Monitoring:",
                response.data
            );

            setData(response.data);

            setLastUpdated(
                new Date()
            );

        } catch (error) {

            console.error(
                "Error loading production monitoring:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    // ============================================================
    // AUTO REFRESH EVERY 5 SECONDS
    // ============================================================

    useEffect(() => {

        const initialFetch = setTimeout(
            fetchMonitoringData,
            0
        );

        const interval =
            setInterval(
                fetchMonitoringData,
                5000
            );

        return () => {
            clearTimeout(initialFetch);
            clearInterval(interval);
        };

    }, []);


    // ============================================================
    // STATUS CLASS
    // ============================================================

    const getStatusClass = (status) => {

        const value =
            String(status || "")
                .toLowerCase()
                .trim();

        if (value === "running") {
            return "line-running";
        }

        if (value === "stopped") {
            return "line-stopped";
        }

        return "line-waiting";
    };


    // ============================================================
    // PASS / FAIL CLASS
    // ============================================================




    // ============================================================
    // DATE FORMAT
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "No inspection";
        }

        return new Date(date).toLocaleString();
    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="dashboard-container">

                <SupervisorSidebar />

                <div className="dashboard-main">

                    <SupervisorHeader />

                    <div className="monitoring-loading">

                        <Activity size={30} />

                        <p>
                            Loading production monitoring...
                        </p>

                    </div>

                </div>

            </div>
        );
    }


    return (

        <div className="dashboard-container">

            <SupervisorSidebar />

            <div className="dashboard-main">

                <SupervisorHeader />


                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="monitoring-page-header">

                    <div>

                        <h1>
                            Production Monitoring
                        </h1>

                        <p>
                            Live operational status of production
                            lines and inspection activity.
                        </p>

                    </div>


                    <div className="live-indicator">

                        <span className="live-dot"></span>

                        LIVE

                    </div>

                </div>


                {/* ==================================================
                    UPDATE BAR
                ================================================== */}

                <div className="monitoring-update-bar">

                    <div className="monitoring-update-left">

                        <Radio size={17} />

                        <span>
                            Live monitoring active
                        </span>

                    </div>


                    <div className="monitoring-update-time">

                        <Clock size={15} />

                        Last updated:

                        {" "}

                        {
                            lastUpdated
                                ? lastUpdated.toLocaleTimeString()
                                : "Updating..."
                        }

                    </div>

                </div>


                {/* ==================================================
                    LIVE SUMMARY
                ================================================== */}

                <div className="monitoring-kpi-grid">


                    <div className="monitoring-kpi">

                        <div className="monitoring-kpi-icon">

                            <Factory size={22} />

                        </div>

                        <div>

                            <span>
                                Production Lines
                            </span>

                            <strong>
                                {
                                    data.summary.total_lines
                                }
                            </strong>

                        </div>

                    </div>


                    <div className="monitoring-kpi running">

                        <div className="monitoring-kpi-icon">

                            <CheckCircle size={22} />

                        </div>

                        <div>

                            <span>
                                Running Lines
                            </span>

                            <strong>
                                {
                                    data.summary.running_lines
                                }
                            </strong>

                        </div>

                    </div>


                    <div className="monitoring-kpi stopped">

                        <div className="monitoring-kpi-icon">

                            <Square size={22} />

                        </div>

                        <div>

                            <span>
                                Stopped Lines
                            </span>

                            <strong>
                                {
                                    data.summary.stopped_lines
                                }
                            </strong>

                        </div>

                    </div>


                    <div className="monitoring-kpi active">

                        <div className="monitoring-kpi-icon">

                            <TrendingUp size={22} />

                        </div>

                        <div>

                            <span>
                                Active Line
                            </span>

                            <strong>

                                {
                                    data.active_line
                                        ?.production_line ||
                                    "None"
                                }

                            </strong>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    PRODUCTION LINE STATUS
                ================================================== */}

                <div className="panel monitoring-status-panel">

                    <div className="monitoring-section-header">

                        <div>

                            <h2>
                                Production Line Status
                            </h2>

                            <p>
                                Current operational state of each
                                production line.
                            </p>

                        </div>

                        <Activity size={22} />

                    </div>


                    <div className="line-status-grid">

                        {
                            data.production_lines.map(
                                (line, index) => (

                                    <div
                                        className={`line-status-card ${getStatusClass(line.status)}`}
                                        key={
                                            line.production_line ||
                                            index
                                        }
                                    >

                                        <div className="line-status-top">

                                            <div className="line-name">

                                                <Factory
                                                    size={20}
                                                />

                                                <strong>
                                                    {
                                                        line.production_line
                                                    }
                                                </strong>

                                            </div>


                                            <span className="line-status-badge">

                                                {
                                                    line.status
                                                }

                                            </span>

                                        </div>

                                    </div>

                                )
                            )
                        }

                    </div>

                </div>


                {/* ==================================================
                    LINE PERFORMANCE
                ================================================== */}

                <div className="panel monitoring-performance-panel">

                    <div className="monitoring-section-header">

                        <div>

                            <h2>
                                Line Performance
                            </h2>

                            <p>
                                Live inspection performance for each
                                production line.
                            </p>

                        </div>

                        <TrendingUp size={22} />

                    </div>


                    <div className="monitoring-table-container">

                        <table className="monitoring-table">

                            <thead>

                                <tr>

                                    <th>
                                        Production Line
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Inspections
                                    </th>

                                    <th>
                                        Passed
                                    </th>

                                    <th>
                                        Failed
                                    </th>

                                    <th>
                                        Quality Rate
                                    </th>

                                    <th>
                                        Defects
                                    </th>

                                    <th>
                                        Last Inspection
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {
                                    data.production_lines.map(
                                        (line, index) => (

                                            <tr
                                                key={
                                                    line.production_line ||
                                                    index
                                                }
                                            >

                                                {/* LINE */}

                                                <td>

                                                    <div className="table-line-name">

                                                        <Factory
                                                            size={17}
                                                        />

                                                        <strong>
                                                            {
                                                                line.production_line
                                                            }
                                                        </strong>

                                                    </div>

                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <span
                                                        className={`monitor-status ${getStatusClass(line.status)}`}
                                                    >

                                                        {
                                                            line.status
                                                        }

                                                    </span>

                                                </td>


                                                {/* INSPECTIONS */}

                                                <td>

                                                    <strong>
                                                        {
                                                            line.inspections_performed
                                                        }
                                                    </strong>

                                                </td>


                                                {/* PASSED */}

                                                <td>

                                                    <span className="monitor-pass-number">

                                                        {
                                                            line.passed_inspections
                                                        }

                                                    </span>

                                                </td>


                                                {/* FAILED */}

                                                <td>

                                                    <span className="monitor-fail-number">

                                                        {
                                                            line.failed_inspections
                                                        }

                                                    </span>

                                                </td>


                                                {/* QUALITY RATE */}

                                                <td>

                                                    <div className="quality-rate">

                                                        <strong>
                                                            {
                                                                Number(
                                                                    line.quality_rate
                                                                ).toFixed(1)
                                                            }%
                                                        </strong>


                                                        <div className="quality-rate-track">

                                                            <div
                                                                className="quality-rate-fill"
                                                                style={{
                                                                    width:
                                                                        `${Math.min(
                                                                            Math.max(
                                                                                Number(
                                                                                    line.quality_rate
                                                                                ),
                                                                                0
                                                                            ),
                                                                            100
                                                                        )}%`
                                                                }}
                                                            />

                                                        </div>

                                                    </div>

                                                </td>


                                                {/* DEFECTS */}

                                                <td>

                                                    <span
                                                        className={
                                                            Number(
                                                                line.defect_count
                                                            ) > 0
                                                                ? "defect-count active"
                                                                : "defect-count"
                                                        }
                                                    >

                                                        {
                                                            line.defect_count
                                                        }

                                                    </span>

                                                </td>


                                                {/* LAST INSPECTION */}

                                                <td>

                                                    <span className="last-inspection">

                                                        {
                                                            formatDate(
                                                                line.last_inspection_time
                                                            )
                                                        }

                                                    </span>

                                                </td>

                                            </tr>

                                        )
                                    )
                                }

                            </tbody>

                        </table>

                    </div>

                </div>


                {/* ==================================================
                    CURRENT ACTIVE LINE + ALERTS
                ================================================== */}

                <div className="monitoring-two-column">


                    {/* ACTIVE LINE */}

                    <div className="panel current-line-panel">

                        <div className="monitoring-section-header">

                            <div>

                                <h2>
                                    Current Active Line
                                </h2>

                                <p>
                                    Most recently active production line.
                                </p>

                            </div>

                            <Activity size={22} />

                        </div>


                        {
                            data.active_line
                                ? (

                                    <div className="active-line-content">

                                        <div className="active-line-icon">

                                            <Factory size={32} />

                                        </div>


                                        <div className="active-line-info">

                                            <strong>
                                                {
                                                    data.active_line
                                                        .production_line
                                                }
                                            </strong>

                                            <span>

                                                {
                                                    data.active_line
                                                        .current_product_code
                                                }

                                                {" — "}

                                                {
                                                    data.active_line
                                                        .current_product_name
                                                }

                                            </span>

                                        </div>


                                        <span className="active-running-badge">

                                            ● RUNNING

                                        </span>

                                    </div>

                                )
                                :
                                (

                                    <div className="no-active-line">

                                        <AlertTriangle
                                            size={28}
                                        />

                                        <strong>
                                            No active production line
                                        </strong>

                                        <span>
                                            No currently active line was found.
                                        </span>

                                    </div>

                                )
                        }

                    </div>


                    {/* ALERTS */}

                    <div className="panel line-alert-panel">

                        <div className="monitoring-section-header">

                            <div>

                                <h2>
                                    Line Alerts
                                </h2>

                                <p>
                                    Current operational alerts.
                                </p>

                            </div>

                            <ShieldAlert size={22} />

                        </div>


                        <div className="line-alert-list">

                            {
                                data.production_lines.map(
                                    (line, index) => {

                                        const hasDefects =
                                            Number(
                                                line.defect_count
                                            ) > 0;

                                        const hasFailed =
                                            Number(
                                                line.failed_inspections
                                            ) > 0;

                                        const isStopped =
                                            line.status ===
                                            "Stopped";


                                        let alertText =
                                            "No active alerts";


                                        if (isStopped) {

                                            alertText =
                                                "Line stopped";

                                        } else if (hasFailed) {

                                            alertText =
                                                `${line.failed_inspections} failed inspection(s)`;

                                        } else if (hasDefects) {

                                            alertText =
                                                `${line.defect_count} defect(s) detected`;

                                        }


                                        const hasAlert =
                                            alertText !==
                                            "No active alerts";


                                        return (

                                            <div
                                                className={`line-alert-item ${
                                                    hasAlert
                                                        ? "has-alert"
                                                        : "no-alert"
                                                }`}
                                                key={
                                                    line.production_line ||
                                                    index
                                                }
                                            >

                                                <div className="alert-line-info">

                                                    <strong>
                                                        {
                                                            line.production_line
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            alertText
                                                        }
                                                    </span>

                                                </div>


                                                {
                                                    hasAlert

                                                        ?

                                                        <AlertTriangle
                                                            size={18}
                                                        />

                                                        :

                                                        <CheckCircle
                                                            size={18}
                                                        />
                                                }

                                            </div>

                                        );

                                    }
                                )
                            }

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    CURRENT PRODUCT / BATCH
                ================================================== */}

                <div className="panel current-production-panel">

                    <div className="monitoring-section-header">

                        <div>

                            <h2>
                                Current Production Activity
                            </h2>

                            <p>
                                Latest product and batch associated
                                with each production line.
                            </p>

                        </div>

                        <Package size={22} />

                    </div>


                    <div className="current-production-grid">

                        {
                            data.production_lines.map(
                                (line, index) => (

                                    <div
                                        className="current-production-card"
                                        key={
                                            line.production_line ||
                                            index
                                        }
                                    >

                                        <div className="current-production-header">

                                            <strong>
                                                {
                                                    line.production_line
                                                }
                                            </strong>

                                            <span
                                                className={`monitor-status ${getStatusClass(line.status)}`}
                                            >

                                                {
                                                    line.status
                                                }

                                            </span>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Product
                                            </span>

                                            <strong>
                                                {
                                                    line.current_product_code ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Product Name
                                            </span>

                                            <strong>
                                                {
                                                    line.current_product_name ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Category
                                            </span>

                                            <strong>
                                                {
                                                    line.current_category ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Current Batch
                                            </span>

                                            <strong>
                                                {
                                                    line.current_batch ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Defects Detected
                                            </span>

                                            <strong
                                                className={
                                                    Number(
                                                        line.defect_count
                                                    ) > 0
                                                        ? "danger-value"
                                                        : ""
                                                }
                                            >

                                                {
                                                    line.defect_count
                                                }

                                            </strong>

                                        </div>


                                        <div className="production-detail">

                                            <span>
                                                Last Inspection
                                            </span>

                                            <strong>
                                                {
                                                    formatDate(
                                                        line.last_inspection_time
                                                    )
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                )
                            )
                        }

                    </div>

                </div>

            </div>

        </div>
    );
}


export default ProductionMonitoring;