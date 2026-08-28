import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import KPICard from "../components/KPICard";
import DefectAnalytics from "../components/DefectAnalytics";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";


function Dashboard() {

    const [dashboardData, setDashboardData] = useState({
        total_products: 0,
        defects_detected: 0,
        quality_score: 0,
        ai_confidence: 0
    });

    const [history, setHistory] = useState([]);

    const [loadingHistory, setLoadingHistory] = useState(true);


    /* ============================================================
       LOAD DASHBOARD DATA
    ============================================================ */

    useEffect(() => {

        let isMounted = true;


        const loadDashboard = async () => {

            try {

                const response =
                    await api.get("/dashboard");


                if (isMounted) {

                    setDashboardData(
                        response.data
                    );

                }

            }

            catch (error) {

                console.error(
                    "Dashboard Error:",
                    error
                );

            }

        };


        void loadDashboard();


        return () => {

            isMounted = false;

        };

    }, []);


    /* ============================================================
       LOAD RECENT INSPECTION HISTORY
    ============================================================ */

    useEffect(() => {

        let isMounted = true;


        const loadInspectionHistory = async () => {

            try {

                const response =
                    await api.get(
                        "/inspection-history"
                    );


                if (isMounted) {

                    /*
                     * API already returns the
                     * inspection records ordered
                     * by inspection_date DESC.
                     *
                     * Only the latest 5 records
                     * are displayed on Dashboard.
                     */

                    const recentRecords =
                        Array.isArray(response.data)
                            ? response.data.slice(0, 5)
                            : [];


                    setHistory(
                        recentRecords
                    );

                }

            }

            catch (error) {

                console.error(
                    "Inspection History Error:",
                    error
                );


                if (isMounted) {

                    setHistory([]);

                }

            }

            finally {

                if (isMounted) {

                    setLoadingHistory(false);

                }

            }

        };


        void loadInspectionHistory();


        return () => {

            isMounted = false;

        };

    }, []);


    return (

        <div className="dashboard-container">


            {/* ====================================================
                SIDEBAR
            ==================================================== */}

            <Sidebar />


            <div className="dashboard-main">


                {/* =================================================
                    HEADER
                ================================================= */}

                <DashboardHeader />


                {/* =================================================
                    KPI CARDS
                ================================================= */}

                <div className="kpi-container">


                    <KPICard

                        title="Total Products Inspected"

                        value={
                            dashboardData.total_products
                        }

                        subtitle="Products"

                        trend="Live"

                    />


                    <KPICard

                        title="Defects Detected"

                        value={
                            dashboardData.defects_detected
                        }

                        subtitle="Detected"

                        trend="Live"

                    />


                    <KPICard

                        title="Quality Score"

                        value={
                            `${dashboardData.quality_score}%`
                        }

                        subtitle="Inspection Accuracy"

                        trend="Live"

                    />


                    <KPICard

                        title="AI Confidence"

                        value={
                            `${dashboardData.ai_confidence}%`
                        }

                        subtitle="Average Confidence"

                        trend="Live"

                    />

                </div>


                {/* =================================================
                    ANALYTICS SECTION
                ================================================= */}

                <div className="dashboard-grid">


                    <DefectAnalytics />


                </div>


                {/* =================================================
                    RECENT INSPECTION HISTORY
                ================================================= */}

                <div className="panel">


                    <h2>
                        Recent Inspection History
                    </h2>


                    {

                        loadingHistory ? (

                            <p>
                                Loading inspection history...
                            </p>

                        )

                        :

                        history.length === 0 ? (

                            <p>
                                No inspection history available.
                            </p>

                        )

                        :

                        (

                            <div
                                style={{
                                    overflowX: "auto"
                                }}
                            >

                                <table>


                                    <thead>

                                        <tr>

                                            <th>
                                                Product Code
                                            </th>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Confidence
                                            </th>

                                            <th>
                                                Date
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>


                                        {

                                            history.map(
                                                (item) => {

                                                    const status =
                                                        String(
                                                            item.inspection_status ??
                                                            item.pass_fail ??
                                                            ""
                                                        ).toUpperCase();


                                                    return (

                                                        <tr
                                                            key={
                                                                item.id
                                                            }
                                                        >


                                                            {/* PRODUCT CODE */}

                                                            <td>

                                                                {
                                                                    item.product_code ||
                                                                    "-"
                                                                }

                                                            </td>


                                                            {/* PRODUCT NAME */}

                                                            <td>

                                                                {
                                                                    item.product_name ||
                                                                    "-"
                                                                }

                                                            </td>


                                                            {/* PASS / FAIL */}

                                                            <td

                                                                className={
                                                                    status === "PASS"
                                                                        ? "pass"
                                                                        : status === "FAIL"
                                                                            ? "fail"
                                                                            : ""
                                                                }

                                                            >

                                                                {
                                                                    status ||
                                                                    "-"
                                                                }

                                                            </td>


                                                            {/* CONFIDENCE */}

                                                            <td>

                                                                {

                                                                    item.confidence_score !== null &&
                                                                    item.confidence_score !== undefined

                                                                        ? `${Number(
                                                                            item.confidence_score
                                                                        ).toFixed(2)}%`

                                                                        : "-"

                                                                }

                                                            </td>


                                                            {/* DATE */}

                                                            <td>

                                                                {

                                                                    item.inspection_date

                                                                        ? new Date(
                                                                            item.inspection_date
                                                                        ).toLocaleString()

                                                                        : "-"

                                                                }

                                                            </td>


                                                        </tr>

                                                    );

                                                }

                                            )

                                        }


                                    </tbody>


                                </table>

                            </div>

                        )

                    }


                </div>


            </div>

        </div>

    );

}


export default Dashboard;