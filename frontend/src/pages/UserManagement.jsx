import { useEffect, useState } from "react";

import SupervisorSidebar from "../components/SupervisorSidebar";
import SupervisorHeader from "../components/SupervisorHeader";
import api from "../services/api";

import {
    Users,
    UserCheck,
    UserX,
    ShieldCheck,
    Search,
    Clock
} from "lucide-react";

import "../styles/Dashboard.css";
import "../styles/Supervisor.css";
import "../styles/UserManagement.css";


function UserManagement() {

    // ============================================================
    // STATE
    // ============================================================

    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");


    // ============================================================
    // LOAD USERS
    // ============================================================

    const loadUsers = async () => {

    try {

        setLoading(true);
        setError("");

        const response = await api.get(
            "/supervisor/user-management"
        );

        console.log(
            "================================="
        );

        console.log(
            "USER MANAGEMENT RESPONSE:",
            response.data
        );

        console.log(
            "USERS:",
            response.data?.users
        );

        console.log(
            "USERS COUNT:",
            response.data?.users?.length
        );

        console.log(
            "================================="
        );

        const userData = Array.isArray(response.data?.users)
            ? response.data.users
            : [];

        setUsers(userData);

    } catch (error) {

        console.error(
            "ERROR LOADING USER MANAGEMENT:",
            error
        );

        console.error(
            "ERROR RESPONSE:",
            error.response?.data
        );

        setError(
            error.response?.data?.detail ||
            "Unable to load user information."
        );

        setUsers([]);

    } finally {

        setLoading(false);

    }
};


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        const timeoutId = setTimeout(() => {
            loadUsers();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, []);


    // ============================================================
    // SEARCH USERS
    // ============================================================

    const filteredUsers = users.filter(
        (user) => {

            const searchText = `
                ${user.first_name || ""}
                ${user.last_name || ""}
                ${user.employee_id || ""}
                ${user.email || ""}
                ${user.phone || ""}
                ${user.department || ""}
                ${user.role_name || ""}
            `.toLowerCase();

            return searchText.includes(
                search.toLowerCase()
            );
        }
    );


    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "Never";
        }

        try {

            return new Date(
                date
            ).toLocaleString();

        } catch {

            return "Invalid date";

        }
    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="dashboard-container">

                <SupervisorSidebar />

                <div className="dashboard-main">

                    <SupervisorHeader />

                    <div className="user-management-loading">

                        <Users size={30} />

                        <p>
                            Loading user information...
                        </p>

                    </div>

                </div>

            </div>
        );
    }


    // ============================================================
    // PAGE
    // ============================================================

    return (

        <div className="dashboard-container">

            <SupervisorSidebar />

            <div className="dashboard-main">

                <SupervisorHeader />


                <div className="dashboard-content">


                    {/* =================================================
                        PAGE HEADER
                    ================================================= */}

                    <div className="page-header">

                        <div>

                            <h1>
                                User Management
                            </h1>

                            <p>
                                View system users, their roles,
                                account status and login information.
                            </p>

                        </div>


                        <div className="supervisor-view-badge">

                            <ShieldCheck size={18} />

                            View Only

                        </div>

                    </div>


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {error && (

                        <div className="user-management-error">

                            {error}

                        </div>

                    )}


                    {/* =================================================
                        SUMMARY CARDS
                    ================================================= */}

                    <div className="user-summary-grid">


                        {/* TOTAL USERS */}

                        <div className="user-summary-card">

                            <div className="user-summary-icon">

                                <Users size={23} />

                            </div>

                            <div>

                                Total Users : <strong>{users.length}</strong>

                            </div>

                        </div>


                        {/* ACTIVE USERS */}

                        <div className="user-summary-card">

                            <div className="user-summary-icon">

                                <UserCheck size={23} />

                            </div>

                            <div>

                                Active Users : <strong>{users.filter(user => user.is_active).length}</strong>

                            </div>

                        </div>


                        {/* INACTIVE USERS */}

                        <div className="user-summary-card">

                            <div className="user-summary-icon">

                                <UserX size={23} />

                            </div>

                            <div>

                                Inactive Users : <strong>{users.filter(user => !user.is_active).length}</strong>

                                

                            </div>

                        </div>


                        {/* ROLES */}

                        <div className="user-summary-card">

                            <div className="user-summary-icon">

                                <ShieldCheck size={23} />

                            </div>

                            <div>

                                Assigned Roles : <strong>{
                                        new Set(
                                            users
                                                .map(
                                                    user =>
                                                        user.role_name
                                                )
                                                .filter(Boolean)
                                        ).size
                                    }</strong>


                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        USER LIST
                    ================================================= */}

                    <div className="panel user-list-panel">


                        <div className="user-list-header">

                            <div>

                                <h2>
                                    User List
                                </h2>

                                <p>
                                    User information currently
                                    available in the system.
                                </p>

                            </div>


                            {/* SEARCH ONLY */}

                            <div className="user-search">

                                <Search size={17} />

                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        {/* =================================================
                            TABLE
                        ================================================= */}

                        <div className="user-table-wrapper">

                            <table className="user-table">

                                <thead>

                                    <tr>

                                        <th>
                                            First Name
                                        </th>

                                        <th>
                                            Last Name
                                        </th>

                                        <th>
                                            Employee ID
                                        </th>

                                        <th>
                                            Email
                                        </th>

                                        <th>
                                            Phone
                                        </th>

                                        <th>
                                            Department
                                        </th>

                                        <th>
                                            Role
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Last Login
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {filteredUsers.length === 0 ? (

                                        <tr>

                                            <td
                                                colSpan="9"
                                                className="no-users"
                                            >

                                                <Users size={30} />

                                                <span>
                                                    No users found.
                                                </span>

                                            </td>

                                        </tr>

                                    ) : (

                                        filteredUsers.map(
                                            (user) => (

                                                <tr
                                                    key={user.id}
                                                >

                                                    {/* FIRST NAME */}

                                                    <td className="user-name-cell">

                                                        {user.first_name || "-"}

                                                    </td>


                                                    {/* LAST NAME */}

                                                    <td className="user-name-cell">

                                                        {user.last_name || "-"}

                                                    </td>


                                                    {/* EMPLOYEE ID */}

                                                    <td>

                                                        {user.employee_id || "-"}

                                                    </td>


                                                    {/* EMAIL */}

                                                    <td className="user-email-cell">

                                                        {user.email || "-"}

                                                    </td>


                                                    {/* PHONE */}

                                                    <td>

                                                        {user.phone || "-"}

                                                    </td>


                                                    {/* DEPARTMENT */}

                                                    <td>

                                                        {user.department || "-"}

                                                    </td>


                                                    {/* ROLE */}

                                                    <td>

                                                        <span className="role-badge">

                                                            {
                                                                user.role_name ||
                                                                "Unassigned"
                                                            }

                                                        </span>

                                                    </td>


                                                    {/* STATUS */}

                                                    <td>

                                                        <span
                                                            className={
                                                                user.is_active
                                                                    ? "user-status active"
                                                                    : "user-status inactive"
                                                            }
                                                        >

                                                            {
                                                                user.is_active
                                                                    ? "Active"
                                                                    : "Inactive"
                                                            }

                                                        </span>

                                                    </td>


                                                    {/* LAST LOGIN */}

                                                    <td className="last-login-cell">

                                                        <Clock
                                                            size={14}
                                                        />

                                                        {formatDate(
                                                            user.last_login
                                                        )}

                                                    </td>

                                                </tr>

                                            )
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                    {/* =================================================
                        ACCESS INFORMATION
                    ================================================= */}

                    <div className="panel user-access-info">

                        <div className="access-info-icon">

                            <ShieldCheck size={24} />

                        </div>

                        <div>

                            <h3>
                                Supervisor Access
                            </h3>

                            <p>
                                This page is view-only for Factory
                                Supervisors. User accounts, roles,
                                passwords and account status cannot
                                be modified from this page.
                            </p>

                        </div>

                    </div>


                </div>

            </div>

        </div>
    );
}
export default UserManagement;