import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import { useAuth } from "../../context/AuthContext";


/* =========================================================
   SHIFT
========================================================= */

const getShift = (hour) => {

  if (hour >= 6 && hour < 14) {
    return "Morning Shift";
  }

  if (hour >= 14 && hour < 22) {
    return "Evening Shift";
  }

  return "Night Shift";
};


/* =========================================================
   BELL ICON
========================================================= */

const IconBell = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);


/* =========================================================
   FORMAT ROLE
========================================================= */

const formatRole = (role) => {

  if (!role) {
    return "User";
  }

  const roleMap = {
    quality_engineer: "Quality Engineer",
    supervisor: "Supervisor",
    admin: "Administrator",
  };

  return (
    roleMap[role] ||
    role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
};


/* =========================================================
   GET INITIALS
========================================================= */

const getInitials = (name) => {

  if (!name) {
    return "U";
  }

  const parts =
    name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};


/* =========================================================
   DASHBOARD LAYOUT
========================================================= */

const DashboardLayout = ({
  title = "Dashboard",
  subtitle = "AI Powered Manufacturing Quality Monitoring System",
}) => {

  /* =======================================================
     AUTHENTICATED USER
  ======================================================= */

  const { user } = useAuth();


  /* =======================================================
     CLOCK
  ======================================================= */

  const [now, setNow] =
    useState(new Date());


  useEffect(() => {

    const timer = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () =>
      clearInterval(timer);

  }, []);


  /* =======================================================
     TIME / DATE
  ======================================================= */

  const timeStr =
    now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );


  const dateStr =
    now.toLocaleDateString(
      [],
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    );


  const shift =
    getShift(now.getHours());


  /* =======================================================
     USER INFORMATION
  ======================================================= */

  const userName =
    user?.full_name ||
    user?.name ||
    "User";


  const userRole =
    formatRole(
      user?.role
    );


  const initials =
    getInitials(userName);


  return (

    <div
      className="flex min-h-screen"
      style={{
        backgroundColor: "#0B0F14",
      }}
    >

      <Sidebar />


      <div className="flex-1 flex flex-col">

        {/* =================================================
            TOP NAVBAR
        ================================================= */}

        <header
          className="sticky top-0 z-30"
          style={{
            backgroundColor: "#10151B",
            borderBottom:
              "1px solid #232933",
          }}
        >

          <div className="flex items-center justify-between gap-6 px-6 py-3.5">

            {/* =============================================
                LEFT: BREADCRUMB / TITLE
            ============================================= */}

            <div className="min-w-0">

              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">

                <span>
                  VisionInspect
                </span>

                <span className="text-slate-700">
                  /
                </span>

                <span className="text-cyan-400">
                  {title}
                </span>

              </div>


              <h2 className="mt-0.5 text-xl font-semibold text-slate-50 truncate">
                {title}
              </h2>

            </div>


            {/* =============================================
                RIGHT SIDE
            ============================================= */}

            <div className="flex items-center gap-2 shrink-0">

              {/* ===========================================
                  AI ENGINE STATUS
              =========================================== */}

              <div
                className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg"
                style={{
                  border:
                    "1px solid #232933",
                }}
              >

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>

                </span>

                <span className="text-xs font-medium text-slate-300">
                  AI Engine Online
                </span>

              </div>


              {/* ===========================================
                  CLOCK
              =========================================== */}

              <div
                className="hidden sm:flex flex-col items-end px-3 h-9 justify-center"
                style={{
                  borderLeft:
                    "1px solid #232933",
                }}
              >

                <span className="text-sm font-mono font-semibold text-slate-100 leading-none tabular-nums">
                  {timeStr}
                </span>

                <span className="text-[11px] text-slate-500 leading-none mt-0.5">
                  {dateStr} · {shift}
                </span>

              </div>


              {/* ===========================================
                  NOTIFICATIONS
              =========================================== */}

              <button
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                style={{
                  border:
                    "1px solid #232933",
                }}
                aria-label="Alerts"
              >

                <IconBell />

                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  3
                </span>

              </button>


              {/* ===========================================
                  USER PROFILE
              =========================================== */}

              <div
                className="flex items-center gap-2.5 pl-2"
                style={{
                  borderLeft:
                    "1px solid #232933",
                }}
              >

                {/* NAME + ROLE */}

                <div className="hidden md:block text-right leading-tight">

                  <p className="text-sm font-semibold text-slate-100">
                    {userName}
                  </p>

                  <p className="text-[11px] text-slate-500">
                    {userRole}
                  </p>

                </div>


                {/* AVATAR */}

                <div className="relative">

                  <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm font-semibold">

                    {initials}

                  </div>


                  {/* ONLINE DOT */}

                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500"
                    style={{
                      border:
                        "2px solid #10151B",
                    }}
                  />

                </div>

              </div>

            </div>

          </div>

        </header>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main
          className="flex-1 overflow-auto"
          style={{
            backgroundColor: "#0B0F14",

            backgroundImage:
              "radial-gradient(#161C24 1px, transparent 1px)",

            backgroundSize:
              "22px 22px",
          }}
        >

          <div className="p-6">

            <Outlet />

          </div>

        </main>

      </div>

    </div>
  );
};


export default DashboardLayout;