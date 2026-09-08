import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import KPICard from "../components/KPICard";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";

function SupervisorDashboard() {

    const [dashboardData, setDashboardData] = useState({

        total_products: 0,
        total_inspections: 0,
        total_defects: 0,
        quality_score: 0,
        production_monitoring: [],
        recent_activity: [],
        average_processing_time: 0,
        average_confidence_score: 0,

    });

    useEffect(() => {

        api.get("/supervisor/dashboard")

            .then((response) => {

                setDashboardData(response.data);

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

                <div className="kpi-container">

                    <KPICard
                        title="Products Produced"
                        value={dashboardData.total_products}
                        subtitle="Factory Total"
                        trend="Live"
                    />

                    <KPICard
                        title="Products Inspected"
                        value={dashboardData.total_inspections}
                        subtitle="Completed"
                        trend="Live"
                    />

                    <KPICard
                        title="Defective Products"
                        value={dashboardData.total_defects}
                        subtitle="Detected"
                        trend="Live"
                    />

                    <KPICard
                        title="Quality Score"
                        value={`${dashboardData.quality_score}%`}
                        subtitle="Overall"
                        trend="Live"
                    />

                </div>

                <div className="dashboard-grid">

                    <div className="panel ai-model-panel">

    <h2>
        AI Model Performance
    </h2>

    <div className="ai-model-description">

        <div className="ai-model-name">
            ResNet18 + YOLOv8s
        </div>

        <p>
            ResNet18 performs product-level defect classification,
            while YOLOv8s detects and localizes defects within the
            inspected product image.
        </p>

    </div>

    <div className="ai-performance-stats">

        <div className="ai-performance-item">

            <span>
                Average Processing Time
            </span>

            <strong>
                {Number(
                    dashboardData.average_processing_time
                ).toFixed(2)} s
            </strong>

        </div>

        <div className="ai-performance-item">

            <span>
                Average Confidence Score
            </span>

            <strong>
                {Number(
                    dashboardData.average_confidence_score
                ).toFixed(2)}%
            </strong>

        </div>

    </div>

</div>

                    <div className="panel">

    <h2>
        Production Monitoring
    </h2>

    <table>

        <thead>
            <tr>
                <th>Production Line</th>
                <th>Status</th>
                <th>Efficiency</th>
            </tr>
        </thead>

        <tbody>

            {dashboardData.production_monitoring.length > 0 ? (

                dashboardData.production_monitoring.map((line) => (

                    <tr key={line.line_name}>

                        <td>
                            {line.line_name}
                        </td>

                        <td
                            className={
                                line.status === "Running"
                                    ? "pass"
                                    : ""
                            }
                        >
                            {line.status}
                        </td>

                        <td>
                            {line.efficiency.toFixed(1)}%
                        </td>

                    </tr>

                ))

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

                    
                </div>

                <div className="panel recent-factory-panel">

    <h2>
        Recent Factory Activity
    </h2>

    <table>

        <thead>

            <tr>
                <th>Product</th>
                <th>Inspection Result</th>
                <th>Confidence</th>
                <th>Date</th>
            </tr>

        </thead>

        <tbody>

            {dashboardData.recent_activity &&
            dashboardData.recent_activity.length > 0 ? (

                dashboardData.recent_activity.map((activity) => (

                    <tr key={activity.inspection_id}>

                        <td>
                            <strong>
                                {activity.product_code}
                            </strong>
                            <br />
                            <span>
                                {activity.product_name}
                            </span>
                        </td>

                        <td>
                            <span
                                className={
                                    activity.pass_fail === "PASS"
                                        ? "status-pass"
                                        : "status-fail"
                                }
                            >
                                {activity.pass_fail}
                            </span>
                        </td>

                        <td>
                            {activity.confidence_score !== null
                                ? `${Number(
                                      activity.confidence_score
                                  ).toFixed(1)}%`
                                : "-"}
                        </td>

                        <td>
                            {activity.inspection_date
                                ? new Date(
                                      activity.inspection_date
                                  ).toLocaleDateString()
                                : "-"}
                        </td>

                    </tr>

                ))

            ) : (

                <tr>

                    <td colSpan="4">
                        No inspection activity available.
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

export default SupervisorDashboard;