import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Cpu,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import { useState } from "react";

import { useFetch } from "../../hooks/useFetch";
import { dashboardService } from "../../services/dashboardService";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";


export default function Reports() {

  // =========================================================
  // Date Filters
  // =========================================================

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });


  // =========================================================
  // Production Report API
  // =========================================================

  const {
    data,
    loading,
  } = useFetch(
    () =>
      dashboardService.getProductionQualityReport(
        filters.startDate,
        filters.endDate
      ),
    [filters.startDate, filters.endDate]
  );


  // =========================================================
  // Apply Filters
  // =========================================================

  function handleApplyFilters() {

    setFilters({
      startDate,
      endDate,
    });

  }


  // =========================================================
  // Reset Filters
  // =========================================================

  function handleResetFilters() {

    setStartDate("");
    setEndDate("");

    setFilters({
      startDate: "",
      endDate: "",
    });

  }


  // =========================================================
  // Loading
  // =========================================================

  if (loading) {

    return (
      <Loader label="Loading production quality report..." />
    );

  }


  // =========================================================
  // Data
  // =========================================================

  const summary = data?.summary || {};

  const defects = data?.top_defects || [];

  const severity = data?.severity_distribution || {};

  const dailyTrend = data?.daily_trend || [];


  return (

    <div className="space-y-8">


      {/* =====================================================
          Header
      ===================================================== */}

      <div
        className="
          rounded-2xl
          border border-slate-800
          bg-gradient-to-r
          from-slate-900
          via-slate-900
          to-cyan-950
          p-7
        "
      >

        <div className="flex items-start gap-4">

          <div
            className="
              flex h-14 w-14
              items-center justify-center
              rounded-xl
              bg-cyan-500/10
              border border-cyan-500/20
            "
          >

            <FileText
              size={28}
              className="text-cyan-400"
            />

          </div>


          <div>

            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-widest
                text-cyan-400
              "
            >
              Supervisor Reports
            </p>


            <h1 className="mt-1 text-3xl font-bold text-white">

              Production Quality Report

            </h1>


            <p className="mt-2 text-sm text-slate-400">

              Production inspection performance,
              defect analysis and quality assessment.

            </p>

          </div>

        </div>

      </div>



      {/* =====================================================
          Date Filters
      ===================================================== */}

      <Card>

        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-2">

            <CalendarDays
              size={18}
              className="text-cyan-400"
            />

            <h2 className="font-semibold text-white">

              Report Period

            </h2>

          </div>


          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-4
            "
          >

            {/* Start Date */}

            <div>

              <label className="mb-2 block text-xs text-slate-400">

                Start Date

              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="
                  w-full
                  rounded-lg
                  border border-slate-700
                  bg-slate-900
                  px-4 py-3
                  text-sm
                  text-white
                  outline-none
                  focus:border-cyan-500
                "
              />

            </div>


            {/* End Date */}

            <div>

              <label className="mb-2 block text-xs text-slate-400">

                End Date

              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="
                  w-full
                  rounded-lg
                  border border-slate-700
                  bg-slate-900
                  px-4 py-3
                  text-sm
                  text-white
                  outline-none
                  focus:border-cyan-500
                "
              />

            </div>


            {/* Buttons */}

            <div className="flex items-end gap-3">

              <button
                onClick={handleApplyFilters}
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-cyan-600
                  px-4 py-3
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-cyan-500
                "
              >

                <TrendingUp size={17} />

                Generate Report

              </button>


              <button
                onClick={handleResetFilters}
                className="
                  flex
                  items-center
                  justify-center
                  rounded-lg
                  border border-slate-700
                  bg-slate-900
                  px-4 py-3
                  text-slate-300
                  transition
                  hover:border-cyan-500
                  hover:text-cyan-400
                "
                title="Reset filters"
              >

                <RefreshCw size={17} />

              </button>

            </div>

          </div>

        </div>

      </Card>



      {/* =====================================================
          Report Period
      ===================================================== */}

      {(data?.period?.start_date ||
        data?.period?.end_date) && (

        <div
          className="
            rounded-lg
            border border-cyan-500/20
            bg-cyan-500/5
            px-4 py-3
            text-sm
            text-slate-300
          "
        >

          Showing production data from{" "}

          <span className="font-semibold text-cyan-400">

            {data?.period?.start_date || "Beginning"}

          </span>

          {" "}to{" "}

          <span className="font-semibold text-cyan-400">

            {data?.period?.end_date || "Today"}

          </span>

        </div>

      )}



      {/* =====================================================
          KPI Cards
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-5
        "
      >

        <ReportCard
          title="Total Inspections"
          value={summary.total_inspections ?? 0}
          icon={<FileText size={22} />}
          iconClass="text-cyan-400"
        />


        <ReportCard
          title="Passed"
          value={summary.passed ?? 0}
          icon={<CheckCircle2 size={22} />}
          iconClass="text-emerald-400"
        />


        <ReportCard
          title="Failed"
          value={summary.failed ?? 0}
          icon={<XCircle size={22} />}
          iconClass="text-red-400"
        />


        <ReportCard
          title="Pending"
          value={summary.pending ?? 0}
          icon={<Clock3 size={22} />}
          iconClass="text-amber-400"
        />

      </div>



      {/* =====================================================
          Quality Metrics
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-5
        "
      >

        <MetricCard
          title="Pass Rate"
          value={`${summary.pass_rate ?? 0}%`}
          icon={<TrendingUp size={20} />}
          valueClass="text-emerald-400"
        />


        <MetricCard
          title="Defect Rate"
          value={`${summary.defect_rate ?? 0}%`}
          icon={<TrendingDown size={20} />}
          valueClass="text-red-400"
        />


        <MetricCard
          title="Average Confidence"
          value={`${summary.average_confidence ?? 0}%`}
          icon={<Cpu size={20} />}
          valueClass="text-cyan-400"
        />


        <MetricCard
          title="Avg Processing Time"
          value={`${summary.average_processing_time ?? 0}s`}
          icon={<Clock3 size={20} />}
          valueClass="text-blue-400"
        />

      </div>



      {/* =====================================================
          Top Defects
      ===================================================== */}

      <Card
        title="Top Defects"
        subtitle="Most frequently detected defects in the selected period."
      >

        {defects.length === 0 ? (

          <EmptyState message="No defect data available." />

        ) : (

          <div className="space-y-3">

            {defects.map((item, index) => (

              <div
                key={`${item.defect_type}-${index}`}
                className="
                  flex
                  items-center
                  justify-between
                  rounded-lg
                  border border-slate-800
                  bg-slate-900/60
                  px-4 py-3
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex h-8 w-8
                      items-center justify-center
                      rounded-lg
                      bg-red-500/10
                      text-xs
                      font-bold
                      text-red-400
                    "
                  >

                    {index + 1}

                  </div>


                  <div>

                    <p className="text-sm font-medium text-white">

                      {item.defect_type}

                    </p>

                    <p className="text-xs text-slate-500">

                      {item.percentage}% of inspections

                    </p>

                  </div>

                </div>


                <span
                  className="
                    rounded-lg
                    bg-red-500/10
                    px-3 py-1
                    text-sm
                    font-bold
                    text-red-400
                  "
                >

                  {item.count}

                </span>

              </div>

            ))}

          </div>

        )}

      </Card>



      {/* =====================================================
          Severity Distribution
      ===================================================== */}

      <Card
        title="Severity Distribution"
        subtitle="Distribution of detected quality severity levels."
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-5
            gap-4
          "
        >

          <SeverityCard
            label="Critical"
            value={severity.Critical || 0}
            className="text-red-400"
            bg="bg-red-500/10"
          />


          <SeverityCard
            label="High"
            value={severity.High || 0}
            className="text-orange-400"
            bg="bg-orange-500/10"
          />


          <SeverityCard
            label="Medium"
            value={severity.Medium || 0}
            className="text-yellow-400"
            bg="bg-yellow-500/10"
          />


          <SeverityCard
            label="Low"
            value={severity.Low || 0}
            className="text-cyan-400"
            bg="bg-cyan-500/10"
          />


          <SeverityCard
            label="None"
            value={severity.None || 0}
            className="text-slate-300"
            bg="bg-slate-500/10"
          />

        </div>

      </Card>



      {/* =====================================================
          Daily Production Trend
      ===================================================== */}

      <Card
        title="Production Inspection Trend"
        subtitle="Daily inspection results for the selected reporting period."
      >

        {dailyTrend.length === 0 ? (

          <EmptyState message="No daily production data available." />

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>

                <tr className="border-b border-slate-800">

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    Date

                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    Total

                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    Passed

                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    Failed

                  </th>

                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    Pending

                  </th>

                </tr>

              </thead>


              <tbody>

                {dailyTrend.map((day) => (

                  <tr
                    key={day.date}
                    className="
                      border-b
                      border-slate-800/70
                      transition
                      hover:bg-slate-800/40
                    "
                  >

                    <td className="px-4 py-4 text-sm font-medium text-white">

                      {formatReportDate(day.date)}

                    </td>


                    <td className="px-4 py-4 text-sm font-semibold text-cyan-400">

                      {day.total}

                    </td>


                    <td className="px-4 py-4 text-sm font-semibold text-emerald-400">

                      {day.passed}

                    </td>


                    <td className="px-4 py-4 text-sm font-semibold text-red-400">

                      {day.failed}

                    </td>


                    <td className="px-4 py-4 text-sm font-semibold text-amber-400">

                      {day.pending}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </Card>



      {/* =====================================================
          Report Status
      ===================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
          rounded-xl
          border border-emerald-500/20
          bg-emerald-500/5
          px-5 py-4
        "
      >

        <ShieldAlert
          size={20}
          className="text-emerald-400"
        />

        <div>

          <p className="text-sm font-semibold text-emerald-400">

            Production report generated successfully

          </p>

          <p className="mt-1 text-xs text-slate-400">

            Report data is calculated from the VisionInspect AI
            inspection database.

          </p>

        </div>

      </div>

    </div>

  );
}



/* ============================================================
   Report KPI Card
============================================================ */

function ReportCard({
  title,
  value,
  icon,
  iconClass,
}) {

  return (

    <div
      className="
        rounded-xl
        border border-slate-800
        bg-[#151A21]
        p-5
        transition
        hover:border-slate-700
      "
    >

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-400">

            {title}

          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">

            {value}

          </h2>

        </div>


        <div
          className={`
            rounded-lg
            bg-slate-900
            p-3
            ${iconClass}
          `}
        >

          {icon}

        </div>

      </div>

    </div>

  );
}



/* ============================================================
   Metric Card
============================================================ */

function MetricCard({
  title,
  value,
  icon,
  valueClass,
}) {

  return (

    <div
      className="
        rounded-xl
        border border-slate-800
        bg-[#0d1320]
        p-5
      "
    >

      <div className="flex items-center gap-3">

        <div className={valueClass}>

          {icon}

        </div>

        <p className="text-sm text-slate-400">

          {title}

        </p>

      </div>


      <p
        className={`
          mt-4
          text-3xl
          font-bold
          ${valueClass}
        `}
      >

        {value}

      </p>

    </div>

  );
}



/* ============================================================
   Severity Card
============================================================ */

function SeverityCard({
  label,
  value,
  className,
  bg,
}) {

  return (

    <div
      className={`
        rounded-xl
        border border-slate-800
        ${bg}
        p-5
      `}
    >

      <p className="text-sm text-slate-400">

        {label}

      </p>


      <p
        className={`
          mt-2
          text-3xl
          font-bold
          ${className}
        `}
      >

        {value}

      </p>

    </div>

  );
}



/* ============================================================
   Empty State
============================================================ */

function EmptyState({ message }) {

  return (

    <div
      className="
        flex
        min-h-32
        items-center
        justify-center
        rounded-xl
        border border-dashed
        border-slate-800
        text-sm
        text-slate-500
      "
    >

      <AlertTriangle
        size={18}
        className="mr-2"
      />

      {message}

    </div>

  );
}



/* ============================================================
   Date Formatter
============================================================ */

function formatReportDate(date) {

  if (!date) {
    return "-";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

}