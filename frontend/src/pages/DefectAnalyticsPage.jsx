import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import KPICard from "../components/KPICard";

import api from "../services/api";

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";
import "../styles/DefectAnalytics.css";


function DefectAnalyticsPage() {

    const [analytics, setAnalytics] = useState(null);

    const [defectDistribution, setDefectDistribution] =
        useState([]);

    const [advancedAnalytics, setAdvancedAnalytics] =
        useState(null);

    const [loading, setLoading] = useState(true);


    /* ============================================================
       MAIN ANALYTICS
    ============================================================ */

    useEffect(() => {

        let cancelled = false;

        const loadAnalytics = async () => {

            try {

                const response =
                    await api.get("/defect-analytics");

                if (!cancelled) {

                    setAnalytics(
                        response.data
                    );

                }

            } catch (error) {

                console.error(
                    "Error loading analytics:",
                    error
                );

            }

        };

        loadAnalytics();

        return () => {
            cancelled = true;
        };

    }, []);


    /* ============================================================
       DEFECT DISTRIBUTION
       SAME SOURCE AS DASHBOARD
    ============================================================ */

    useEffect(() => {

    let cancelled = false;

    const loadDefectDistribution = async () => {

        try {

            /*
             * FIRST:
             * Use the same /defect-distribution
             * endpoint used by Dashboard.
             */

            const response =
                await api.get("/defect-distribution");


            if (cancelled) {
                return;
            }


            const distribution =
                response.data?.defect_distribution;


            /*
             * If the endpoint returns valid data,
             * use it directly.
             */

            if (
                Array.isArray(distribution) &&
                distribution.length > 0
            ) {

                const totalDefects =
                    distribution.reduce(
                        (total, item) =>
                            total +
                            Number(
                                item.count || 0
                            ),
                        0
                    );


                const formattedData =
                    distribution.map((item) => {

                        const count =
                            Number(
                                item.count || 0
                            );


                        return {

                            defect_type:
                                item.defect_type,

                            count: count,

                            percentage:
                                totalDefects > 0
                                    ? (
                                        count /
                                        totalDefects
                                    ) * 100
                                    : 0

                        };

                    });


                setDefectDistribution(
                    formattedData
                );


                return;

            }


            /*
             * FALLBACK:
             *
             * The advanced analytics endpoint is
             * already working and contains the exact
             * defect counts grouped by defect type.
             *
             * defect_size:
             *
             * {
             *   defect_type,
             *   average_size,
             *   maximum_size,
             *   defect_count
             * }
             */

            if (
                advancedAnalytics &&
                Array.isArray(
                    advancedAnalytics.defect_size
                )
            ) {

                const fallback =
                    advancedAnalytics.defect_size.map(
                        (item) => ({

                            defect_type:
                                item.defect_type,

                            count:
                                Number(
                                    item.defect_count || 0
                                )

                        })
                    );


                const totalDefects =
                    fallback.reduce(
                        (total, item) =>
                            total + item.count,
                        0
                    );


                const formattedFallback =
                    fallback.map((item) => ({

                        defect_type:
                            item.defect_type,

                        count:
                            item.count,

                        percentage:
                            totalDefects > 0
                                ? (
                                    item.count /
                                    totalDefects
                                ) * 100
                                : 0

                    }));


                setDefectDistribution(
                    formattedFallback
                );

                return;

            }


            setDefectDistribution([]);

        } catch (error) {

            console.error(
                "Error loading defect distribution:",
                error
            );


            /*
             * EVEN IF /defect-distribution FAILS,
             * use the already-loaded advanced analytics.
             */

            if (
                advancedAnalytics &&
                Array.isArray(
                    advancedAnalytics.defect_size
                )
            ) {

                const fallback =
                    advancedAnalytics.defect_size.map(
                        (item) => ({

                            defect_type:
                                item.defect_type,

                            count:
                                Number(
                                    item.defect_count || 0
                                )

                        })
                    );


                const totalDefects =
                    fallback.reduce(
                        (total, item) =>
                            total + item.count,
                        0
                    );


                setDefectDistribution(
                    fallback.map((item) => ({

                        defect_type:
                            item.defect_type,

                        count:
                            item.count,

                        percentage:
                            totalDefects > 0
                                ? (
                                    item.count /
                                    totalDefects
                                ) * 100
                                : 0

                    }))
                );

            } else {

                setDefectDistribution([]);

            }

        }

    };


    /*
     * Only run after advanced analytics is available.
     * This guarantees the fallback has real data.
     */

    if (advancedAnalytics) {

        loadDefectDistribution();

    }


    return () => {

        cancelled = true;

    };

}, [advancedAnalytics]);


    /* ============================================================
       ADVANCED ANALYTICS
    ============================================================ */

    useEffect(() => {

        let cancelled = false;

        const loadAdvancedAnalytics =
            async () => {

                try {

                    const response =
                        await api.get(
                            "/defect-advanced-analytics"
                        );


                    if (!cancelled) {

                        setAdvancedAnalytics(
                            response.data
                        );

                    }

                } catch (error) {

                    console.error(
                        "Error loading advanced analytics:",
                        error
                    );

                } finally {

                    if (!cancelled) {

                        setLoading(false);

                    }

                }

            };


        loadAdvancedAnalytics();


        return () => {
            cancelled = true;
        };

    }, []);


    /* ============================================================
       LOADING
    ============================================================ */

    if (
        !analytics ||
        !advancedAnalytics ||
        loading
    ) {

        return (

            <div className="dashboard-container">

                <Sidebar />

                <div className="dashboard-main">

                    <DashboardHeader />

                    <p>
                        Loading Defect Analytics...
                    </p>

                </div>

            </div>

        );

    }


    const summary =
        analytics.summary || {};


    const maximumProduct =
        advancedAnalytics
            .maximum_defects_product;


    /* ============================================================
       PRODUCTION LINE DATA

       Normalize spaces such as:
       "LINE 3 "
       "LINE 3"
    ============================================================ */

    const productionMap = new Map();


    (
        advancedAnalytics.production_lines ||
        []
    ).forEach((line) => {

        const name =
            String(
                line.production_line || ""
            ).trim();


        if (!name) {
            return;
        }


        if (!productionMap.has(name)) {

            productionMap.set(
                name,
                {
                    production_line:
                        name,

                    defect_count:
                        Number(
                            line.defect_count || 0
                        )
                }
            );

        } else {

            const existing =
                productionMap.get(name);


            existing.defect_count +=
                Number(
                    line.defect_count || 0
                );

        }

    });


    const productionLineData =
        Array.from(
            productionMap.values()
        );


    /* ============================================================
       REAL API DATA ARRAYS

       These use the EXACT field names returned by:
       /defect-advanced-analytics
    ============================================================ */

    const defectSizeData =
        advancedAnalytics.defect_size || [];


    const defectConfidenceData =
        advancedAnalytics.defect_confidence || [];


    const defectTrendData =
        advancedAnalytics.defect_trend || [];


    const defectLocationData =
        advancedAnalytics.defect_location || [];


    const severityData =
        advancedAnalytics.severity_distribution || [];


    const productData =
        advancedAnalytics.defects_per_product || [];


    return (

        <div className="dashboard-container">

            <Sidebar />


            <div className="dashboard-main">

                <DashboardHeader />


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="analytics-page-header">

                    <h1>
                        Defect Analytics
                    </h1>

                    <p>
                        Comprehensive analysis of
                        detected defects, severity,
                        size, location and production
                        trends.
                    </p>

                </div>


                {/* =================================================
                    KPI CARDS
                ================================================= */}

                <div className="kpi-container">

                    <KPICard
                        title="Total Defects"
                        value={
                            summary.total_defects ?? 0
                        }
                        subtitle="Detected"
                        trend="Live"
                    />


                    <KPICard
                        title="Total Inspections"
                        value={
                            summary.total_inspections ?? 0
                        }
                        subtitle="Products"
                        trend="Live"
                    />


                    <KPICard
                        title="Average AI Confidence"
                        value={
                            `${Number(
                                summary.avg_confidence ?? 0
                            ).toFixed(1)}%`
                        }
                        subtitle="Overall"
                        trend="Live"
                    />


                    <KPICard
                        title="Maximum Defects"
                        value={
                            maximumProduct
                                ?.defect_count ?? 0
                        }
                        subtitle={
                            maximumProduct
                                ?.product_code ||
                            "No data"
                        }
                        trend="Highest"
                    />

                </div>


                {/* =================================================
                    ROW 1
                    DEFECT TYPE
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECT DISTRIBUTION
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defect Type Distribution
                        </h2>

                        <p className="chart-description">
                            Number of detected defects
                            for each defect type.
                        </p>


                        {
                            defectDistribution.length === 0 ? (

                                <p>
                                    No defect distribution
                                    data available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <BarChart
                                        data={
                                            defectDistribution
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        <XAxis
                                            dataKey="defect_type"
                                            angle={-25}
                                            textAnchor="end"
                                            height={70}
                                        />


                                        <YAxis />


                                        <Tooltip />


                                        <Legend />


                                        <Bar
                                            dataKey="count"
                                            name="Defects"
                                            fill="#38bdf8"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>


                    {/* =================================================
                        DEFECT SHARE
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defect Distribution %
                        </h2>

                        <p className="chart-description">
                            Percentage contribution of
                            each detected defect type.
                        </p>


                        {
                            defectDistribution.length === 0 ? (

                                <p>
                                    No defect data available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <PieChart>

                                        <Pie
                                            data={
                                                defectDistribution
                                            }
                                            dataKey="count"
                                            nameKey="defect_type"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={105}
                                            label
                                        >

                                            {
                                                defectDistribution.map(
                                                    (
                                                        item,
                                                        index
                                                    ) => (

                                                        <Cell
                                                            key={
                                                                `defect-${index}`
                                                            }
                                                            fill={
                                                                [
                                                                    "#38bdf8",
                                                                    "#818cf8",
                                                                    "#a78bfa",
                                                                    "#22c55e",
                                                                    "#f59e0b",
                                                                    "#f97316",
                                                                    "#ec4899",
                                                                    "#14b8a6"
                                                                ][
                                                                    index % 8
                                                                ]
                                                            }
                                                        />

                                                    )
                                                )
                                            }

                                        </Pie>


                                        <Tooltip
                                            formatter={(
                                                value,
                                                name,
                                                props
                                            ) => [

                                                `${Number(
                                                    props.payload
                                                        ?.percentage || 0
                                                ).toFixed(1)}%`,

                                                name

                                            ]}
                                        />


                                        <Legend />

                                    </PieChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>

                </div>


                {/* =================================================
                    ROW 2
                    SIZE + CONFIDENCE
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECT SIZE
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defect Size Analysis
                        </h2>

                        <p className="chart-description">
                            Bounding-box area
                            calculated from YOLO
                            width × height.
                        </p>


                        {
                            defectSizeData.length === 0 ? (

                                <p>
                                    No defect size data
                                    available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <BarChart
                                        data={
                                            defectSizeData
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        <XAxis
                                            dataKey="defect_type"
                                            angle={-25}
                                            textAnchor="end"
                                            height={70}
                                        />


                                        <YAxis />


                                        <Tooltip />


                                        <Legend />


                                        <Bar
                                            dataKey="average_size"
                                            name="Average Area"
                                            fill="#38bdf8"
                                        />


                                        <Bar
                                            dataKey="maximum_size"
                                            name="Maximum Area"
                                            fill="#818cf8"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>


                    {/* =================================================
                        CONFIDENCE
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Detection Confidence
                        </h2>

                        <p className="chart-description">
                            Average and maximum YOLO
                            confidence by defect type.
                        </p>


                        {
                            defectConfidenceData.length === 0 ? (

                                <p>
                                    No confidence data
                                    available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <BarChart
                                        data={
                                            defectConfidenceData
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        <XAxis
                                            dataKey="defect_type"
                                            angle={-25}
                                            textAnchor="end"
                                            height={70}
                                        />


                                        <YAxis
                                            domain={[0, 100]}
                                        />


                                        <Tooltip
                                            formatter={(value) =>
                                                `${Number(
                                                    value
                                                ).toFixed(2)}%`
                                            }
                                        />


                                        <Legend />


                                        <Bar
                                            dataKey="average_confidence"
                                            name="Average Confidence"
                                            fill="#22c55e"
                                        />


                                        <Bar
                                            dataKey="maximum_confidence"
                                            name="Maximum Confidence"
                                            fill="#38bdf8"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>

                </div>


                {/* =================================================
                    ROW 3
                    TREND + LOCATION
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECT TREND

                        IMPORTANT:
                        API returns inspection_date
                        NOT date
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defect Trend
                        </h2>

                        <p className="chart-description">
                            Defects detected over
                            inspection dates.
                        </p>


                        {
                            defectTrendData.length === 0 ? (

                                <p>
                                    No defect trend data
                                    available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <LineChart
                                        data={
                                            defectTrendData
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        {/* FIXED:
                                            inspection_date
                                            instead of date
                                        */}

                                        <XAxis
                                            dataKey="inspection_date"
                                        />


                                        <YAxis />


                                        <Tooltip />


                                        <Legend />


                                        <Line
                                            type="monotone"

                                            dataKey="defect_count"

                                            name="Defects"

                                            stroke="#38bdf8"

                                            strokeWidth={3}

                                            dot={{
                                                r: 5
                                            }}

                                            activeDot={{
                                                r: 7
                                            }}
                                        />

                                    </LineChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>


                    {/* =================================================
                        LOCATION

                        IMPORTANT:
                        API returns bbox_x / bbox_y
                        NOT x / y
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defect Location
                        </h2>

                        <p className="chart-description">
                            Actual YOLO bounding-box
                            X/Y coordinates.
                        </p>


                        {
                            defectLocationData.length === 0 ? (

                                <p>
                                    No defect location
                                    data available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <ScatterChart>

                                        <CartesianGrid />


                                        {/* FIXED:
                                            bbox_x
                                            instead of x
                                        */}

                                        <XAxis
                                            type="number"
                                            dataKey="bbox_x"
                                            name="X Position"
                                        />


                                        {/* FIXED:
                                            bbox_y
                                            instead of y
                                        */}

                                        <YAxis
                                            type="number"
                                            dataKey="bbox_y"
                                            name="Y Position"
                                        />


                                        <Tooltip
                                            cursor={{
                                                strokeDasharray:
                                                    "3 3"
                                            }}

                                            content={({
                                                active,
                                                payload
                                            }) => {

                                                if (
                                                    !active ||
                                                    !payload ||
                                                    !payload.length
                                                ) {

                                                    return null;

                                                }


                                                const item =
                                                    payload[0]
                                                        .payload;


                                                return (

                                                    <div
                                                        style={{
                                                            background:
                                                                "#111827",
                                                            border:
                                                                "1px solid #334155",
                                                            borderRadius:
                                                                "8px",
                                                            padding:
                                                                "10px 12px",
                                                            color:
                                                                "#e2e8f0"
                                                        }}
                                                    >

                                                        <p>
                                                            <strong>
                                                                {
                                                                    item.defect_type
                                                                }
                                                            </strong>
                                                        </p>

                                                        <p>
                                                            X:
                                                            {" "}
                                                            {
                                                                item.bbox_x
                                                            }
                                                        </p>

                                                        <p>
                                                            Y:
                                                            {" "}
                                                            {
                                                                item.bbox_y
                                                            }
                                                        </p>

                                                        <p>
                                                            Width:
                                                            {" "}
                                                            {
                                                                item.bbox_width
                                                            }
                                                        </p>

                                                        <p>
                                                            Height:
                                                            {" "}
                                                            {
                                                                item.bbox_height
                                                            }
                                                        </p>

                                                        <p>
                                                            Confidence:
                                                            {" "}
                                                            {
                                                                Number(
                                                                    item.confidence ||
                                                                    0
                                                                ).toFixed(2)
                                                            }%
                                                        </p>

                                                        <p>
                                                            Severity:
                                                            {" "}
                                                            {
                                                                item.severity ||
                                                                "Unknown"
                                                            }
                                                        </p>

                                                    </div>

                                                );

                                            }}
                                        />


                                        <Scatter
                                            name="Defects"
                                            data={
                                                defectLocationData
                                            }
                                            fill="#f97316"
                                        />

                                    </ScatterChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>

                </div>


                {/* =================================================
                    ROW 4
                    PRODUCTION LINES
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECTS BY LINE
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defects Across Production Lines
                        </h2>

                        <p className="chart-description">
                            Total number of defects
                            detected on each
                            production line.
                        </p>


                        {
                            productionLineData.length === 0 ? (

                                <p>
                                    No production line
                                    defect data available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <BarChart
                                        data={
                                            productionLineData
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        <XAxis
                                            dataKey="production_line"
                                        />


                                        <YAxis />


                                        <Tooltip />


                                        <Legend />


                                        <Bar
                                            dataKey="defect_count"
                                            name="Defects"
                                            fill="#f97316"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>


                    {/* =================================================
                        SEVERITY

                        IMPORTANT:
                        API returns defect_count
                        NOT count
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Severity Distribution
                        </h2>

                        <p className="chart-description">
                            Distribution of detected
                            defects by severity.
                        </p>


                        {
                            severityData.length === 0 ? (

                                <p>
                                    No severity data
                                    available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={330}
                                >

                                    <PieChart>

                                        <Pie
                                            data={
                                                severityData
                                            }

                                            dataKey="defect_count"

                                            nameKey="severity"

                                            cx="50%"

                                            cy="50%"

                                            outerRadius={105}

                                            label
                                        >

                                            {
                                                severityData.map(
                                                    (
                                                        item,
                                                        index
                                                    ) => {

                                                        const severity =
                                                            String(
                                                                item.severity ||
                                                                "Unknown"
                                                            );


                                                        let fill =
                                                            "#94a3b8";


                                                        if (
                                                            severity ===
                                                            "High"
                                                        ) {

                                                            fill =
                                                                "#ef4444";

                                                        } else if (
                                                            severity ===
                                                            "Medium"
                                                        ) {

                                                            fill =
                                                                "#f59e0b";

                                                        } else if (
                                                            severity ===
                                                            "Low"
                                                        ) {

                                                            fill =
                                                                "#22c55e";

                                                        }


                                                        return (

                                                            <Cell
                                                                key={
                                                                    `severity-${index}`
                                                                }
                                                                fill={
                                                                    fill
                                                                }
                                                            />

                                                        );

                                                    }
                                                )
                                            }

                                        </Pie>


                                        <Tooltip />


                                        <Legend />

                                    </PieChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>

                </div>


                {/* =================================================
                    ROW 5
                    PRODUCTS
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECTS PER PRODUCT
                    ================================================= */}

                    <div className="panel chart-panel">

                        <h2>
                            Defects per Product
                        </h2>

                        <p className="chart-description">
                            Products ranked by the
                            number of detected defects.
                        </p>


                        {
                            productData.length === 0 ? (

                                <p>
                                    No product defect
                                    data available.
                                </p>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={360}
                                >

                                    <BarChart
                                        data={
                                            productData
                                        }
                                        layout="vertical"
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />


                                        <XAxis
                                            type="number"
                                        />


                                        <YAxis
                                            type="category"
                                            dataKey="product_code"
                                            width={110}
                                        />


                                        <Tooltip
                                            formatter={(
                                                value
                                            ) => [
                                                value,
                                                "Defects"
                                            ]}
                                        />


                                        <Legend />


                                        <Bar
                                            dataKey="defect_count"
                                            name="Defects"
                                            fill="#a78bfa"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>


                    {/* =================================================
                        MAXIMUM PRODUCT
                    ================================================= */}

                    <div className="panel maximum-defect-panel">

                        <h2>
                            Highest Defect Product
                        </h2>


                        {
                            maximumProduct ? (

                                <div className="maximum-defect-content">

                                    <div className="maximum-defect-number">

                                        {
                                            maximumProduct
                                                .defect_count
                                        }

                                    </div>


                                    <div className="maximum-defect-label">

                                        Defects Detected

                                    </div>


                                    <div className="maximum-defect-product">

                                        <strong>

                                            {
                                                maximumProduct
                                                    .product_name
                                            }

                                        </strong>


                                        <span>

                                            {
                                                maximumProduct
                                                    .product_code
                                            }

                                        </span>

                                    </div>

                                </div>

                            ) : (

                                <p>
                                    No defect data available.
                                </p>

                            )
                        }

                    </div>

                </div>


                


            </div>

        </div>

    );

}


export default DefectAnalyticsPage;