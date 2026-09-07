import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";

import api from "../services/api";
import "../styles/InspectionHistory.css";
import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Components.css";

function InspectionHistoryPage() {

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        api.get("/inspection-history")
            .then((response) => {

                setHistory(response.data);

            })
            .catch((error) => {

                console.error(error);

            })
            .finally(() => {

                setLoading(false);

            });

    }, []);

    return (

        <div className="dashboard-container">

            <Sidebar />

            <div className="dashboard-main">

                <DashboardHeader />

                <div className="panel">

                    <h2>

                        Inspection History

                    </h2>

                    {

                        loading ?

                            <p>Loading history...</p>

                            :

                            history.length === 0 ?

                                <p>No inspection history available.</p>

                                :

                                <table>

                                    <thead>

                                        <tr>

                                            <th>Product Code</th>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Production Line</th>
                                            <th>Batch Number</th>
                                            <th>Status</th>
                                            <th>Result</th>
                                            <th>Confidence</th>
                                            <th>Date</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {

                                            history.map((item) => (

                                                <tr key={item.id}>

                                                    <td className="product-info">
    {item.product_code}
</td>

<td className="product-info">
    {item.product_name}
</td>

<td className="product-info">
    {item.category}
</td>

<td className="product-info">
    {item.production_line}
</td>

<td className="product-info">
    {item.batch_number}
</td>

<td className="inspection-status">
    {item.inspection_status}
</td>

<td>
    <span
        className={
            item.pass_fail === "PASS"
                ? "status-pass"
                : "status-fail"
        }
    >
        {item.pass_fail}
    </span>
</td>

                                                    

                                                    <td>

                                                        {

                                                            item.confidence_score ?

                                                                `${item.confidence_score}%`

                                                                :

                                                                "-"

                                                        }

                                                    </td>

                                                    <td>

                                                        {

                                                            item.inspection_date ?

                                                                new Date(item.inspection_date).toLocaleString()

                                                                :

                                                                "-"

                                                        }

                                                    </td>

                                                </tr>

                                            ))

                                        }

                                    </tbody>

                                </table>

                    }

                </div>

            </div>

        </div>

    );

}

export default InspectionHistoryPage;