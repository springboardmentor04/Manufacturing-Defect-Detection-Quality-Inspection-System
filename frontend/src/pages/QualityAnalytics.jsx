import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import KPICard from "../components/KPICard";
import api from "../services/api";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";



function QualityAnalytics() {
    const [data, setData] = useState({
    summary: {
        defective_products: 0,
        total_defects: 0,
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0,
        average_confidence: 0,
        maximum_confidence: 0
    },

        defect_distribution: [],
        severity_distribution: [],
        confidence_by_type: [],
        confidence_distribution: [],
        defect_size: [],
        defect_location: [],
        production_line_quality: [],
        defects_per_product: [],
        highest_defect_product: null
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const loadAnalytics = async () => {

            try {

                setLoading(true);

                const response = await api.get(
                    "/supervisor/quality-analytics"
                );

                setData(response.data);

            } catch (error) {

                console.error(
                    "Error loading quality analytics:",
                    error
                );

            } finally {

                setLoading(false);

            }
        };

        loadAnalytics();

    }, []);


    if (loading) {
        return (
            <div className="dashboard-container">

                <SupervisorSidebar />

                <div className="dashboard-main">

                    <SupervisorHeader />

                    <div className="page-loading">
                        Loading quality analytics...
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

                <div className="dashboard-content">

                    {/* =====================================================
                        PAGE HEADER
                    ===================================================== */}

                    <div className="page-header">

                        <div>
                            <h1>Quality Analytics</h1>

                            <p>
                                Deep analysis of defect types, severity,
                                confidence, size, location and production
                                line quality.
                            </p>
                        </div>

                    </div>


                    {/* =====================================================
                        KPI SUMMARY
                    ===================================================== */}

                    <div className="kpi-container">

                        <KPICard
    title="Defective Products"
    value={Number(data.summary?.defective_products ?? 0)}
    subtitle="Failed Inspections"
    trend="Live"
/>

                        <KPICard
                            title="Average Confidence"
                            value={`${Number(
                                data.summary.average_confidence
                            ).toFixed(1)}%`}
                            subtitle="AI Detection Confidence"
                            trend="Live"
                        />

                        <KPICard
                            title="Maximum Confidence"
                            value={`${Number(
                                data.summary.maximum_confidence
                            ).toFixed(1)}%`}
                            subtitle="Highest Detection"
                            trend="Live"
                        />

                        <KPICard
                            title="High Severity"
                            value={Number(data.summary?.high_severity ?? 0)}
                            subtitle="Critical Quality Attention"
                            trend="Live"
                        />

                    </div>


                    {/* =====================================================
                        DEFECT TYPE DISTRIBUTION
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Defect Type Distribution</h2>

                        <p className="panel-description">
                            Number of detected defects by defect type.
                        </p>

                        <div style={{ width: "100%", height: 380 }}>

                            <ResponsiveContainer>

                                <BarChart
                                    data={data.defect_distribution}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 10,
                                        bottom: 70
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="defect_type"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                    />

                                    <Tooltip />

                                    <Bar
                                        dataKey="defect_count"
                                        name="Defects"
                                        fill="#38bdf8"
                                        radius={[5, 5, 0, 0]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        DEFECT SEVERITY
                    ===================================================== */}

                    <div className="analytics-grid">

                        <div className="panel analytics-panel">

                            <h2>Defect Severity</h2>

                            <p className="panel-description">
                                Distribution of detected defects by severity.
                            </p>

                            <div
                                style={{
                                    width: "100%",
                                    height: 350
                                }}
                            >

                                <ResponsiveContainer>

                                    <PieChart>

                                        <Pie
                                            data={
                                                data.severity_distribution
                                            }
                                            dataKey="defect_count"
                                            nameKey="severity"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={110}
                                            label
                                        >

                                            {data.severity_distribution.map(
                                                (item) => (

                                                    <Cell
                                                        key={item.severity}
                                                        fill={
                                                            item.severity ===
                                                            "High"
                                                                ? "#f87171"
                                                                : item.severity ===
                                                                  "Medium"
                                                                ? "#f59e0b"
                                                                : "#4ade80"
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>

                                        <Tooltip />

                                        <Legend />

                                    </PieChart>

                                </ResponsiveContainer>

                            </div>

                        </div>


                        {/* =================================================
                            CONFIDENCE DISTRIBUTION
                        ================================================= */}

                        <div className="panel analytics-panel">

                            <h2>Confidence Distribution</h2>

                            <p className="panel-description">
                                Number of detections within each confidence
                                range.
                            </p>

                            <div
                                style={{
                                    width: "100%",
                                    height: 350
                                }}
                            >

                                <ResponsiveContainer>

                                    <BarChart
                                        data={
                                            data.confidence_distribution
                                        }
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis
                                            dataKey="range"
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                        />

                                        <Tooltip />

                                        <Bar
                                            dataKey="defect_count"
                                            name="Detections"
                                            fill="#a78bfa"
                                            radius={[
                                                5,
                                                5,
                                                0,
                                                0
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            </div>

                        </div>

                    </div>


                    {/* =====================================================
                        DETECTION CONFIDENCE BY DEFECT TYPE
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Detection Confidence by Defect Type</h2>

                        <p className="panel-description">
                            Average and maximum AI confidence for each
                            detected defect type.
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 380
                            }}
                        >

                            <ResponsiveContainer>

                                <BarChart
                                    data={data.confidence_by_type}
                                    margin={{
                                        bottom: 70
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="defect_type"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                    />

                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(value) =>
                                            `${value}%`
                                        }
                                    />

                                    <Tooltip
                                        formatter={(value) =>
                                            `${Number(value).toFixed(
                                                2
                                            )}%`
                                        }
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="average_confidence"
                                        name="Average Confidence"
                                        fill="#38bdf8"
                                    />

                                    <Bar
                                        dataKey="maximum_confidence"
                                        name="Maximum Confidence"
                                        fill="#a78bfa"
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        DEFECT SIZE
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Defect Size Analysis</h2>

                        <p className="panel-description">
                            Defect size is calculated from the actual
                            bounding-box dimensions:
                            <strong>
                                {" "}width × height
                            </strong>.
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 380
                            }}
                        >

                            <ResponsiveContainer>

                                <BarChart
                                    data={data.defect_size}
                                    margin={{
                                        bottom: 70
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="defect_type"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                    />

                                    <YAxis />

                                    <Tooltip
                                        formatter={(value) =>
                                            Number(value).toLocaleString()
                                        }
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="average_size"
                                        name="Average Size"
                                        fill="#22d3ee"
                                    />

                                    <Bar
                                        dataKey="maximum_size"
                                        name="Maximum Size"
                                        fill="#f59e0b"
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        DEFECT LOCATION
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Defect Location</h2>

                        <p className="panel-description">
                            Spatial distribution of defects using the actual
                            bounding-box X and Y coordinates.
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 420
                            }}
                        >

                            <ResponsiveContainer>

                                <ScatterChart>

                                    <CartesianGrid />

                                    <XAxis
                                        type="number"
                                        dataKey="bbox_x"
                                        name="X Position"
                                    />

                                    <YAxis
                                        type="number"
                                        dataKey="bbox_y"
                                        name="Y Position"
                                    />

                                    <Tooltip
                                        cursor={{
                                            strokeDasharray: "3 3"
                                        }}
                                        formatter={(value, name) => [
                                            value,
                                            name
                                        ]}
                                    />

                                    <Legend />

                                    <Scatter
                                        name="Defect Location"
                                        data={
                                            data.defect_location
                                        }
                                        fill="#f87171"
                                    />

                                </ScatterChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        PRODUCTION LINE QUALITY
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Production Line Quality</h2>

                        <p className="panel-description">
                            Inspection pass rate for each production line.
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 380
                            }}
                        >

                            <ResponsiveContainer>

                                <BarChart
                                    data={
                                        data.production_line_quality
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="production_line"
                                    />

                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(value) =>
                                            `${value}%`
                                        }
                                    />

                                    <Tooltip
                                        formatter={(value) =>
                                            `${Number(value).toFixed(
                                                1
                                            )}%`
                                        }
                                    />

                                    <Bar
                                        dataKey="pass_rate"
                                        name="Pass Rate"
                                        fill="#4ade80"
                                        radius={[
                                            5,
                                            5,
                                            0,
                                            0
                                        ]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        DEFECTS PER PRODUCT
                    ===================================================== */}

                    <div className="panel analytics-panel">

                        <h2>Defects per Product</h2>

                        <p className="panel-description">
                            Number of detected defects associated with each
                            product.
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 420
                            }}
                        >

                            <ResponsiveContainer>

                                <BarChart
                                    data={
                                        data.defects_per_product
                                    }
                                    layout="vertical"
                                    margin={{
                                        left: 80,
                                        right: 30
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        type="number"
                                        allowDecimals={false}
                                    />

                                    <YAxis
                                        type="category"
                                        dataKey="product_code"
                                        width={100}
                                    />

                                    <Tooltip />

                                    <Bar
                                        dataKey="defect_count"
                                        name="Defects"
                                        fill="#f87171"
                                        radius={[
                                            0,
                                            5,
                                            5,
                                            0
                                        ]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* =====================================================
                        HIGHEST DEFECT PRODUCT
                    ===================================================== */}

                    <div className="panel maximum-defect-panel">

                        <h2>Highest Defect Product</h2>

                        <div className="maximum-defect-content">

                            {data.highest_defect_product ? (

                                <>
                                    <div className="maximum-defect-number">
                                        {
                                            data
                                                .highest_defect_product
                                                .defect_count
                                        }
                                    </div>

                                    <div className="maximum-defect-label">
                                        DEFECTS
                                    </div>

                                    <div className="maximum-defect-product">

                                        <strong>
                                            {
                                                data
                                                    .highest_defect_product
                                                    .product_code
                                            }
                                        </strong>

                                        <span>
                                            {
                                                data
                                                    .highest_defect_product
                                                    .product_name
                                            }
                                        </span>

                                    </div>
                                </>

                            ) : (

                                <div className="maximum-defect-label">
                                    No defect data available
                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default QualityAnalytics;