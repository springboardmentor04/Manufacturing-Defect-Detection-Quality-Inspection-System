import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import api from "../services/api";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line
} from "recharts";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";


/* ============================================================
   CHART COLORS
============================================================ */

const COLORS = [
    "#00C49F",
    "#FF4D4F",
    "#FFBB28",
    "#8884D8"
];


function InspectionReportsSupervisor() {

    /* ============================================================
       EXISTING DATA STRUCTURE
    ============================================================ */

    const [data, setData] = useState({

        summary: {},

        chart: [],

        reports: []

    });


    /* ============================================================
       LOAD INSPECTION REPORTS
    ============================================================ */

    useEffect(() => {

        api.get("/supervisor/inspection-reports")

            .then((response) => {

                setData(response.data);

            })

            .catch(console.error);

    }, []);


    /* ============================================================
       SAFE REPORT DATA
    ============================================================ */

    const reports = Array.isArray(data.reports)
        ? data.reports
        : [];


    /* ============================================================
       BASIC ANALYTICS
    ============================================================ */

    const passedReports = reports.filter(
        (report) =>
            String(report.pass_fail || "").toUpperCase() === "PASS"
    );


    const defectReports = reports.filter(
        (report) => {

            const result =
                String(report.pass_fail || "").toUpperCase();

            return (
                result === "FAIL" ||
                result === "DEFECT"
            );

        }
    );


    const noDataReports = reports.filter(
        (report) =>
            String(report.pass_fail || "").toUpperCase() ===
            "NO DATA"
    );


    /* ============================================================
       PASS RATE
    ============================================================ */

    const passRate = reports.length > 0
        ? (
            passedReports.length /
            reports.length *
            100
        ).toFixed(1)
        : "0.0";


    /* ============================================================
       DEFECT RATE
    ============================================================ */

    const defectRate = reports.length > 0
        ? (
            defectReports.length /
            reports.length *
            100
        ).toFixed(1)
        : "0.0";


    /* ============================================================
       CONFIDENCE ANALYTICS
    ============================================================ */

    const confidenceValues = reports
        .map((report) =>
            Number(report.confidence_score)
        )
        .filter((value) =>
            Number.isFinite(value)
        );


    const averageConfidence =
        confidenceValues.length > 0
            ? (
                confidenceValues.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                confidenceValues.length
            ).toFixed(2)
            : "0.00";


    /* ============================================================
       INSPECTION TIME ANALYTICS
    ============================================================ */

    const inspectionTimeValues = reports
        .map((report) =>
            Number(report.inspection_time)
        )
        .filter((value) =>
            Number.isFinite(value)
        );


    const averageInspectionTime =
        inspectionTimeValues.length > 0
            ? (
                inspectionTimeValues.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                inspectionTimeValues.length
            ).toFixed(2)
            : "0.00";


    /* ============================================================
       CONFIDENCE LEVEL ANALYTICS
    ============================================================ */

    const highConfidence =
        confidenceValues.filter(
            (value) => value >= 95
        ).length;


    const reliableConfidence =
        confidenceValues.filter(
            (value) =>
                value >= 85 &&
                value < 95
        ).length;


    const reviewConfidence =
        confidenceValues.filter(
            (value) =>
                value >= 70 &&
                value < 85
        ).length;


    const lowConfidence =
        confidenceValues.filter(
            (value) => value < 70
        ).length;


    const confidenceAnalytics = [

        {
            range: "< 70%",
            count: lowConfidence
        },

        {
            range: "70–85%",
            count: reviewConfidence
        },

        {
            range: "85–95%",
            count: reliableConfidence
        },

        {
            range: "≥ 95%",
            count: highConfidence
        }

    ];


    /* ============================================================
       PASS / DEFECT STATUS ANALYTICS
    ============================================================ */

    const statusAnalytics = [

        {
            status: "PASS",
            count: passedReports.length
        },

        {
            status: "DEFECT",
            count: defectReports.length
        },

        {
            status: "NO DATA",
            count: noDataReports.length
        }

    ];


    /* ============================================================
       PRODUCTION LINE ANALYTICS
       
       Uses only production_line already present
       in the existing reports.
    ============================================================ */

    const productionLineMap = {};


    reports.forEach((report) => {

        const line =
            report.production_line ||
            "Unknown";


        if (!productionLineMap[line]) {

            productionLineMap[line] = {

                line,

                inspections: 0,

                defects: 0

            };

        }


        productionLineMap[line].inspections++;


        const result =
            String(report.pass_fail || "")
                .toUpperCase();


        if (
            result === "FAIL" ||
            result === "DEFECT"
        ) {

            productionLineMap[line].defects++;

        }

    });


    const productionLineAnalytics =
        Object.values(
            productionLineMap
        ).map((item) => ({

            line: item.line,

            inspections: item.inspections,

            defects: item.defects

        }));


    /* ============================================================
       INSPECTION PROCESSING TIME TREND
    ============================================================ */

    const inspectionTimeAnalytics =
        reports
            .map((report, index) => ({

                inspection:
                    index + 1,

                time:
                    Number(
                        report.inspection_time
                    ) || 0

            }))
            .filter(
                (item) =>
                    item.time > 0
            );


    /* ============================================================
       DOWNLOAD REPORT
       
       Downloads the currently loaded report data as CSV.
       No new backend/database fields required.
    ============================================================ */

    const downloadReport = () => {

        if (reports.length === 0) {

            alert(
                "There are no inspection reports available to download."
            );

            return;

        }


        const headers = [

            "Inspection ID",

            "Product Code",

            "Product Name",

            "Production Line",

            "Inspection Status",

            "Result",

            "Confidence (%)",

            "Inspection Time (sec)"

        ];


        const rows = reports.map((report) => [

            report.id ?? "",

            report.product_code ?? "",

            report.product_name ?? "",

            report.production_line ?? "",

            report.inspection_status ?? "",

            report.pass_fail ?? "",

            report.confidence_score ?? "",

            report.inspection_time ?? ""

        ]);


        const csvRows = [

            headers,

            ...rows

        ].map((row) =>

            row.map((value) => {

                const text =
                    String(value);

                return `"${text.replace(
                    /"/g,
                    '""'
                )}"`;

            }).join(",")

        );


        /* ========================================================
           ANALYTICS SUMMARY
        ======================================================== */

        csvRows.push("");

        csvRows.push(
            "INSPECTION ANALYTICS"
        );


        csvRows.push(
            `Total Inspections,${reports.length}`
        );


        csvRows.push(
            `Passed Inspections,${passedReports.length}`
        );


        csvRows.push(
            `Defective Inspections,${defectReports.length}`
        );


        csvRows.push(
            `No Data Inspections,${noDataReports.length}`
        );


        csvRows.push(
            `Pass Rate,${passRate}%`
        );


        csvRows.push(
            `Defect Rate,${defectRate}%`
        );


        csvRows.push(
            `Average AI Confidence,${averageConfidence}%`
        );


        csvRows.push(
            `Average Inspection Time,${averageInspectionTime} sec`
        );


        csvRows.push(
            `Confidence >= 95%,${highConfidence}`
        );


        csvRows.push(
            `Confidence 85-95%,${reliableConfidence}`
        );


        csvRows.push(
            `Confidence 70-85%,${reviewConfidence}`
        );


        csvRows.push(
            `Confidence < 70%,${lowConfidence}`
        );


        /* ========================================================
           CREATE FILE
        ======================================================== */

        const csvContent =
            csvRows.join("\n");


        const blob = new Blob(
            [csvContent],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;


        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        link.download =
            `VisionInspectAI_Inspection_Report_${today}.csv`;


        document.body.appendChild(link);


        link.click();


        document.body.removeChild(link);


        URL.revokeObjectURL(url);

    };


    /* ============================================================
       RENDER
    ============================================================ */

    return (

        <div className="dashboard-container">

            <SupervisorSidebar />


            <div className="dashboard-main">

                <SupervisorHeader />


                {/* ==================================================
                    PAGE HEADER
                ================================================== */}

                <div className="inspection-report-header">

                    <div>

                        <h1>
                            Inspection Report
                        </h1>

                        <p>
                            AI-powered inspection performance
                            and quality analytics
                        </p>

                    </div>


                    <button
                        className="download-report-button"
                        onClick={downloadReport}
                    >

                        ↓

                        &nbsp;

                        Download Report

                    </button>

                </div>


                {/* ==================================================
                    EXISTING KPI SECTION
                ================================================== */}

                <div className="kpi-container">

                    <div className="kpi-card">

                        <h4>
                            Completed
                        </h4>

                        <h2>
                            {data.summary.completed || 0}
                        </h2>

                    </div>


                    <div className="kpi-card">

                        <h4>
                            Pending
                        </h4>

                        <h2>
                            {data.summary.pending || 0}
                        </h2>

                    </div>


                    <div className="kpi-card">

                        <h4>
                            PASS
                        </h4>

                        <h2>
                            {data.summary.passed || 0}
                        </h2>

                    </div>


                    <div className="kpi-card">

                        <h4>
                            DEFECT
                        </h4>

                        <h2>
                            {data.summary.defects || 0}
                        </h2>

                    </div>

                </div>


                {/* ==================================================
                    ADDITIONAL ANALYTICS KPI SECTION
                ================================================== */}

                <div className="kpi-container analytics-kpi-container">

                    <div className="kpi-card analytics-card">

                        <h4>
                            Pass Rate
                        </h4>

                        <h2>
                            {passRate}%
                        </h2>

                        <p>
                            Successful inspections
                        </p>

                    </div>


                    <div className="kpi-card analytics-card">

                        <h4>
                            Defect Rate
                        </h4>

                        <h2>
                            {defectRate}%
                        </h2>

                        <p>
                            Inspections with defects
                        </p>

                    </div>


                    <div className="kpi-card analytics-card">

                        <h4>
                            Avg Confidence
                        </h4>

                        <h2>
                            {averageConfidence}%
                        </h2>

                        <p>
                            AI prediction confidence
                        </p>

                    </div>


                    <div className="kpi-card analytics-card">

                        <h4>
                            Avg Inspection Time
                        </h4>

                        <h2>
                            {averageInspectionTime}s
                        </h2>

                        <p>
                            Average processing time
                        </p>

                    </div>

                </div>


                {/* ==================================================
                    EXISTING PIE CHART
                ================================================== */}

                <div className="panel">

                    <h2>
                        Inspection Result Distribution
                    </h2>


                    <div
                        style={{
                            height: "350px"
                        }}
                    >

                        <ResponsiveContainer>

                            <PieChart>

                                <Pie
                                    data={data.chart}
                                    dataKey="value"
                                    nameKey="pass_fail"
                                    outerRadius={120}
                                    label
                                >

                                    {

                                        data.chart.map(
                                            (entry, index) => (

                                                <Cell
                                                    key={index}
                                                    fill={
                                                        entry.pass_fail ===
                                                        "NO DATA"

                                                            ? "#ff4d4f"

                                                            :

                                                            COLORS[
                                                                index %
                                                                COLORS.length
                                                            ]
                                                    }
                                                />

                                            )
                                        )

                                    }

                                </Pie>


                                <Legend />

                                <Tooltip />

                            </PieChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    INSPECTION STATUS ANALYTICS
                ================================================== */}

                <div className="panel analytics-panel">

                    <h2>
                        Inspection Status Analytics
                    </h2>


                    <p className="analytics-description">

                        Comparison of PASS, DEFECT and
                        NO DATA inspection results.

                    </p>


                    <div
                        className="analytics-chart"
                        style={{
                            height: "320px"
                        }}
                    >

                        <ResponsiveContainer>

                            <BarChart
                                data={statusAnalytics}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#303744"
                                />


                                <XAxis
                                    dataKey="status"
                                    stroke="#aeb8c8"
                                />


                                <YAxis
                                    allowDecimals={false}
                                    stroke="#aeb8c8"
                                />


                                <Tooltip />


                                <Bar
                                    dataKey="count"
                                    name="Inspections"
                                    fill="#4fa7ff"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    AI CONFIDENCE ANALYTICS
                ================================================== */}

                <div className="panel analytics-panel">

                    <h2>
                        AI Confidence Distribution
                    </h2>


                    <p className="analytics-description">

                        Distribution of inspection predictions
                        according to AI confidence.

                    </p>


                    <div
                        className="analytics-chart"
                        style={{
                            height: "320px"
                        }}
                    >

                        <ResponsiveContainer>

                            <BarChart
                                data={
                                    confidenceAnalytics
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#303744"
                                />


                                <XAxis
                                    dataKey="range"
                                    stroke="#aeb8c8"
                                />


                                <YAxis
                                    allowDecimals={false}
                                    stroke="#aeb8c8"
                                />


                                <Tooltip />


                                <Bar
                                    dataKey="count"
                                    name="Inspections"
                                    fill="#8884D8"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    PRODUCTION LINE ANALYTICS
                ================================================== */}

                <div className="panel analytics-panel">

                    <h2>
                        Production Line Performance
                    </h2>


                    <p className="analytics-description">

                        Inspection volume and defective
                        inspections across production lines.

                    </p>


                    <div
                        className="analytics-chart"
                        style={{
                            height: "350px"
                        }}
                    >

                        <ResponsiveContainer>

                            <BarChart
                                data={
                                    productionLineAnalytics
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#303744"
                                />


                                <XAxis
                                    dataKey="line"
                                    stroke="#aeb8c8"
                                />


                                <YAxis
                                    allowDecimals={false}
                                    stroke="#aeb8c8"
                                />


                                <Tooltip />

                                <Legend />


                                <Bar
                                    dataKey="inspections"
                                    name="Inspections"
                                    fill="#4fa7ff"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />


                                <Bar
                                    dataKey="defects"
                                    name="Defects"
                                    fill="#ff4d4f"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    INSPECTION PROCESSING TIME
                ================================================== */}

                <div className="panel analytics-panel">

                    <h2>
                        Inspection Processing Time
                    </h2>


                    <p className="analytics-description">

                        Processing time recorded for each
                        inspection.

                    </p>


                    <div
                        className="analytics-chart"
                        style={{
                            height: "320px"
                        }}
                    >

                        <ResponsiveContainer>

                            <LineChart
                                data={
                                    inspectionTimeAnalytics
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#303744"
                                />


                                <XAxis
                                    dataKey="inspection"
                                    stroke="#aeb8c8"
                                />


                                <YAxis
                                    stroke="#aeb8c8"
                                />


                                <Tooltip />


                                <Line
                                    type="monotone"
                                    dataKey="time"
                                    name="Inspection Time"
                                    stroke="#4fa7ff"
                                    strokeWidth={3}
                                    dot={{
                                        r: 4
                                    }}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    ANALYTICS SUMMARY
                ================================================== */}

                <div className="panel analytics-summary-panel">

                    <h2>
                        Inspection Analytics Summary
                    </h2>


                    <div className="analytics-summary-grid">


                        <div className="analytics-summary-item">

                            <span>
                                Total Inspections
                            </span>

                            <strong>
                                {reports.length}
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                Passed Inspections
                            </span>

                            <strong>
                                {passedReports.length}
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                Defective Inspections
                            </span>

                            <strong>
                                {defectReports.length}
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                Average AI Confidence
                            </span>

                            <strong>
                                {averageConfidence}%
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                Average Processing Time
                            </span>

                            <strong>
                                {averageInspectionTime}s
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                High Confidence ≥95%
                            </span>

                            <strong>
                                {highConfidence}
                            </strong>

                        </div>


                        <div className="analytics-summary-item">

                            <span>
                                Requires Review &lt;70%
                            </span>

                            <strong>
                                {lowConfidence}
                            </strong>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    EXISTING INSPECTION REPORT TABLE
                ================================================== */}

                <div className="panel">

                    <h2>
                        Inspection Report
                    </h2>


                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Code
                                </th>

                                <th>
                                    Product
                                </th>

                                <th>
                                    Line
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Result
                                </th>

                                <th>
                                    Confidence
                                </th>

                                <th>
                                    Time
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {

                                data.reports.length === 0

                                    ?

                                    (

                                        <tr>

                                            <td
                                                colSpan="7"
                                            >

                                                No inspections
                                                available.

                                            </td>

                                        </tr>

                                    )

                                    :

                                    data.reports.map(
                                        (report) => (

                                            <tr
                                                key={
                                                    report.id
                                                }
                                            >

                                                <td>
                                                    {
                                                        report.product_code
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        report.product_name
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        report.production_line
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        report.inspection_status
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        report.pass_fail
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        report.confidence_score
                                                    }%
                                                </td>

                                                <td>
                                                    {
                                                        report.inspection_time
                                                    } sec
                                                </td>

                                            </tr>

                                        )
                                    )

                            }

                        </tbody>

                    </table>

                </div>


            </div>

        </div>

    );

}


export default InspectionReportsSupervisor;