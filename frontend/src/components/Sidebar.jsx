import { useState } from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Upload,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  History,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Factory,
  Users,
  TrendingUp,
  MonitorCheck,
  ChevronRight,
  Activity,
  Sparkles,
} from "lucide-react";

import "../styles/Sidebar.css";

import {
  clearAuth,
  getRole,
  getUser,
} from "../utils/auth";


function Sidebar() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const navigate =
    useNavigate();

  const user =
    getUser();

  const rawRole =
    getRole();

  const role =
    String(rawRole || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const isSupervisor =
    role === "factory_supervisor" ||
    role === "supervisor";

  const workspaceName =
    isSupervisor
      ? "Factory Supervisor"
      : "Quality Engineer";

  const displayName =
    user?.name ||
    "User";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "U";


  const qualityEngineerNavigation = [
    {
      section: "INSPECTION",
      items: [
        {
          label: "Dashboard",
          description: "Quality overview",
          path: "/quality-engineer/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "New Inspection",
          description: "Run AI inspection",
          path: "/upload",
          icon: Upload,
          badge: "AI",
          featured: true,
        },
        {
          label: "Inspection Results",
          description: "Latest AI findings",
          path: "/inspection-results",
          icon: ClipboardCheck,
        },
        {
          label: "Defect Details",
          description: "Analyze detected defects",
          path: "/defect-details",
          icon: AlertTriangle,
        },
      ],
    },
    {
      section: "QUALITY",
      items: [
        {
          label: "Quality Reports",
          description: "Inspection reports",
          path: "/quality-reports",
          icon: FileText,
        },
        {
          label: "Inspection History",
          description: "Review past inspections",
          path: "/inspection-history",
          icon: History,
        },
      ],
    },
    {
      section: "ACCOUNT",
      items: [
        {
          label: "Profile",
          description: "Account settings",
          path: "/profile",
          icon: User,
        },
      ],
    },
  ];


  const supervisorNavigation = [
    {
      section: "OVERVIEW",
      items: [
        {
          label: "Dashboard",
          description: "Factory overview",
          path: "/factory-supervisor/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Production Overview",
          description: "Production performance",
          path: "/factory-supervisor/production-overview",
          icon: Factory,
        },
      ],
    },
    {
      section: "QUALITY INTELLIGENCE",
      items: [
        {
          label: "Inspection Reports",
          description: "Quality reports",
          path: "/factory-supervisor/inspection-reports",
          icon: FileText,
        },
        {
          label: "Defect Trends",
          description: "Defect patterns",
          path: "/factory-supervisor/defect-trends",
          icon: TrendingUp,
        },
        {
          label: "Quality Analytics",
          description: "Quality intelligence",
          path: "/factory-supervisor/quality-analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      section: "OPERATIONS",
      items: [
        {
          label: "Production Monitoring",
          description: "Live operations",
          path: "/factory-supervisor/production-monitoring",
          icon: MonitorCheck,
        },
        {
          label: "User Management",
          description: "Manage team access",
          path: "/factory-supervisor/user-management",
          icon: Users,
        },
      ],
    },
    {
      section: "ACCOUNT",
      items: [
        {
          label: "Profile",
          description: "Account settings",
          path: "/profile",
          icon: User,
        },
      ],
    },
  ];


  const navigation = isSupervisor
    ? supervisorNavigation
    : qualityEngineerNavigation;


  const handleNavigation = () => {
    setMobileOpen(false);
  };


  const handleLogout = () => {
    clearAuth();
    setMobileOpen(false);

    navigate("/login", {
      replace: true,
    });
  };


  const handleBrandClick = () => {
    navigate(
      isSupervisor
        ? "/factory-supervisor/dashboard"
        : "/quality-engineer/dashboard"
    );

    setMobileOpen(false);
  };


  const handleBrandKeyDown = (event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleBrandClick();
    }
  };


  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu size={21} />
      </button>


      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}


      <aside
        className={`sidebar ${
          mobileOpen
            ? "sidebar-open"
            : ""
        }`}
      >
        <div
          className="sidebar-brand"
          onClick={handleBrandClick}
          onKeyDown={handleBrandKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Go to dashboard"
        >
          <div className="sidebar-brand-icon">
            <ShieldCheck size={21} />
            <span className="sidebar-brand-pulse" />
          </div>

          <div className="sidebar-brand-text">
            <h2>VisionInspect</h2>
            <span>AI QUALITY CONTROL</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={(event) => {
              event.stopPropagation();
              setMobileOpen(false);
            }}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>


        <div className="sidebar-role">
          <div className="sidebar-role-icon">
            {isSupervisor ? (
              <Factory size={15} />
            ) : (
              <ClipboardCheck size={15} />
            )}
          </div>

          <div className="sidebar-role-copy">
            <span className="sidebar-role-label">
              WORKSPACE
            </span>

            <strong>
              {workspaceName}
            </strong>
          </div>

          <span
            className="sidebar-role-dot"
            title="Workspace active"
          />
        </div>


        <div className="sidebar-user-mini">
          <div className="sidebar-user-avatar">
            {initials}
          </div>

          <div className="sidebar-user-info">
            <strong>{displayName}</strong>

            <span>
              {user?.email || "Authenticated user"}
            </span>
          </div>

          <Activity
            size={14}
            className="sidebar-user-status"
            aria-label="Active session"
          />
        </div>


        <div className="sidebar-ai-status">
          <div className="sidebar-ai-icon">
            <Sparkles size={13} />
          </div>

          <div>
            <span>AI ENGINE</span>
            <strong>Operational</strong>
          </div>

          <span className="sidebar-ai-live">
            LIVE
          </span>
        </div>


        <nav
          className="sidebar-navigation"
          aria-label="Main navigation"
        >
          {navigation.map((group) => (
            <div
              className="sidebar-group"
              key={group.section}
            >
              <span className="sidebar-section-title">
                {group.section}
              </span>

              <div className="sidebar-links">
                {group.items.map((item) => {
                  const Icon =
                    item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigation}
                      className={({ isActive }) =>
                        `sidebar-link ${
                          isActive
                            ? "active"
                            : ""
                        } ${
                          item.featured
                            ? "featured"
                            : ""
                        }`
                      }
                    >
                      <span className="sidebar-link-icon">
                        <Icon
                          size={17}
                          strokeWidth={1.9}
                        />
                      </span>

                      <span className="sidebar-link-content">
                        <span className="sidebar-link-label">
                          {item.label}
                        </span>

                        <span className="sidebar-link-description">
                          {item.description}
                        </span>
                      </span>

                      {item.badge && (
                        <span
                          className={`sidebar-link-badge ${
                            item.badge === "LIVE"
                              ? "live"
                              : ""
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      <ChevronRight
                        size={13}
                        className="sidebar-link-arrow"
                      />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>


        <div className="sidebar-bottom">
          {!isSupervisor && (
            <button
              type="button"
              className="sidebar-quick-action"
              onClick={() => {
                setMobileOpen(false);
                navigate("/upload");
              }}
            >
              <span className="sidebar-quick-icon">
                <Upload size={14} />
              </span>

              <span className="sidebar-quick-copy">
                <strong>Start Inspection</strong>
                <small>Upload a product image</small>
              </span>

              <ChevronRight size={14} />
            </button>
          )}


          <div className="sidebar-system-status">
            <span className="status-indicator" />

            <div>
              <span>SYSTEM STATUS</span>
              <strong>All systems operational</strong>
            </div>
          </div>


          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />

            <span>Logout</span>

            <ChevronRight
              size={13}
              className="sidebar-logout-arrow"
            />
          </button>
        </div>
      </aside>
    </>
  );
}


export default Sidebar;
