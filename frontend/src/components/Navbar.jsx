import { useEffect, useRef, useState } from "react";

import {
    Bell,
    ChevronDown,
    LogOut,
    Search,
    User,
    Settings,
    ShieldCheck,
    Activity,
    X,
} from "lucide-react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import "../styles/Navbar.css";

import {
    getUser,
    getRole,
    clearAuth,
} from "../utils/auth";


function Navbar({ title }) {

    const location = useLocation();
    const navigate = useNavigate();

    const searchRef = useRef(null);
    const profileRef = useRef(null);
    const notificationRef = useRef(null);


    /* ============================================================
       STATE
    ============================================================ */

    const [searchQuery, setSearchQuery] =
        useState("");

    const [showResults, setShowResults] =
        useState(false);

    const [showProfileMenu, setShowProfileMenu] =
        useState(false);

    const [showNotifications, setShowNotifications] =
        useState(false);


    /* ============================================================
       CURRENT USER
    ============================================================ */

    const user = getUser();


    /* ============================================================
       CURRENT ROLE
    ============================================================ */

    const role = getRole();

    const isSupervisor =
        role === "factory_supervisor";


    /* ============================================================
       USER DISPLAY
    ============================================================ */

    const displayName =
        user?.name ||
        (
            isSupervisor
                ? "Factory Supervisor"
                : "Quality Engineer"
        );


    const displayRole =
        isSupervisor
            ? "Factory Supervisor"
            : "Quality Engineer";


    /* ============================================================
       PAGE TITLES
    ============================================================ */

    const pageTitles = {

        "/quality-engineer/dashboard":
            "Dashboard",

        "/upload":
            "New Inspection",

        "/inspection-results":
            "Inspection Results",

        "/defect-details":
            "Defect Details",

        "/quality-reports":
            "Quality Reports",

        "/inspection-history":
            "Inspection History",

        "/profile":
            "Profile",

        "/factory-supervisor/dashboard":
            "Dashboard",

        "/factory-supervisor/production-overview":
            "Production Overview",

        "/factory-supervisor/inspection-reports":
            "Inspection Reports",

        "/factory-supervisor/defect-trends":
            "Defect Trends",

        "/factory-supervisor/quality-analytics":
            "Quality Analytics",

        "/factory-supervisor/production-monitoring":
            "Production Monitoring",

        "/factory-supervisor/user-management":
            "User Management",

    };


    const pageTitle =
        title ||
        pageTitles[
            location.pathname
        ] ||
        "Dashboard";


    /* ============================================================
       QUALITY ENGINEER SEARCH DATA
    ============================================================ */

    const qualityEngineerPages = [

        {
            name: "Dashboard",
            path:
                "/quality-engineer/dashboard",
            keywords:
                "dashboard home overview",
        },

        {
            name: "New Inspection",
            path: "/upload",
            keywords:
                "upload image camera inspection inspect",
        },

        {
            name: "Inspection Results",
            path:
                "/inspection-results",
            keywords:
                "results prediction ai confidence inspection",
        },

        {
            name: "Defect Details",
            path:
                "/defect-details",
            keywords:
                "defect severity risk details anomaly",
        },

        {
            name: "Quality Reports",
            path:
                "/quality-reports",
            keywords:
                "reports pdf quality report export",
        },

        {
            name: "Inspection History",
            path:
                "/inspection-history",
            keywords:
                "history previous inspections records search",
        },

        {
            name: "Profile",
            path: "/profile",
            keywords:
                "profile account settings password",
        },

    ];


    /* ============================================================
       SUPERVISOR SEARCH DATA
    ============================================================ */

    const supervisorPages = [

        {
            name: "Dashboard",
            path:
                "/factory-supervisor/dashboard",
            keywords:
                "dashboard home overview kpi",
        },

        {
            name: "Production Overview",
            path:
                "/factory-supervisor/production-overview",
            keywords:
                "production overview manufacturing output",
        },

        {
            name: "Inspection Reports",
            path:
                "/factory-supervisor/inspection-reports",
            keywords:
                "inspection reports quality reports",
        },

        {
            name: "Defect Trends",
            path:
                "/factory-supervisor/defect-trends",
            keywords:
                "defect trends defects analytics",
        },

        {
            name: "Quality Analytics",
            path:
                "/factory-supervisor/quality-analytics",
            keywords:
                "quality analytics pass fail performance",
        },

        {
            name: "Production Monitoring",
            path:
                "/factory-supervisor/production-monitoring",
            keywords:
                "production monitoring factory live",
        },

        {
            name: "User Management",
            path:
                "/factory-supervisor/user-management",
            keywords:
                "users management employees accounts roles",
        },

        {
            name: "Profile",
            path: "/profile",
            keywords:
                "profile account settings password",
        },

    ];


    /* ============================================================
       SEARCH QUERY
    ============================================================ */

    const query =
        searchQuery
            .trim()
            .toLowerCase();


    /* ============================================================
       SEARCH RESULTS
       
       IMPORTANT:
       No useMemo here.
       This avoids the exhaustive-deps warning because
       the page arrays are recreated inside the component.
    ============================================================ */

    const searchResults =
        query
            ? (
                isSupervisor
                    ? supervisorPages
                    : qualityEngineerPages
            ).filter(
                (page) => {

                    const text =
                        `${page.name} ${page.keywords}`
                            .toLowerCase();

                    return text.includes(
                        query
                    );
                }
            )
            : [];


    /* ============================================================
       OPEN SEARCH RESULT
    ============================================================ */

    const openSearchResult =
        (path) => {

            setSearchQuery("");

            setShowResults(false);

            navigate(path);
        };


    /* ============================================================
       CLICK OUTSIDE
    ============================================================ */

    useEffect(() => {

        const handleClickOutside =
            (event) => {

                if (
                    searchRef.current &&
                    !searchRef.current.contains(
                        event.target
                    )
                ) {

                    setShowResults(
                        false
                    );

                }


                if (
                    profileRef.current &&
                    !profileRef.current.contains(
                        event.target
                    )
                ) {

                    setShowProfileMenu(
                        false
                    );

                }


                if (
                    notificationRef.current &&
                    !notificationRef.current.contains(
                        event.target
                    )
                ) {

                    setShowNotifications(
                        false
                    );

                }

            };


        document.addEventListener(
            "mousedown",
            handleClickOutside
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

        };

    }, []);


    /* ============================================================
       LOGOUT
    ============================================================ */

    const handleLogout = () => {

        clearAuth();

        setShowProfileMenu(
            false
        );

        setShowNotifications(
            false
        );

        navigate(
            "/login",
            {
                replace: true,
            }
        );

    };


    /* ============================================================
       PROFILE
    ============================================================ */

    const handleProfile = () => {

        setShowProfileMenu(
            false
        );

        navigate(
            "/profile"
        );

    };


    /* ============================================================
       DASHBOARD
    ============================================================ */

    const handleDashboard = () => {

        setShowProfileMenu(
            false
        );

        navigate(
            isSupervisor
                ? "/factory-supervisor/dashboard"
                : "/quality-engineer/dashboard"
        );

    };


    /* ============================================================
       RENDER
    ============================================================ */

    return (

        <header className="navbar">


            {/* ====================================================
                PAGE INFORMATION
            ==================================================== */}

            <div className="navbar-page-info">

                <span className="navbar-role">

                    <span className="navbar-role-dot" />

                    {isSupervisor
                        ? "FACTORY SUPERVISOR"
                        : "QUALITY ENGINEER"}

                </span>


                <h2>
                    {pageTitle}
                </h2>

            </div>


            {/* ====================================================
                RIGHT SIDE
            ==================================================== */}

            <div className="navbar-right">


                {/* =================================================
                    SEARCH
                ================================================= */}

                <div
                    className="navbar-search"
                    ref={searchRef}
                >

                    <Search
                        size={17}
                        className="navbar-search-icon"
                    />


                    <input
                        type="text"
                        value={
                            searchQuery
                        }

                        placeholder={
                            "Search workspace..."
                        }

                        aria-label="Search workspace"

                        onFocus={() => {

                            if (
                                searchQuery.trim()
                            ) {

                                setShowResults(
                                    true
                                );

                            }

                        }}

                        onChange={(e) => {

                            setSearchQuery(
                                e.target.value
                            );

                            setShowResults(
                                true
                            );

                        }}

                        onKeyDown={(e) => {

                            if (
                                e.key === "Enter" &&
                                searchResults.length
                            ) {

                                openSearchResult(
                                    searchResults[0].path
                                );

                            }


                            if (
                                e.key === "Escape"
                            ) {

                                setSearchQuery("");

                                setShowResults(
                                    false
                                );

                            }

                        }}

                    />


                    {searchQuery && (

                        <button
                            type="button"
                            className="navbar-search-clear"

                            aria-label="Clear search"

                            onClick={() => {

                                setSearchQuery("");

                                setShowResults(
                                    false
                                );

                            }}

                        >

                            <X
                                size={14}
                            />

                        </button>

                    )}


                    {showResults &&
                        query && (

                            <div
                                className="navbar-search-results"
                            >

                                {searchResults.length >
                                0 ? (

                                    <>

                                        <div
                                            className="navbar-search-heading"
                                        >

                                            <span>
                                                QUICK NAVIGATION
                                            </span>

                                        </div>


                                        {searchResults.map(
                                            (page) => (

                                                <button
                                                    key={
                                                        page.path
                                                    }

                                                    type="button"

                                                    className="navbar-search-result"

                                                    onMouseDown={() =>
                                                        openSearchResult(
                                                            page.path
                                                        )
                                                    }

                                                >

                                                    <Search
                                                        size={14}
                                                    />


                                                    <span>
                                                        {
                                                            page.name
                                                        }
                                                    </span>


                                                    <span
                                                        className="search-result-arrow"
                                                    >
                                                        →
                                                    </span>

                                                </button>

                                            )
                                        )}

                                    </>

                                ) : (

                                    <div
                                        className="navbar-search-empty"
                                    >

                                        <Search
                                            size={16}
                                        />


                                        <span>
                                            No matching page
                                        </span>

                                    </div>

                                )}

                            </div>

                        )}

                </div>


                {/* =================================================
                    AI SYSTEM STATUS
                ================================================= */}

                <div
                    className="navbar-system-status"

                    title={
                        "VisionInspect AI system operational"
                    }
                >

                    <span
                        className="navbar-system-dot"
                    />

                    <span>
                        AI ONLINE
                    </span>

                </div>


                {/* =================================================
                    NOTIFICATIONS
                ================================================= */}

                <div
                    className="navbar-dropdown-wrapper"
                    ref={notificationRef}
                >

                    <button
                        type="button"

                        className={
                            `navbar-icon-button ${
                                showNotifications
                                    ? "active"
                                    : ""
                            }`
                        }

                        aria-label="Notifications"

                        aria-expanded={
                            showNotifications
                        }

                        onClick={() => {

                            setShowNotifications(
                                !showNotifications
                            );

                            setShowProfileMenu(
                                false
                            );

                        }}

                    >

                        <Bell
                            size={18}
                        />


                        <span
                            className="navbar-notification-dot"
                        />

                    </button>


                    {showNotifications && (

                        <div
                            className="navbar-dropdown navbar-notifications"
                        >

                            <div
                                className="navbar-dropdown-header"
                            >

                                <div>

                                    <strong>
                                        Notifications
                                    </strong>

                                    <span>
                                        System activity
                                    </span>

                                </div>

                            </div>


                            <div
                                className="navbar-notification-item"
                            >

                                <div
                                    className="notification-icon success"
                                >

                                    <Activity
                                        size={15}
                                    />

                                </div>


                                <div>

                                    <strong>
                                        AI system operational
                                    </strong>

                                    <span>
                                        VisionInspect is ready for inspections.
                                    </span>

                                    <small>
                                        Just now
                                    </small>

                                </div>

                            </div>


                            <div
                                className="navbar-notification-item"
                            >

                                <div
                                    className="notification-icon"
                                >

                                    <ShieldCheck
                                        size={15}
                                    />

                                </div>


                                <div>

                                    <strong>
                                        Secure workspace
                                    </strong>

                                    <span>
                                        Your authenticated session is active.
                                    </span>

                                    <small>
                                        Current session
                                    </small>

                                </div>

                            </div>

                        </div>

                    )}

                </div>


                {/* =================================================
                    PROFILE MENU
                ================================================= */}

                <div
                    className="navbar-dropdown-wrapper"
                    ref={profileRef}
                >

                    <button
                        type="button"

                        className={
                            `navbar-profile ${
                                showProfileMenu
                                    ? "active"
                                    : ""
                            }`
                        }

                        aria-label="Open profile menu"

                        aria-expanded={
                            showProfileMenu
                        }

                        onClick={() => {

                            setShowProfileMenu(
                                !showProfileMenu
                            );

                            setShowNotifications(
                                false
                            );

                        }}

                    >

                        <div
                            className="navbar-profile-icon"
                        >

                            <User
                                size={16}
                            />

                        </div>


                        <div
                            className="navbar-profile-text"
                        >

                            <strong>
                                {displayName}
                            </strong>

                            <span>
                                {displayRole}
                            </span>

                        </div>


                        <ChevronDown
                            size={14}

                            className={
                                showProfileMenu
                                    ? "navbar-chevron-open"
                                    : ""
                            }

                        />

                    </button>


                    {showProfileMenu && (

                        <div
                            className="navbar-dropdown navbar-profile-menu"
                        >


                            <div
                                className="navbar-profile-menu-header"
                            >

                                <div
                                    className="navbar-profile-large-icon"
                                >

                                    <User
                                        size={20}
                                    />

                                </div>


                                <div>

                                    <strong>
                                        {displayName}
                                    </strong>

                                    <span>
                                        {user?.email ||
                                            "Authenticated user"}
                                    </span>

                                </div>

                            </div>


                            <div
                                className="navbar-profile-menu-role"
                            >

                                <ShieldCheck
                                    size={15}
                                />

                                <span>
                                    {displayRole}
                                </span>

                                <span
                                    className="role-active"
                                >
                                    ACTIVE
                                </span>

                            </div>


                            <button
                                type="button"

                                className="navbar-menu-item"

                                onClick={
                                    handleDashboard
                                }

                            >

                                <Activity
                                    size={16}
                                />

                                <span>
                                    Dashboard
                                </span>

                            </button>


                            <button
                                type="button"

                                className="navbar-menu-item"

                                onClick={
                                    handleProfile
                                }

                            >

                                <Settings
                                    size={16}
                                />

                                <span>
                                    Profile & Settings
                                </span>

                            </button>


                            <div
                                className="navbar-menu-divider"
                            />


                            <button
                                type="button"

                                className="navbar-menu-item logout"

                                onClick={
                                    handleLogout
                                }

                            >

                                <LogOut
                                    size={16}
                                />

                                <span>
                                    Sign Out
                                </span>

                            </button>

                        </div>

                    )}

                </div>


                {/* =================================================
                    QUICK LOGOUT
                ================================================= */}

                <button
                    type="button"

                    className="navbar-logout"

                    onClick={
                        handleLogout
                    }

                    title="Sign out"

                    aria-label="Sign out"

                >

                    <LogOut
                        size={17}
                    />

                </button>

            </div>

        </header>

    );

}


export default Navbar;