import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import KPICard from "../components/KPICard";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";
import "../styles/DefectAnalytics.css";

function DefectAnalyticsPage() {

    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {

        api.get("/defect-analytics")
            .then((response) => {

                setAnalytics(response.data);

            })
            .catch((error) => {

                console.log(error);

            });

    }, []);


    if (!analytics) {

        return (

            <div className="dashboard-container">

                <Sidebar />

                <div className="dashboard-main">

                    <DashboardHeader />

                    <p>Loading Analytics...</p>

                </div>

            </div>

        );

    }


    const summary = analytics.summary;


    /* ============================================================
       REMOVE DUPLICATE PRODUCTION LINES
       ============================================================ */

    const uniqueProductionLines = [];

    const productionLineMap = new Map();


    (analytics.production || []).forEach((line) => {

        if (!line.production_line) {
            return;
        }


        const productionLine =
            String(line.production_line).trim();


        /*
         * Use the production line name as the unique key.
         * This prevents the same exact production line from
         * appearing multiple times in the UI.
         */

        if (!productionLineMap.has(productionLine)) {

            productionLineMap.set(
                productionLine,
                {
                    ...line,
                    production_line: productionLine
                }
            );

            uniqueProductionLines.push(
                productionLineMap.get(productionLine)
            );

        }

    });


    return (

        <div className="dashboard-container">

            <Sidebar />

            <div className="dashboard-main">

                <DashboardHeader />


                {/* =================================================
                    KPI CARDS
                ================================================= */}

                <div className="kpi-container">

                    <KPICard
                        title="Total Defects"
                        value={summary.total_defects ?? 0}
                        subtitle="Detected"
                        trend="Live"
                    />


                    <KPICard
                        title="Total Inspections"
                        value={summary.total_inspections ?? 0}
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

                </div>


                {/* =================================================
                    ANALYTICS GRID
                ================================================= */}

                <div className="analytics-grid">


                    {/* =================================================
                        DEFECT DISTRIBUTION
                    ================================================= */}

                    <div className="panel">

                        <h2>
                            Defect Distribution
                        </h2>


                        {

                            analytics.defects.length === 0 ?

                                <p>
                                    No defects detected yet.
                                </p>

                                :

                                analytics.defects.map(
                                    (item) => (

                                        <div
                                            key={
                                                item.defect_type
                                            }
                                            className="defect-row"
                                        >

                                            <span>
                                                {
                                                    item.defect_type
                                                }
                                            </span>

                                            <span>
                                                {
                                                    item.count
                                                }
                                            </span>

                                        </div>

                                    )
                                )

                        }

                    </div>


                    {/* =================================================
                        PRODUCTION LINE QUALITY
                    ================================================= */}

                    <div className="panel">

                        <h2>
                            Production Line Quality
                        </h2>


                        {

                            uniqueProductionLines.length === 0 ?

                                <p>
                                    No inspection data available.
                                </p>

                                :

                                uniqueProductionLines.map(
                                    (line) => (

                                        <div
                                            key={
                                                line.production_line
                                            }
                                            className="defect-row"
                                        >

                                            <span>
                                                {
                                                    line.production_line
                                                }
                                            </span>


                                            <span>
                                                {
                                                    Number(
                                                        line.pass_rate
                                                    ).toFixed(1)
                                                }%
                                            </span>

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

export default DefectAnalyticsPage;