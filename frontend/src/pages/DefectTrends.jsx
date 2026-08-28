import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";

import SupervisorHeader from "../components/SupervisorHeader";

import api from "../services/api";

import {

    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,

    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,

    BarChart,
    Bar

} from "recharts";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";

const COLORS = [

    "#00C49F",
    "#FF4D4F",
    "#0088FE",
    "#FFBB28",
    "#AA66CC"

];

function DefectTrends(){

    const [data,setData]=useState({

        defect_types:[],

        trend:[],

        production_lines:[]

    });

    useEffect(()=>{

        api.get("/supervisor/defect-trends")

        .then((response)=>{

            setData(response.data);

        })

        .catch(console.error);

    },[]);

    return(

        <div className="dashboard-container">

            <SupervisorSidebar/>

            <div className="dashboard-main">

                <SupervisorHeader/>

                {/* Pie Chart */}

                <div className="panel">

                    <h2>Defect Distribution</h2>

                    <div style={{height:"350px"}}>

                        <ResponsiveContainer width="100%" height="100%">

                            <PieChart>

                                <Pie

                                    data={data.defect_types}

                                    dataKey="value"

                                    nameKey="defect_type"

                                    outerRadius={120}

                                    label

                                >

                                    {

                                        data.defect_types.map((item,index)=>(

                                            <Cell

                                                key={index}

                                                fill={

                                                    item.defect_type==="No Data"

                                                    ?

                                                    "#FF4D4F"

                                                    :

                                                    COLORS[index%COLORS.length]

                                                }

                                            />

                                        ))

                                    }

                                </Pie>

                                <Tooltip/>

                                <Legend/>

                            </PieChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                {/* Daily Trend */}

                <div className="panel">

                    <h2>Daily Defect Trend</h2>

                    <div style={{height:"350px"}}>

                        <ResponsiveContainer width="100%" height="100%">

                            <LineChart data={data.trend}>

                                <CartesianGrid strokeDasharray="3 3"/>

                                <XAxis dataKey="day"/>

                                <YAxis/>

                                <Tooltip/>

                                <Line

                                    type="monotone"

                                    dataKey="defects"

                                    stroke="#00C49F"

                                    strokeWidth={3}

                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                {/* Production Lines */}

                <div className="panel">

                    <h2>Production Line Defects</h2>

                    <div style={{height:"350px"}}>

                        <ResponsiveContainer width="100%" height="100%">

                            <BarChart data={data.production_lines}>

                                <CartesianGrid strokeDasharray="3 3"/>

                                <XAxis dataKey="production_line"/>

                                <YAxis/>

                                <Tooltip/>

                                <Bar

                                    dataKey="defects"

                                    fill="#FF4D4F"

                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default DefectTrends;