import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";

import api from "../services/api";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";
import "../styles/DefectTrends.css";


const COLORS = [
    "#00C49F",
    "#0088FE",
    "#FFBB28",
    "#AA66CC",
    "#FF8042",
    "#00B8D9",
    "#FF4D4F"
];


function DefectTrends() {

    const [data, setData] = useState({
        summary: {
            total_defects: 0,
            total_inspections: 0,
            defect_rate: 0,
            defects_per_inspection: 0,
            most_common_defect: "No Data"
        },

        daily_trend: [],
        weekly_trend: [],
        monthly_trend: [],

        defect_type_trends: [],
        production_line_trends: [],

        filters: {
            production_lines: [],
            categories: [],
            defect_types: []
        }
    });


    const [period, setPeriod] =
        useState("this_month");

    const [productionLine, setProductionLine] =
        useState("");

    const [category, setCategory] =
        useState("");

    const [defectType, setDefectType] =
        useState("");

    const [startDate, setStartDate] =
        useState("");

    const [endDate, setEndDate] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    // ============================================================
    // LOAD DATA
    // ============================================================

    


    useEffect(() => {

    const loadTrendData = async () => {
        try {
            setLoading(true);

            const params = {
                period,
                production_line: productionLine || undefined,
                category: category || undefined,
                defect_type: defectType || undefined
            };

            if (period === "custom") {
                params.start_date = startDate || undefined;
                params.end_date = endDate || undefined;
            }

            const response = await api.get(
                "/supervisor/defect-trends",
                { params }
            );

            setData(response.data);

        } catch (error) {
            console.error("Error loading defect trends:", error);
        } finally {
            setLoading(false);
        }
    };

    loadTrendData();

}, [
    period,
    productionLine,
    category,
    defectType,
    startDate,
    endDate
]);
    // ============================================================
    // TYPE TREND DATA
    // ============================================================

    const defectTypeNames = [
    ...new Set(
        data.defect_type_trends.flatMap(item =>
            Object.keys(item).filter(key => key !== "date")
        )
    )
];

    const defectTypeTrendData = data.defect_type_trends.map(item => {
    const row = {
        date: item.date
    };

    defectTypeNames.forEach(type => {
        row[type] = Number(item[type] || 0);
    });

    return row;
});


    // ============================================================
    // PRODUCTION LINE TREND DATA
    // ============================================================

    const productionLineNames = [
    ...new Set(
        data.production_line_trends.flatMap(item =>
            Object.keys(item).filter(key => key !== "date")
        )
    )
];

    const productionLineTrendData = data.production_line_trends.map(item => {
    const row = {
        date: item.date
    };

    productionLineNames.forEach(line => {
        row[line] = Number(item[line] || 0);
    });

    return row;
});


    return (

        <div className="dashboard-container">

            <SupervisorSidebar />

            <div className="dashboard-main">

                <SupervisorHeader />


                {/* ==================================================
                    PAGE HEADER
                ================================================== */}

                <div className="defect-trends-header">

                    <div>

                        <h1>
                            Defect Trends
                        </h1>

                        <p>
                            Monitor how defects change over time
                            across products, defect types and
                            production lines.
                        </p>

                    </div>

                </div>


                {/* ==================================================
                    FILTERS
                ================================================== */}

                <div className="panel defect-trends-filters">

                    <h2>
                        Filters
                    </h2>


                    <div className="trend-filter-grid">

                        <div className="trend-filter">

                            <label>
                                Period
                            </label>

                            <select
                                value={period}
                                onChange={(e) =>
                                    setPeriod(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="today">
                                    Today
                                </option>

                                <option value="this_week">
                                    This Week
                                </option>

                                <option value="this_month">
                                    This Month
                                </option>

                                <option value="custom">
                                    Custom Date Range
                                </option>

                            </select>

                        </div>


                        <div className="trend-filter">

                            <label>
                                Production Line
                            </label>

                            <select
                                value={productionLine}
                                onChange={(e) =>
                                    setProductionLine(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="">
                                    All Production Lines
                                </option>

                                {
                                    data.filters
                                        .production_lines
                                        .map((line) => (

                                            <option
                                                key={line}
                                                value={line}
                                            >
                                                {line}
                                            </option>

                                        ))
                                }

                            </select>

                        </div>


                        <div className="trend-filter">

                            <label>
                                Product Category
                            </label>

                            <select
                                value={category}
                                onChange={(e) =>
                                    setCategory(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="">
                                    All Categories
                                </option>

                                {
                                    data.filters
                                        .categories
                                        .map((item) => (

                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {item}
                                            </option>

                                        ))
                                }

                            </select>

                        </div>


                        <div className="trend-filter">

                            <label>
                                Defect Type
                            </label>

                            <select
                                value={defectType}
                                onChange={(e) =>
                                    setDefectType(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="">
                                    All Defect Types
                                </option>

                                {
                                    data.filters
                                        .defect_types
                                        .map((item) => (

                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {item}
                                            </option>

                                        ))
                                }

                            </select>

                        </div>

                    </div>


                    {
                        period === "custom" && (

                            <div className="custom-date-row">

                                <div className="trend-filter">

                                    <label>
                                        Start Date
                                    </label>

                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) =>
                                            setStartDate(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="trend-filter">

                                    <label>
                                        End Date
                                    </label>

                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) =>
                                            setEndDate(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>

                        )
                    }

                </div>


                {/* ==================================================
                    KPI CARDS
                ================================================== */}

                <div className="trend-kpi-grid">

                    <div className="trend-kpi-card">

                        <span>
                            TOTAL DEFECTS
                        </span>

                        <strong>
                            {
                                data.summary
                                    .total_defects
                            }
                        </strong>

                        <small>
                            Detected
                        </small>

                    </div>


                    <div className="trend-kpi-card">

                        <span>
                            DEFECT RATE
                        </span>

                        <strong>
                            {
                                Number(
                                    data.summary
                                        .defect_rate
                                ).toFixed(1)
                            }%
                        </strong>

                        <small>
                            Defective inspections
                        </small>

                    </div>


                    <div className="trend-kpi-card">

                        <span>
                            DEFECTS / INSPECTION
                        </span>

                        <strong>
                            {
                                Number(
                                    data.summary
                                        .defects_per_inspection
                                ).toFixed(2)
                            }
                        </strong>

                        <small>
                            Average
                        </small>

                    </div>


                    <div className="trend-kpi-card">

                        <span>
                            MOST COMMON DEFECT
                        </span>

                        <strong className="trend-kpi-text">

                            {
                                data.summary
                                    .most_common_defect
                            }

                        </strong>

                        <small>
                            Highest occurrence
                        </small>

                    </div>

                </div>


                {/* ==================================================
                    DAILY DEFECT TREND
                ================================================== */}

                <div className="panel trend-chart-panel">

                    <div className="trend-chart-header">

                        <div>

                            <h2>
                                Defects by Date
                            </h2>

                            <p>
                                Daily number of detected defects.
                            </p>

                        </div>

                    </div>


                    <div className="trend-chart">

                        {
                            loading ? (

                                <div className="trend-empty">
                                    Loading trend data...
                                </div>

                            ) : data.daily_trend.length === 0 ? (

                                <div className="trend-empty">
                                    No defect trend data available.
                                </div>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height={380}
                                >

                                    <LineChart
                                        data={
                                            data.daily_trend
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis
                                            dataKey="date"
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                        />

                                        <Tooltip />

                                        <Legend />

                                        <Line
                                            type="monotone"
                                            dataKey="defects"
                                            name="Defects"
                                            stroke="#00C49F"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4
                                            }}
                                        />

                                    </LineChart>

                                </ResponsiveContainer>

                            )
                        }

                    </div>

                </div>


                {/* ==================================================
                    WEEKLY / MONTHLY
                ================================================== */}

                <div className="trend-two-column">


                    <div className="panel trend-chart-panel">

                        <h2>
                            Weekly Defects
                        </h2>

                        <p className="chart-description">
                            Defect count by week.
                        </p>


                        <ResponsiveContainer
                            width="100%"
                            height={330}
                        >

                            <LineChart
                                data={
                                    data.weekly_trend
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                />

                                <XAxis
                                    dataKey="week"
                                />

                                <YAxis
                                    allowDecimals={false}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="defects"
                                    stroke="#0088FE"
                                    strokeWidth={3}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>


                    <div className="panel trend-chart-panel">

                        <h2>
                            Monthly Defects
                        </h2>

                        <p className="chart-description">
                            Defect count by month.
                        </p>


                        <ResponsiveContainer
                            width="100%"
                            height={330}
                        >

                            <LineChart
                                data={
                                    data.monthly_trend
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                />

                                <XAxis
                                    dataKey="month"
                                />

                                <YAxis
                                    allowDecimals={false}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="defects"
                                    stroke="#FFBB28"
                                    strokeWidth={3}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* ==================================================
                    DEFECT TYPE TRENDS
                ================================================== */}

                <div className="panel trend-chart-panel">

                    <h2>
                        Defect Type Trends
                    </h2>

                    <p className="chart-description">
                        Track how individual defect types
                        increase or decrease over time.
                    </p>


                    {
                        data.defect_type_trends.length === 0 ? (

                            <div className="trend-empty">
                                No defect type trend data available.
                            </div>

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height={400}
                            >

                                <LineChart data={defectTypeTrendData}>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="date"
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                    />

                                    <Tooltip />

                                    <Legend />

                                    {
                                        defectTypeNames.map(
                                            (name, index) => (

                                                <Line
                                                    key={name}
                                                    type="monotone"
                                                    dataKey={name}
                                                    name={name}
                                                    stroke={
                                                        COLORS[
                                                            index %
                                                            COLORS.length
                                                        ]
                                                    }
                                                    strokeWidth={2}
                                                    dot={false}
                                                />

                                            )
                                        )

                                    }

                                </LineChart>

                            </ResponsiveContainer>

                        )
                    }

                </div>


                {/* ==================================================
                    PRODUCTION LINE TRENDS
                ================================================== */}

                <div className="panel trend-chart-panel">

                    <h2>
                        Defects by Production Line Over Time
                    </h2>

                    <p className="chart-description">
                        Compare defect occurrence across
                        production lines over time.
                    </p>


                    {
                        data.production_line_trends.length === 0 ? (

                            <div className="trend-empty">
                                No production line trend data available.
                            </div>

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height={400}
                            >

                                <LineChart data={productionLineTrendData}>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="date"
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                    />

                                    <Tooltip />

                                    <Legend />

                                    {
                                        productionLineNames.map(
                                            (name, index) => (

                                                <Line
                                                    key={name}
                                                    type="monotone"
                                                    dataKey={name}
                                                    name={name}
                                                    stroke={
                                                        COLORS[
                                                            index %
                                                            COLORS.length
                                                        ]
                                                    }
                                                    strokeWidth={2}
                                                    dot={false}
                                                />

                                            )
                                        )

                                    }

                                </LineChart>

                            </ResponsiveContainer>

                        )
                    }

                </div>

            </div>

        </div>

    );

}


export default DefectTrends;