import {
    LayoutDashboard,
    Search,
    Upload,
    BarChart3,
    ClipboardList,
    FileText,
    Settings,
    LogOut,
    Cpu
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import "../styles/Sidebar.css";

function Sidebar() {

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

                Quality Engineer

            </p>

            <div className="menu">

                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink
                    to="/inspection-results"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <Search />
                    <span>Product Inspection Results</span>
                </NavLink>

                <NavLink
                    to="/upload-product"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <Upload />
                    <span>Upload Product Image</span>
                </NavLink>

                <NavLink
                    to="/defect-analytics"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <BarChart3 />
                    <span>Defect Analytics</span>
                </NavLink>

                <NavLink
                    to="/inspection-history"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <ClipboardList />
                    <span>Inspection History</span>
                </NavLink>

                <NavLink
                    to="/quality-reports"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <FileText />
                    <span>Quality Reports</span>
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) => isActive ? "active" : ""}
                >
                    <Settings />
                    <span>Settings</span>
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

export default Sidebar;