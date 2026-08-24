import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertTriangle,
  Cpu,
  Search,
  Filter,
  CalendarDays,
  RotateCcw,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Activity,
  RefreshCw,
} from "lucide-react";

import { useEffect, useState } from "react";

import { useFetch } from "../../hooks/useFetch";
import { dashboardService } from "../../services/dashboardService";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";

import { formatDate } from "../../utils/formatters";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "pass") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
        <CheckCircle2 size={14} />
        Passed
      </span>
    );
  }

  if (normalized === "fail") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
        <XCircle size={14} />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
      <Clock3 size={14} />
      Pending
    </span>
  );
}

/* =========================================================
   SEVERITY BADGE
========================================================= */

function SeverityBadge({ severity }) {
  const value = severity || "None";

  const styles = {
    Critical:
      "bg-red-500/10 text-red-400 border-red-500/20",

    High:
      "bg-orange-500/10 text-orange-400 border-orange-500/20",

    Medium:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    Low:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    None:
      "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[value] || styles.None
      }`}
    >
      <AlertTriangle size={13} />
      {value}
    </span>
  );
}

/* =========================================================
   CONFIDENCE
========================================================= */

function ConfidenceBadge({ confidence }) {
  const value = Number(confidence || 0);

  let color = "text-red-400";

  if (value >= 80) {
    color = "text-emerald-400";
  } else if (value >= 60) {
    color = "text-yellow-400";
  }

  return (
    <div className="flex items-center gap-2">
      <Cpu size={15} className={color} />

      <span className={`font-semibold ${color}`}>
        {value.toFixed(2)}%
      </span>
    </div>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function AnalyticsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "cyan",
}) {
  const colors = {
    cyan: {
      icon: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    },

    green: {
      icon:
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },

    red: {
      icon: "bg-red-500/10 border-red-500/20 text-red-400",
    },

    orange: {
      icon:
        "bg-orange-500/10 border-orange-500/20 text-orange-400",
    },

    blue: {
      icon: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    },

    purple: {
      icon:
        "bg-purple-500/10 border-purple-500/20 text-purple-400",
    },
  };

  const style = colors[color] || colors.cyan;

  return (
    <div className="group rounded-2xl border border-slate-700 bg-[#151A21] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-white">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-2 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
        >
          <Icon size={22} />
        </div>

      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({
  value,
  color = "cyan",
}) {
  const colors = {
    cyan: "bg-cyan-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
  };

  const width = Math.max(
    0,
    Math.min(100, Number(value || 0))
  );

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          colors[color] || colors.cyan
        }`}
        style={{
          width: `${width}%`,
        }}
      />
    </div>
  );
}

/* =========================================================
   DISTRIBUTION ROW
========================================================= */

function DistributionRow({
  label,
  value,
  total,
  color,
}) {
  const percentage =
    total > 0
      ? (Number(value || 0) / total) * 100
      : 0;

  return (
    <div className="space-y-2">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              color || "bg-cyan-500"
            }`}
          />

          <span className="text-sm text-slate-300">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3">

          <span className="text-sm font-semibold text-white">
            {value}
          </span>

          <span className="text-xs text-slate-500">
            {percentage.toFixed(1)}%
          </span>

        </div>

      </div>

      <ProgressBar
        value={percentage}
        color={
          color === "bg-red-500"
            ? "red"
            : color === "bg-orange-500"
            ? "orange"
            : color === "bg-yellow-500"
            ? "yellow"
            : color === "bg-emerald-500"
            ? "green"
            : "cyan"
        }
      />

    </div>
  );
}

/* =========================================================
   REPORTS PAGE
========================================================= */

export default function Reports() {

  /* =======================================================
     EXISTING INSPECTION REPORTS
  ======================================================= */

  const {
    data: reports,
    loading,
  } = useFetch(() =>
    dashboardService.getQEReports()
  );

  /* =======================================================
     PRODUCTION ANALYTICS STATE
  ======================================================= */

  const [production, setProduction] =
    useState(null);

  const [productionLoading, setProductionLoading] =
    useState(true);

  const [productionError, setProductionError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  /* =======================================================
     LOAD PRODUCTION REPORT
  ======================================================= */

  const loadProductionReport = async () => {

    try {

      setProductionLoading(true);
      setProductionError("");

      const response = await fetch(
        `${API_BASE_URL}/qe/reports/production`
      );

      if (!response.ok) {
        throw new Error(
          `Production report request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "Production Quality Report:",
        data
      );

      setProduction(data);

    } catch (error) {

      console.error(
        "Production report error:",
        error
      );

      setProductionError(
        error.message ||
        "Unable to load production quality report."
      );

    } finally {

      setProductionLoading(false);

    }
  };

  /* =======================================================
     LOAD ON PAGE OPEN
  ======================================================= */

  useEffect(() => {
    loadProductionReport();
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {

    setRefreshing(true);

    await loadProductionReport();

    setRefreshing(false);
  };

  /* =======================================================
     FILTER STATES
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [severityFilter, setSeverityFilter] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("");

  /* =======================================================
     FILTER REPORTS
  ======================================================= */

  const filteredReports =
    (reports || []).filter(
      (report) => {

        const searchText =
          search.toLowerCase().trim();

        const matchesSearch =
          !searchText ||
          String(report.id || "")
            .toLowerCase()
            .includes(searchText) ||
          (report.title || "")
            .toLowerCase()
            .includes(searchText) ||
          (report.product_name || "")
            .toLowerCase()
            .includes(searchText) ||
          (report.defect_type || "")
            .toLowerCase()
            .includes(searchText);

        const reportStatus =
          (report.status || "pending")
            .toLowerCase();

        const matchesStatus =
          statusFilter === "all" ||
          reportStatus === statusFilter;

        const reportSeverity =
          report.severity || "None";

        const matchesSeverity =
          severityFilter === "all" ||
          reportSeverity === severityFilter;

        let matchesDate = true;

        if (dateFilter) {

          if (!report.generated_at) {

            matchesDate = false;

          } else {

            const reportDate =
              new Date(
                report.generated_at
              )
                .toISOString()
                .split("T")[0];

            matchesDate =
              reportDate === dateFilter;
          }
        }

        return (
          matchesSearch &&
          matchesStatus &&
          matchesSeverity &&
          matchesDate
        );
      }
    );

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {

    setSearch("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setDateFilter("");
  };

  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const totalReports =
    filteredReports.length;

  const passedReports =
    filteredReports.filter(
      (report) =>
        (report.status || "").toLowerCase() ===
        "pass"
    ).length;

  const failedReports =
    filteredReports.filter(
      (report) =>
        (report.status || "").toLowerCase() ===
        "fail"
    ).length;

  /* =======================================================
     PRODUCTION DATA
  ======================================================= */

  const totalInspections =
    Number(
      production?.total_inspections || 0
    );

  const passed =
    Number(
      production?.passed || 0
    );

  const failed =
    Number(
      production?.failed || 0
    );

  const pending =
    Number(
      production?.pending || 0
    );

  const passRate =
    Number(
      production?.pass_rate || 0
    );

  const defectRate =
    Number(
      production?.defect_rate || 0
    );

  const averageConfidence =
    Number(
      production?.average_confidence || 0
    );

  const averageSeverity =
    Number(
      production?.average_severity_score || 0
    );

  const averageProcessingTime =
    Number(
      production?.average_processing_time || 0
    );

  const severityDistribution =
    production?.severity_distribution || {};

  const defectDistribution =
    production?.defect_distribution || {};

  /* =======================================================
     TOP DEFECTS
  ======================================================= */

  const topDefects =
    Object.entries(
      defectDistribution
    )
      .sort(
        ([, a], [, b]) =>
          Number(b) - Number(a)
      )
      .slice(0, 8);

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="space-y-8">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        className="rounded-3xl p-8"
        style={{
          background:
            "linear-gradient(135deg, #0f172a, #172033, #083344)",
          border: "1px solid #263241",
        }}
      >

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">

              <BarChart3
                size={30}
                className="text-cyan-400"
              />

            </div>

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Quality Engineering
              </p>

              <h1 className="mt-1 text-3xl font-bold text-white">
                Production Quality Analytics
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Monitor manufacturing quality,
                defect trends and inspection performance.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >

            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Analytics

          </button>

        </div>

      </div>


      {/* ===================================================
          PRODUCTION ANALYTICS
      =================================================== */}

      {productionLoading ? (

        <Card>
          <Loader
            label="Loading production quality analytics..."
          />
        </Card>

      ) : productionError ? (

        <Card>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">

            <div className="flex items-center gap-3 text-red-400">

              <AlertTriangle size={22} />

              <div>

                <h3 className="font-semibold">
                  Unable to load production analytics
                </h3>

                <p className="mt-1 text-sm text-red-400/70">
                  {productionError}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={loadProductionReport}
              className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Try Again
            </button>

          </div>

        </Card>

      ) : production ? (

        <>

          {/* =================================================
              REPORT TITLE
          ================================================= */}

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">

              <Activity size={20} />

            </div>

            <div>

              <h2 className="text-xl font-bold text-white">
                Production Quality Report
              </h2>

              <p className="text-sm text-slate-500">
                Real-time manufacturing inspection statistics
              </p>

            </div>

          </div>


          {/* =================================================
              KPI CARDS
          ================================================= */}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <AnalyticsCard
              title="Total Inspections"
              value={totalInspections}
              subtitle="All inspection records"
              icon={FileText}
              color="cyan"
            />

            <AnalyticsCard
              title="Passed"
              value={passed}
              subtitle={`${passRate.toFixed(2)}% pass rate`}
              icon={CheckCircle2}
              color="green"
            />

            <AnalyticsCard
              title="Failed"
              value={failed}
              subtitle={`${defectRate.toFixed(2)}% defect rate`}
              icon={XCircle}
              color="red"
            />

            <AnalyticsCard
              title="Pending"
              value={pending}
              subtitle="Awaiting inspection"
              icon={Clock3}
              color="orange"
            />

          </div>


          {/* =================================================
              PERFORMANCE METRICS
          ================================================= */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            <AnalyticsCard
              title="Average Confidence"
              value={`${averageConfidence.toFixed(2)}%`}
              subtitle="AI prediction confidence"
              icon={Cpu}
              color="blue"
            />

            <AnalyticsCard
              title="Average Severity"
              value={averageSeverity.toFixed(2)}
              subtitle="Severity score / 100"
              icon={ShieldAlert}
              color="red"
            />

            <AnalyticsCard
              title="Avg Processing Time"
              value={`${averageProcessingTime.toFixed(3)}s`}
              subtitle="AI inspection processing"
              icon={TrendingUp}
              color="purple"
            />

          </div>


          {/* =================================================
              PASS / FAIL OVERVIEW
          ================================================= */}

          <Card>

            <div className="mb-6">

              <h2 className="text-lg font-semibold text-white">
                Quality Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Overall pass and defect distribution
              </p>

            </div>

            <div className="space-y-6">

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-sm font-medium text-slate-300">
                    Pass Rate
                  </span>

                  <span className="text-sm font-bold text-emerald-400">
                    {passRate.toFixed(2)}%
                  </span>

                </div>

                <ProgressBar
                  value={passRate}
                  color="green"
                />

              </div>


              <div>

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-sm font-medium text-slate-300">
                    Defect Rate
                  </span>

                  <span className="text-sm font-bold text-red-400">
                    {defectRate.toFixed(2)}%
                  </span>

                </div>

                <ProgressBar
                  value={defectRate}
                  color="red"
                />

              </div>

            </div>

          </Card>


          {/* =================================================
              SEVERITY + TOP DEFECTS
          ================================================= */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* SEVERITY */}

            <Card>

              <div className="mb-6">

                <h2 className="text-lg font-semibold text-white">
                  Severity Distribution
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Distribution of inspection severity levels
                </p>

              </div>

              <div className="space-y-5">

                <DistributionRow
                  label="Critical"
                  value={
                    severityDistribution.Critical || 0
                  }
                  total={totalInspections}
                  color="bg-red-500"
                />

                <DistributionRow
                  label="High"
                  value={
                    severityDistribution.High || 0
                  }
                  total={totalInspections}
                  color="bg-orange-500"
                />

                <DistributionRow
                  label="Medium"
                  value={
                    severityDistribution.Medium || 0
                  }
                  total={totalInspections}
                  color="bg-yellow-500"
                />

                <DistributionRow
                  label="Low"
                  value={
                    severityDistribution.Low || 0
                  }
                  total={totalInspections}
                  color="bg-emerald-500"
                />

                <DistributionRow
                  label="None"
                  value={
                    severityDistribution.None || 0
                  }
                  total={totalInspections}
                  color="bg-slate-500"
                />

              </div>

            </Card>


            {/* TOP DEFECTS */}

            <Card>

              <div className="mb-6">

                <h2 className="text-lg font-semibold text-white">
                  Top Detected Defects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Most frequently detected defect categories
                </p>

              </div>

              {topDefects.length === 0 ? (

                <div className="py-10 text-center text-sm text-slate-500">
                  No defect data available.
                </div>

              ) : (

                <div className="space-y-4">

                  {topDefects.map(
                    ([defect, count], index) => {

                      const percentage =
                        totalInspections > 0
                          ? (Number(count) /
                              totalInspections) *
                            100
                          : 0;

                      return (

                        <div
                          key={defect}
                          className="space-y-2"
                        >

                          <div className="flex items-center justify-between gap-4">

                            <div className="flex min-w-0 items-center gap-3">

                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-400">
                                {index + 1}
                              </span>

                              <span className="truncate text-sm text-slate-300">
                                {defect}
                              </span>

                            </div>

                            <span className="shrink-0 text-sm font-bold text-white">
                              {count}
                            </span>

                          </div>

                          <ProgressBar
                            value={percentage}
                            color="cyan"
                          />

                        </div>

                      );
                    }
                  )}

                </div>

              )}

            </Card>

          </div>

        </>

      ) : null}


      {/* ===================================================
          INSPECTION REPORT HISTORY
      =================================================== */}

      <div className="pt-2">

        <div className="mb-5 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">

            <FileText size={20} />

          </div>

          <div>

            <h2 className="text-xl font-bold text-white">
              Inspection Reports
            </h2>

            <p className="text-sm text-slate-500">
              Individual AI inspection reports
            </p>

          </div>

        </div>


        {/* =================================================
            FILTERS
        ================================================= */}

        <Card>

          <div className="space-y-4">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Filter
                  size={18}
                  className="text-cyan-400"
                />

                <h2 className="font-semibold text-white">
                  Filters
                </h2>

              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
              >

                <RotateCcw size={14} />

                Clear Filters

              </button>

            </div>


            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

              {/* SEARCH */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Search
                </label>

                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-3">

                  <Search
                    size={17}
                    className="shrink-0 text-slate-500"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Report, product, defect..."
                    className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                  />

                </div>

              </div>


              {/* STATUS */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
                >

                  <option value="all">
                    All Status
                  </option>

                  <option value="pass">
                    Passed
                  </option>

                  <option value="fail">
                    Failed
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                </select>

              </div>


              {/* SEVERITY */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Severity
                </label>

                <select
                  value={severityFilter}
                  onChange={(e) =>
                    setSeverityFilter(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
                >

                  <option value="all">
                    All Severity
                  </option>

                  <option value="Critical">
                    Critical
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="Low">
                    Low
                  </option>

                  <option value="None">
                    None
                  </option>

                </select>

              </div>


              {/* DATE */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </label>

                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-3">

                  <CalendarDays
                    size={17}
                    className="shrink-0 text-slate-500"
                  />

                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(e.target.value)
                    }
                    className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none"
                  />

                </div>

              </div>

            </div>


            <div className="border-t border-slate-800 pt-4">

              <p className="text-sm text-slate-500">

                Showing{" "}

                <span className="font-semibold text-cyan-400">
                  {filteredReports.length}
                </span>

                {" "}of{" "}

                <span className="font-semibold text-slate-300">
                  {(reports || []).length}
                </span>

                {" "}reports

              </p>

            </div>

          </div>

        </Card>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">

          <AnalyticsCard
            title="Filtered Reports"
            value={totalReports}
            icon={FileText}
            color="cyan"
          />

          <AnalyticsCard
            title="Passed"
            value={passedReports}
            icon={CheckCircle2}
            color="green"
          />

          <AnalyticsCard
            title="Failed"
            value={failedReports}
            icon={XCircle}
            color="red"
          />

        </div>


        {/* =================================================
            REPORT TABLE
        ================================================= */}

        <div className="mt-5">

          <Card title="Inspection Reports">

            {loading ? (

              <Loader
                label="Loading reports..."
              />

            ) : filteredReports.length === 0 ? (

              <div className="flex flex-col items-center justify-center py-16 text-center">

                <Search
                  size={42}
                  className="text-slate-600"
                />

                <h3 className="mt-4 text-lg font-semibold text-slate-300">
                  No matching reports
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try changing your search or filters.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                >
                  Clear Filters
                </button>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="min-w-[1100px] w-full">

                  <thead>

                    <tr className="border-b border-slate-700">

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Report
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Product
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Defect
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Severity
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Confidence
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Processing
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Generated
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredReports.map(
                      (report) => (

                        <tr
                          key={report.id}
                          className="border-b border-slate-800 transition hover:bg-slate-800/40"
                        >

                          <td className="px-5 py-5">

                            <p className="font-semibold text-white">
                              {report.title ||
                                `Inspection Report #${report.id}`}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              ID #{report.id}
                            </p>

                          </td>


                          <td className="px-5 py-5 text-sm text-slate-300">
                            {report.product_name ||
                              "Unknown"}
                          </td>


                          <td className="px-5 py-5 text-sm text-slate-300">
                            {report.defect_type ||
                              "No Defect"}
                          </td>


                          <td className="px-5 py-5">

                            <SeverityBadge
                              severity={
                                report.severity
                              }
                            />

                          </td>


                          <td className="px-5 py-5">

                            <ConfidenceBadge
                              confidence={
                                report.confidence
                              }
                            />

                          </td>


                          <td className="px-5 py-5">

                            <StatusBadge
                              status={
                                report.status
                              }
                            />

                          </td>


                          <td className="px-5 py-5 text-sm text-slate-400">

                            {Number(
                              report.processing_time || 0
                            ).toFixed(2)}
                            s

                          </td>


                          <td className="px-5 py-5 text-sm text-slate-400">

                            {report.generated_at
                              ? formatDate(
                                  report.generated_at
                                )
                              : "—"}

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </Card>

        </div>

      </div>

    </div>
  );
}