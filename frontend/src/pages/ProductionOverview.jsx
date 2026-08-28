import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import KPICard from "../components/KPICard";

import api from "../services/api";

import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";

function ProductionOverview() {

    const [data, setData] = useState({

        total_products: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        production_lines:[],
        latest: []
        

    });

    useEffect(() => {

        api.get("/production-overview")

            .then((response) => {

                setData(response.data);

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
                        value={data.total_products}
                        subtitle="Factory Total"
                        trend="Live"
                    />

                    <KPICard
                        title="Passed Inspection"
                        value={data.passed}
                        subtitle="Approved"
                        trend="Live"
                    />

                    <KPICard
                        title="Failed Inspection"
                        value={data.failed}
                        subtitle="Rejected"
                        trend="Live"
                    />

                    <KPICard
                        title="Pending Inspection"
                        value={data.pending}
                        subtitle="Waiting"
                        trend="Live"
                    />

                </div>
<div className="panel">

    <h2>

        Production Line Summary

    </h2>

    <table>

        <thead>

            <tr>

                <th>Production Line</th>

                <th>Total Products</th>

                <th>Inspected</th>

                <th>Pending</th>

            </tr>

        </thead>

        <tbody>

            {

                data.production_lines.map((line)=>(

                    <tr key={line.production_line}>

                        <td>

                            {line.production_line}

                        </td>

                        <td>

                            {line.total_products}

                        </td>

                        <td>

                            {line.inspected}

                        </td>

                        <td>

                            {line.pending}

                        </td>

                    </tr>

                ))

            }

        </tbody>

    </table>

</div>
                <div className="panel">

                    <h2>

                        Recent Production

                    </h2>

                    <table>

                        <thead>

                            <tr>

                                <th>Product Code</th>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Production Line</th>
                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                data.latest.map((product) => (

                                    <tr key={product.product_code}>

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

                                            {product.production_line}

                                        </td>

                                        <td>

                                            {product.inspection_status}

                                        </td>

                                    </tr>

                                ))

                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default ProductionOverview;