import {
    LayoutDashboard,
    Factory,
    ClipboardList,
    TrendingUp,
    BarChart3,
    Activity,
    Users,
    LogOut,
    Cpu
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import "../styles/Sidebar.css";

function SupervisorSidebar() {

    const navigate = useNavigate();

    function handleLogout() {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");

    }

    return (

        <div className="sidebar">

            <div className="logo">

                <Cpu />

                <h2>

                    VisionInspect AI

                </h2>

            </div>

            <p className="role">

                Factory Supervisor

            </p>

            <div className="menu">

                <NavLink
                    to="/supervisor/dashboard"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <LayoutDashboard />

                    <span>Dashboard</span>

                </NavLink>

                <NavLink
                    to="/supervisor/production-overview"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <Factory />

                    <span>Production Overview</span>

                </NavLink>

                <NavLink
                    to="/supervisor/inspection-reports"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <ClipboardList />

                    <span>Inspection Reports</span>

                </NavLink>

                <NavLink
                    to="/supervisor/defect-trends"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <TrendingUp />

                    <span>Defect Trends</span>

                </NavLink>

                <NavLink
                    to="/supervisor/quality-analytics"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <BarChart3 />

                    <span>Quality Analytics</span>

                </NavLink>

                <NavLink
                    to="/supervisor/production-monitoring"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <Activity />

                    <span>Production Monitoring</span>

                </NavLink>

                <NavLink
                    to="/supervisor/user-management"
                    className={({ isActive }) =>
                        isActive ? "active" : ""
                    }
                >

                    <Users />

                    <span>User Management</span>

                </NavLink>

            </div>

            <div
                className="logout"
                onClick={handleLogout}
            >

                <LogOut />

                <span>Logout</span>

            </div>

        </div>

    );

}

export default SupervisorSidebar;