import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import KPICard from "../components/KPICard";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";


function ProductionOverview() {

    const [data, setData] = useState({

    total_production: 0,
    production_lines_count: 0,
    product_categories_count: 0,
    production_batches_count: 0,

    category_summary: [],
    line_summary: [],
    batch_summary: [],
    production_over_time: [],
    products: []

});


    useEffect(() => {

        api.get("/production-overview")

            .then((response) => {

                setData({

    total_production:
        response.data.total_production || 0,

    production_lines_count:
        response.data.production_lines_count || 0,

    product_categories_count:
        response.data.product_categories_count || 0,

    production_batches_count:
        response.data.production_batches_count || 0,

    category_summary:
        response.data.category_summary || [],

    line_summary:
        response.data.line_summary || [],

    batch_summary:
        response.data.batch_summary || [],

    production_over_time:
        response.data.production_over_time || [],

    products:
        response.data.products || []

});

            })

            .catch((error) => {

                console.log(error);

            });

    }, []);


    return (

        <div className="dashboard-container">

            <SupervisorSidebar />

            <div className="dashboard-main">

                <SupervisorHeader />


                {/* =========================================
                    PAGE HEADER
                ========================================= */}

                <div className="settings-header">

                    <div>

                        <h1>
                            Production Overview
                        </h1>

                        <p>
                            Monitor production volume, product distribution,
                            production lines and manufacturing activity
                        </p>

                    </div>

                </div>


                {/* =========================================
                    PRODUCTION KPIs
                ========================================= */}

                <div className="kpi-container">

                    <KPICard
    title="Total Production"
    value={data.total_production}
    subtitle="Units Produced"
    trend="Live"
/>

<KPICard
    title="Production Lines"
    value={data.production_lines_count}
    subtitle="Manufacturing Lines"
    trend="Live"
/>

<KPICard
    title="Product Categories"
    value={data.product_categories_count}
    subtitle="Categories Produced"
    trend="Live"
/>

<KPICard
    title="Production Batches"
    value={data.production_batches_count}
    subtitle="Batches Produced"
    trend="Live"
/>

                </div>


                {/* =========================================
                    PRODUCTION BREAKDOWN
                ========================================= */}

                {/* =========================================
    PRODUCTS BY CATEGORY
========================================= */}

<div className="panel production-chart-panel">

    <h2>
        Products by Category
    </h2>

    <div className="chart-scroll-container">

        <div
            className="chart-scroll-content"
            style={{
                minWidth: `${Math.max(
                    900,
                    data.category_summary.length * 140
                )}px`
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={320}
            >

                <BarChart
                    data={data.category_summary}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 20
                    }}
                >

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.12)"
                    />

                    <XAxis
                        dataKey="category"
                        interval={0}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <Tooltip />

                    <Bar
                        dataKey="count"
                        name="Products"
                        fill="#38bdf8"
                        radius={[5, 5, 0, 0]}
                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    </div>

</div>


{/* =========================================
    PRODUCTS BY PRODUCTION LINE
========================================= */}

<div className="panel production-chart-panel">

    <h2>
        Products by Production Line
    </h2>

    <div className="chart-scroll-container">

        <div
            className="chart-scroll-content"
            style={{
                minWidth: `${Math.max(
                    900,
                    data.line_summary.length * 140
                )}px`
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={320}
            >

                <BarChart
                    data={data.line_summary}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 20
                    }}
                >

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.12)"
                    />

                    <XAxis
                        dataKey="production_line"
                        interval={0}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <Tooltip />

                    <Bar
                        dataKey="count"
                        name="Products"
                        fill="#818cf8"
                        radius={[5, 5, 0, 0]}
                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    </div>

</div>


                {/* =========================================
    PRODUCTION BY BATCH
========================================= */}

<div className="panel production-chart-panel">

    <h2>
        Production by Batch
    </h2>

    <div className="chart-scroll-container">

        <div
            className="chart-scroll-content"
            style={{
                minWidth: `${Math.max(
                    900,
                    data.batch_summary.length * 140
                )}px`
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={320}
            >

                <BarChart
                    data={data.batch_summary}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 20
                    }}
                >

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.12)"
                    />

                    <XAxis
                        dataKey="batch_number"
                        interval={0}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <Tooltip />

                    <Bar
                        dataKey="count"
                        name="Products"
                        fill="#a78bfa"
                        radius={[5, 5, 0, 0]}
                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    </div>

</div>

                {/* =========================================
    PRODUCTION OVER TIME
========================================= */}

<div className="panel production-chart-panel">

    <h2>
        Production Over Time
    </h2>

    <div className="chart-scroll-container">

        <div
            className="chart-scroll-content"
            style={{
                minWidth: `${Math.max(
                    900,
                    data.production_over_time.length * 120
                )}px`
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={320}
            >

                <LineChart
                    data={data.production_over_time}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 10,
                        bottom: 20
                    }}
                >

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.12)"
                    />

                    <XAxis
                        dataKey="production_date"
                        interval={0}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12
                        }}
                    />

                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey="count"
                        name="Products Produced"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        dot={{
                            r: 4
                        }}
                    />

                </LineChart>

            </ResponsiveContainer>

        </div>

    </div>

</div>


                {/* =========================================
                    PRODUCTION LINE SUMMARY
                ========================================= */}

                <div className="panel">

                    <h2>
                        Production by Line
                    </h2>

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Production Line
                                </th>

                                <th>
                                    Products Produced
                                </th>

                                <th>
                                    Production Share
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {data.line_summary.length > 0 ? (

                                data.line_summary.map((line) => {

                                    const percentage =
                                        data.total_products > 0
                                            ? (
                                                Number(line.count) /
                                                data.total_products
                                            ) * 100
                                            : 0;

                                    return (

                                        <tr
                                            key={
                                                line.production_line
                                            }
                                        >

                                            <td>
                                                {line.production_line}
                                            </td>

                                            <td>
                                                {line.count}
                                            </td>

                                            <td>
                                                {percentage.toFixed(1)}%
                                            </td>

                                        </tr>

                                    );

                                })

                            ) : (

                                <tr>

                                    <td colSpan="3">
                                        No production line data available.
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


                {/* =========================================
                    PRODUCT INFORMATION
                ========================================= */}

                <div className="panel">

                    <h2>
                        Product Information
                    </h2>

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Product Code
                                </th>

                                <th>
                                    Product Name
                                </th>

                                <th>
                                    Category
                                </th>

                                <th>
                                    Batch Number
                                </th>

                                <th>
                                    Production Line
                                </th>

                                <th>
                                    Manufacturing Date
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {data.products.length > 0 ? (

                                data.products.map((product) => (

                                    <tr
                                        key={
                                            product.product_code
                                        }
                                    >

                                        <td>
                                            {product.product_code}
                                        </td>

                                        <td>
                                            {product.product_name}
                                        </td>

                                        <td>
                                            {product.category}
                                        </td>

                                        <td>
                                            {product.batch_number}
                                        </td>

                                        <td>
                                            {product.production_line}
                                        </td>

                                        <td>
                                            {product.manufacturing_date
                                                ? new Date(
                                                    product.manufacturing_date
                                                ).toLocaleDateString()
                                                : "-"}
                                        </td>

                                    </tr>

                                ))

                            ) : (

                                <tr>

                                    <td colSpan="6">
                                        No product information available.
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


            </div>

        </div>

    );

}


export default ProductionOverview;