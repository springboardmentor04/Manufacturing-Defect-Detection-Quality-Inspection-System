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
        quality_score: 0

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

                    <div className="panel">

                        <h2>

                            Production Overview

                        </h2>

                        <p>

                            Total Products Produced:
                            <b> {dashboardData.total_products}</b>

                        </p>

                        <p>

                            Products Inspected:
                            <b> {dashboardData.total_inspections}</b>

                        </p>

                        <p>

                            Defective Products:
                            <b> {dashboardData.total_defects}</b>

                        </p>

                        <p>

                            Overall Quality Score:
                            <b> {dashboardData.quality_score}%</b>

                        </p>

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

                                <tr>

                                    <td>Line A</td>
                                    <td className="pass">Running</td>
                                    <td>98.7%</td>

                                </tr>

                                <tr>

                                    <td>Line B</td>
                                    <td className="pass">Running</td>
                                    <td>97.9%</td>

                                </tr>

                                <tr>

                                    <td>Line C</td>
                                    <td className="pass">Running</td>
                                    <td>99.1%</td>

                                </tr>

                            </tbody>

                        </table>

                    </div>

                </div>

                <div className="panel">

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

                            <tr>

                                <td colspan="4">

                                    Activity will appear after inspections are performed.

                                </td>

                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default SupervisorDashboard;