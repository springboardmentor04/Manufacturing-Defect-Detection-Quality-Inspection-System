import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { classNames } from "../../utils/formatters";

import {
  LayoutDashboard,
  UploadCloud,
  History,
  FileBarChart,
  User,
  BarChart3,
  Users,
  Cpu,
} from "lucide-react";


// =========================================================
// NAVIGATION BY ROLE
// =========================================================

const NAV_BY_ROLE = {

  quality_engineer: [

    {
      to: "/qe/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      to: "/qe/upload",
      label: "Upload Image",
      icon: UploadCloud,
    },

    {
      to: "/qe/history",
      label: "Inspection History",
      icon: History,
    },

    {
      to: "/qe/reports",
      label: "Reports",
      icon: FileBarChart,
    },

    {
      to: "/qe/profile",
      label: "Profile",
      icon: User,
    },

  ],


  supervisor: [

    {
      to: "/supervisor/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      to: "/supervisor/analytics",
      label: "Analytics",
      icon: BarChart3,
    },

    {
      to: "/supervisor/reports",
      label: "Reports",
      icon: FileBarChart,
    },

    {
      to: "/supervisor/users",
      label: "Users",
      icon: Users,
    },

    {
      to: "/supervisor/profile",
      label: "Profile",
      icon: User,
    },

  ],

};


// =========================================================
// SIDEBAR
// =========================================================

export default function Sidebar() {

  const { user } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();


  // -------------------------------------------------------
  // Current role
  // -------------------------------------------------------

  const role = user?.role;

  const links =
    NAV_BY_ROLE[role] || [];


  // -------------------------------------------------------
  // User initials
  // -------------------------------------------------------

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "VI";


  // -------------------------------------------------------
  // Navigate between role dashboards
  // -------------------------------------------------------

  function goToRole(targetRole) {

    if (targetRole === "quality_engineer") {

      navigate("/qe/dashboard");

      return;
    }


    if (targetRole === "supervisor") {

      navigate("/supervisor/dashboard");

      return;
    }

  }


  return (

    <aside
      className="
        relative
        flex
        min-h-screen
        w-[264px]
        flex-col
        overflow-hidden
        bg-[#080c18]
        text-white
      "
    >

      {/* =================================================
          GLOW EFFECTS
      ================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          -left-20
          -top-20
          h-[260px]
          w-[260px]
          rounded-full
          bg-cyan-400/10
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-10
          -right-20
          h-[240px]
          w-[240px]
          rounded-full
          bg-indigo-500/10
          blur-3xl
        "
      />


      {/* =================================================
          LOGO / HEADER
      ================================================= */}

      <div
        className="
          relative
          z-10
          flex
          items-center
          gap-3
          border-b
          border-white/10
          px-5
          py-6
        "
      >

        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-gradient-to-br
            from-cyan-400
            to-indigo-500
            shadow-lg
            shadow-cyan-500/30
          "
        >

          <Cpu size={22} />

        </div>


        <div>

          <h2
            className="
              text-[15px]
              font-bold
              tracking-wide
            "
          >
            VisionInspect AI
          </h2>

          <p
            className="
              text-[10px]
              uppercase
              tracking-widest
              text-cyan-400
            "
          >
            Inspection System
          </p>

        </div>

      </div>


      {/* =================================================
          ROLE SWITCH
      ================================================= */}

      <div
        className="
          relative
          z-10
          mx-4
          mt-5
          rounded-lg
          border
          border-white/10
          bg-white/5
          p-1
        "
      >

        <div
          className="
            grid
            grid-cols-2
            gap-1
          "
        >

          {/* QUALITY ENGINEER */}

          <button
            type="button"
            onClick={() =>
              goToRole("quality_engineer")
            }
            className={classNames(
              "rounded-md py-2 text-xs font-semibold transition-all",

              role === "quality_engineer"
                ? "border border-cyan-500/20 bg-cyan-500/20 text-cyan-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            )}
          >
            Quality Eng.
          </button>


          {/* SUPERVISOR */}

          <button
            type="button"
            onClick={() =>
              goToRole("supervisor")
            }
            className={classNames(
              "rounded-md py-2 text-xs font-semibold transition-all",

              role === "supervisor"
                ? "border border-cyan-500/20 bg-cyan-500/20 text-cyan-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            )}
          >
            Supervisor
          </button>

        </div>

      </div>


      {/* =================================================
          WORKSPACE LABEL
      ================================================= */}

      <p
        className="
          relative
          z-10
          px-5
          pb-2
          pt-6
          text-[10px]
          uppercase
          tracking-[0.2em]
          text-white/25
        "
      >
        Workspace
      </p>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav
        className="
          relative
          z-10
          flex-1
          px-3
        "
      >

        {links.map((link) => {

          const Icon = link.icon;


          return (

            <NavLink
              key={link.to}
              to={link.to}

              end={link.to.endsWith("/dashboard")}

              className={({ isActive }) =>
                classNames(

                  `
                    group
                    relative
                    mb-1
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    px-3
                    py-3
                    text-[13px]
                    font-medium
                    transition-all
                    duration-200
                  `,

                  isActive

                    ? `
                      bg-gradient-to-r
                      from-cyan-500/15
                      to-indigo-500/10
                      text-cyan-100
                    `

                    : `
                      text-white/40
                      hover:bg-white/5
                      hover:text-white/80
                      hover:translate-x-1
                    `
                )
              }
            >

              {({ isActive }) => (

                <>

                  {/* Active indicator */}

                  {isActive && (

                    <span
                      className="
                        absolute
                        left-0
                        top-1/4
                        h-1/2
                        w-[3px]
                        rounded-r-full
                        bg-gradient-to-b
                        from-cyan-400
                        to-indigo-500
                      "
                    />

                  )}


                  {/* Icon */}

                  <Icon
                    size={18}
                    className={classNames(

                      "transition-colors",

                      isActive
                        ? "text-cyan-400"
                        : "text-white/60"

                    )}
                  />


                  {/* Label */}

                  <span className="flex-1">

                    {link.label}

                  </span>

                </>

              )}

            </NavLink>

          );

        })}


        {/* Divider */}

        <div
          className="
            mx-3
            my-4
            h-px
            bg-gradient-to-r
            from-transparent
            via-white/10
            to-transparent
          "
        />

      </nav>


      {/* =================================================
          USER MINI PROFILE
      ================================================= */}

      <div
        className="
          relative
          z-10
          border-t
          border-white/10
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-cyan-400
              to-indigo-500
              text-xs
              font-bold
            "
          >

            {initials}

          </div>


          <div className="min-w-0">

            <p
              className="
                truncate
                text-xs
                font-semibold
                text-white
              "
            >
              {user?.name || "User"}
            </p>

            <p
              className="
                truncate
                text-[10px]
                text-slate-500
              "
            >
              {role === "supervisor"
                ? "Factory Supervisor"
                : "Quality Engineer"}
            </p>

          </div>

        </div>

      </div>

    </aside>

  );

}