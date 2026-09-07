import { useState } from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Factory,
  FileText,
  TrendingUp,
  BarChart3,
  Activity,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import "../styles/SidebarSupervisor.css";

import { clearAuth } from "../utils/auth";


function SidebarSupervisor() {

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const navigate =
    useNavigate();


  const navigation = [

    {
      section: "OVERVIEW",

      items: [

        {
          label: "Dashboard",
          path:
            "/factory-supervisor/dashboard",
          icon: LayoutDashboard,
        },

        {
          label: "Production Overview",
          path:
            "/factory-supervisor/production-overview",
          icon: Factory,
        },

      ],
    },


    {
      section: "QUALITY",

      items: [

        {
          label: "Inspection Reports",
          path:
            "/factory-supervisor/inspection-reports",
          icon: FileText,
        },

        {
          label: "Defect Trends",
          path:
            "/factory-supervisor/defect-trends",
          icon: TrendingUp,
        },

        {
          label: "Quality Analytics",
          path:
            "/factory-supervisor/quality-analytics",
          icon: BarChart3,
        },

        {
          label: "Production Monitoring",
          path:
            "/factory-supervisor/production-monitoring",
          icon: Activity,
        },

      ],
    },


    {
      section: "ADMINISTRATION",

      items: [

        {
          label: "User Management",
          path:
            "/factory-supervisor/user-management",
          icon: Users,
        },

      ],
    },

  ];


  const handleNavigation = () => {

    setMobileOpen(false);

  };


  const handleLogout = () => {

    clearAuth();

    setMobileOpen(false);

    navigate(
      "/login",
      {
        replace: true,
      }
    );

  };


  return (

    <>

      <button
        className="sidebar-supervisor-mobile-toggle"
        onClick={() =>
          setMobileOpen(true)
        }
        aria-label="Open supervisor navigation"
      >

        <Menu size={22} />

      </button>


      {mobileOpen && (

        <div
          className="sidebar-supervisor-overlay"
          onClick={() =>
            setMobileOpen(false)
          }
        />

      )}


      <aside
        className={`sidebar-supervisor ${
          mobileOpen
            ? "sidebar-supervisor-open"
            : ""
        }`}
      >

        <div className="sidebar-supervisor-brand">

          <div className="sidebar-supervisor-brand-icon">

            <ShieldCheck size={22} />

          </div>


          <div className="sidebar-supervisor-brand-text">

            <h2>
              VisionInspect
            </h2>

            <span>
              AI QUALITY CONTROL
            </span>

          </div>


          <button
            className="sidebar-supervisor-close"
            onClick={() =>
              setMobileOpen(false)
            }
            aria-label="Close navigation"
          >

            <X size={20} />

          </button>

        </div>


        <div className="sidebar-supervisor-role">

          <div className="sidebar-supervisor-role-dot" />

          <div>

            <span>
              WORKSPACE
            </span>

            <strong>
              Factory Supervisor
            </strong>

          </div>

        </div>


        <nav className="sidebar-supervisor-navigation">

          {navigation.map(
            (group) => (

              <div
                className="sidebar-supervisor-group"
                key={group.section}
              >

                <div className="sidebar-supervisor-section-heading">
                <span className="sidebar-supervisor-section-title">
                  {group.section}
                </span>
                <span className="sidebar-supervisor-section-line" />
              </div>


                <div className="sidebar-supervisor-links">

                  {group.items.map(
                    (item) => {

                      const Icon =
                        item.icon;

                      return (

                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={
                            handleNavigation
                          }
                          className={({
                            isActive,
                          }) =>
                            `sidebar-supervisor-link ${
                              isActive
                                ? "active"
                                : ""
                            }`
                          }
                        >

                          <Icon
                            size={18}
                            strokeWidth={1.9}
                          />

                          <span className="sidebar-supervisor-link-label">
                            {item.label}
                          </span>
                          <ChevronRight
                            className="sidebar-supervisor-link-arrow"
                            size={13}
                            strokeWidth={1.8}
                          />

                        </NavLink>

                      );

                    }
                  )}

                </div>

              </div>

            )
          )}

        </nav>


        <div className="sidebar-supervisor-bottom">

          <div className="sidebar-supervisor-system-status">
            <div className="sidebar-supervisor-status-icon">
              <Activity size={13} />
            </div>

            <span className="sidebar-supervisor-status-dot" />

            <div>

              <span>
                AI SYSTEM
              </span>

              <strong>
                Operational
              </strong>

            </div>

          </div>


          <button
            className="sidebar-supervisor-logout"
            onClick={handleLogout}
            aria-label="Logout from Factory Supervisor workspace"
          >

            <LogOut size={18} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>

    </>

  );
}


export default SidebarSupervisor;