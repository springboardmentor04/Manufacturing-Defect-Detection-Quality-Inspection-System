import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  ScanSearch,
  CheckCircle2,
  XCircle,
  Upload,
  History,
  BarChart3,
} from "lucide-react";

import { dashboardService } from "../../services/dashboardService";


/* =========================================================
   DEFAULT DASHBOARD DATA
========================================================= */

const defaultDashboardData = {
  total_inspections: 0,
  passed: 0,
  failed: 0,
  pass_rate: 0,
  fail_rate: 0,
  average_confidence: 0,
};


/* =========================================================
   KPI COLORS
========================================================= */

const accentMap = {
  blue: {
    icon: "bg-blue-500/10 border border-blue-500/20",
    text: "text-blue-400",
    topBorder: "from-cyan-400 to-blue-600",
  },

  green: {
    icon: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-400",
    topBorder: "from-emerald-400 to-emerald-600",
  },

  red: {
    icon: "bg-red-500/10 border border-red-500/20",
    text: "text-red-400",
    topBorder: "from-red-400 to-rose-600",
  },

  orange: {
    icon: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-400",
    topBorder: "from-orange-400 to-yellow-500",
  },
};


/* =========================================================
   KPI CARD
========================================================= */

function KPI({
  label,
  value,
  icon: Icon,
  trend,
  accent,
  trendUp = true,
}) {
  const a = accentMap[accent];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[#232933] bg-[#151A21] shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">

      <div
        className={`h-1 w-full bg-gradient-to-r ${a.topBorder}`}
      />

      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500 opacity-5 blur-2xl group-hover:scale-125 transition-all duration-500" />

      <div className="relative p-6">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
              {label}
            </p>

            <h2 className="mt-3 text-4xl font-bold text-slate-50">
              {value}
            </h2>

          </div>

          <div
            className={`w-16 h-16 rounded-2xl ${a.icon} flex items-center justify-center`}
          >
            <Icon className={`w-7 h-7 ${a.text}`} />
          </div>

        </div>

        <div className="my-6 border-t border-[#232933]" />

        <div className="flex items-center justify-between">

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              trendUp
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {trend}
          </span>

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

            <span className="text-xs font-medium text-slate-500">
              Live
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   QUALITY ENGINEER DASHBOARD
========================================================= */

export default function QualityEngineerDashboard() {

  const [dashboardData, setDashboardData] = useState(
    defaultDashboardData
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  /* =======================================================
     LOAD REAL DATABASE DATA
  ======================================================= */

  const loadDashboard = async () => {

    try {

      const response =
        await dashboardService.getQEDashboard();

      // API returns JSON directly
      // No response.data because api.js returns res.json()

      console.log(
        "QE Dashboard Data:",
        response
      );

      setDashboardData(response);

      setError("");

    } catch (err) {

      console.error(
        "QE Dashboard Error:",
        err
      );

      setError(
        "Unable to load live dashboard data."
      );

    } finally {

      setLoading(false);

    }

  };


  /* =======================================================
     INITIAL LOAD + AUTO REFRESH
  ======================================================= */

  useEffect(() => {

    loadDashboard();

    // Refresh every 10 seconds
    const interval = setInterval(
      loadDashboard,
      10000
    );

    return () => clearInterval(interval);

  }, []);


  /* =======================================================
     REAL DATABASE VALUES
  ======================================================= */

  const {
    total_inspections = 0,
    passed = 0,
    failed = 0,
    pass_rate = 0,
    fail_rate = 0,
    average_confidence = 0,
  } = dashboardData || {};


  return (

    <div className="space-y-6 font-sans">


      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {error && (

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-400">

          {error}

        </div>

      )}


      {/* ===================================================
          HERO HEADER
      =================================================== */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 shadow-2xl">

        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />

        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 p-8">


          {/* LEFT CONTENT */}

          <div>

            <div className="flex flex-wrap items-center gap-3 mb-5">

              <span className="px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/20 text-cyan-300 text-xs font-bold uppercase tracking-widest">

                VisionInspect AI

              </span>

              <span className="px-4 py-1 rounded-full bg-green-500/20 border border-green-400/20 text-green-300 text-xs font-semibold">

                ● AI ENGINE ONLINE

              </span>

            </div>


            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">

              Quality Engineer Dashboard

            </h1>


            <p className="mt-4 text-slate-300 text-lg max-w-2xl">

              Monitor AI-powered defect detection, inspection quality,
              production efficiency, and manufacturing performance in
              real time.

            </p>


            {/* INFO CARDS */}

            <div className="flex flex-wrap gap-4 mt-8">

              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 min-w-[150px]">

                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Factory
                </p>

                <h3 className="text-white font-semibold mt-1">
                  VisionInspect Plant
                </h3>

              </div>


              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 min-w-[150px]">

                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Production Line
                </p>

                <h3 className="text-white font-semibold mt-1">
                  Line A
                </h3>

              </div>


              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 min-w-[150px]">

                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Current Shift
                </p>

                <h3 className="text-white font-semibold mt-1">
                  Morning
                </h3>

              </div>

            </div>

          </div>


          {/* RIGHT PANEL */}

          <div className="w-full lg:w-80">

            <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 p-6 shadow-xl">

              <h3 className="text-white text-lg font-semibold mb-5">
                Today's Overview
              </h3>

              <div className="space-y-4">

                <div className="flex justify-between">

                  <span className="text-slate-400">
                    AI Status
                  </span>

                  <span className="font-semibold text-green-400">
                    Online
                  </span>

                </div>


                <div className="flex justify-between">

                  <span className="text-slate-400">
                    Total Inspections
                  </span>

                  <span className="text-white">

                    {loading
                      ? "..."
                      : total_inspections}

                  </span>

                </div>


                <div className="flex justify-between">

                  <span className="text-slate-400">
                    AI Confidence
                  </span>

                  <span className="text-cyan-300">

                    {loading
                      ? "..."
                      : `${average_confidence}%`}

                  </span>

                </div>


                <div className="flex justify-between">

                  <span className="text-slate-400">
                    Last Sync
                  </span>

                  <span className="text-cyan-300">
                    Just Now
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* ===================================================
          AI QUALITY SCORE
      =================================================== */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 shadow-2xl text-white min-w-[320px]">

        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-green-300/20 blur-3xl" />

        <div className="relative flex items-center justify-between">

          <div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold uppercase tracking-wider">

              <span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />

              Live Quality

            </div>


            <h2 className="mt-4 text-3xl font-bold">

              {loading
                ? "..."
                : `${pass_rate}%`}

            </h2>


            <p className="text-green-100 mt-1">
              Overall Pass Rate
            </p>


            <p className="text-xs text-green-200 mt-4">

              AI continuously monitors every inspected product
              to maintain production quality.

            </p>

          </div>


          {/* CIRCULAR PROGRESS */}

          <div className="relative">

            <svg
              viewBox="0 0 120 120"
              className="w-28 h-28 -rotate-90"
            >

              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="10"
              />


              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#ffffff"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${pass_rate * 3.02} 302`}
              />

            </svg>


            <div className="absolute inset-0 flex flex-col items-center justify-center">

              <h3 className="text-2xl font-bold">

                {loading
                  ? "..."
                  : `${pass_rate}%`}

              </h3>

              <span className="text-xs text-green-100">
                Quality
              </span>

            </div>

          </div>

        </div>


        {/* REAL STATISTICS */}

        <div className="mt-8 grid grid-cols-3 gap-4">


          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 text-center">

            <p className="text-xl font-bold">

              {loading
                ? "..."
                : total_inspections}

            </p>

            <p className="text-xs text-green-100">
              Total
            </p>

          </div>


          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 text-center">

            <p className="text-xl font-bold">

              {loading
                ? "..."
                : passed}

            </p>

            <p className="text-xs text-green-100">
              Passed
            </p>

          </div>


          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 text-center">

            <p className="text-xl font-bold">

              {loading
                ? "..."
                : failed}

            </p>

            <p className="text-xs text-green-100">
              Rejected
            </p>

          </div>


        </div>

      </div>


      {/* ===================================================
          REAL-TIME KPI CARDS
      =================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">


        <KPI
          label="Total Inspections"
          value={
            loading
              ? "..."
              : total_inspections
          }
          icon={ScanSearch}
          trend={
            loading
              ? "Loading..."
              : `${total_inspections} inspections`
          }
          accent="blue"
          trendUp={true}
        />


        <KPI
          label="Passed Products"
          value={
            loading
              ? "..."
              : passed
          }
          icon={CheckCircle2}
          trend={
            loading
              ? "Loading..."
              : `${pass_rate}% pass rate`
          }
          accent="green"
          trendUp={true}
        />


        <KPI
          label="Failed Products"
          value={
            loading
              ? "..."
              : failed
          }
          icon={XCircle}
          trend={
            loading
              ? "Loading..."
              : `${fail_rate}% fail rate`
          }
          accent="red"
          trendUp={false}
        />


        <KPI
          label="AI Confidence"
          value={
            loading
              ? "..."
              : `${average_confidence}%`
          }
          icon={BarChart3}
          trend={
            loading
              ? "Loading..."
              : "Average confidence"
          }
          accent="orange"
          trendUp={true}
        />

      </div>


      {/* ===================================================
          QUICK ACTIONS
      =================================================== */}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl">

        <div className="absolute -top-16 -left-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative">

          <div className="mb-8">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              Quick Actions
            </p>

            <h2 className="mt-2 text-3xl font-bold text-white">
              Quality Engineer Tools
            </h2>

            <p className="mt-2 text-slate-400">
              Quickly access the most frequently used inspection features.
            </p>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


            {/* UPLOAD */}

            <Link
              to="/qe/upload"
              className="group rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-cyan-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            >

              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500 shadow-lg group-hover:rotate-6 transition-all">

                <Upload className="w-7 h-7 text-white" />

              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Upload Image
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                Upload a product image and let the AI inspect it automatically.
              </p>

              <div className="mt-6 flex items-center justify-between">

                <span className="text-cyan-300 font-semibold">
                  Open →
                </span>

                <span className="text-white/50 text-xs">
                  AI Inspection
                </span>

              </div>

            </Link>


            {/* HISTORY */}

            <Link
              to="/qe/history"
              className="group rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-emerald-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            >

              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg group-hover:rotate-6 transition-all">

                <History className="w-7 h-7 text-white" />

              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Inspection History
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                View previous inspections, quality logs and AI predictions.
              </p>

              <div className="mt-6 flex items-center justify-between">

                <span className="text-emerald-300 font-semibold">
                  Open →
                </span>

                <span className="text-white/50 text-xs">
                  History
                </span>

              </div>

            </Link>


            {/* REPORTS */}

            <Link
              to="/qe/reports"
              className="group rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-orange-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            >

              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 shadow-lg group-hover:rotate-6 transition-all">

                <BarChart3 className="w-7 h-7 text-white" />

              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                Reports & Analytics
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                Analyze production quality, AI accuracy and inspection reports.
              </p>

              <div className="mt-6 flex items-center justify-between">

                <span className="text-orange-300 font-semibold">
                  Open →
                </span>

                <span className="text-white/50 text-xs">
                  Reports
                </span>

              </div>

            </Link>


          </div>

        </div>

      </div>

    </div>

  );
}