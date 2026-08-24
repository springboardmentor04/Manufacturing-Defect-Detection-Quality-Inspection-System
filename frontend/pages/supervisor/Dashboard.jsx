import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

import { useFetch } from "../../hooks/useFetch";
import { dashboardService } from "../../services/dashboardService";

import StatsCard from "../../components/dashboard/StatsCard";
import ActivityChart from "../../components/dashboard/ActivityChart";
import DefectPieChart from "../../components/dashboard/DefectPieChart";
import SeverityBarChart from "../../components/dashboard/SeverityBarChart";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";


// =========================================================
// SUPERVISOR DASHBOARD
// =========================================================

export default function Dashboard() {

  // =======================================================
  // DASHBOARD STATISTICS
  // =======================================================

  const {
    data: stats,
    loading: statsLoading,
  } = useFetch(() =>
    dashboardService.getStats()
  );


  // =======================================================
  // INSPECTION ACTIVITY
  // =======================================================

  const {
    data: activity,
    loading: activityLoading,
  } = useFetch(() =>
    dashboardService.getActivity()
  );


  // =======================================================
  // DEFECT DISTRIBUTION
  // =======================================================

  const {
    data: defectData,
    loading: defectLoading,
  } = useFetch(() =>
    dashboardService.getDefectDistribution()
  );


  // =======================================================
  // SEVERITY DISTRIBUTION
  // =======================================================

  const {
    data: severityData,
    loading: severityLoading,
  } = useFetch(() =>
    dashboardService.getSeverityDistribution()
  );


  // =======================================================
  // CALCULATE RATES FROM COUNTS
  // =======================================================

  const total =
    Number(stats?.total_inspections) || 0;

  const passed =
    Number(stats?.passed) || 0;

  const failed =
    Number(stats?.failed) || 0;


  const passRate =
    total > 0
      ? ((passed / total) * 100).toFixed(2)
      : "0.00";


  const failRate =
    total > 0
      ? ((failed / total) * 100).toFixed(2)
      : "0.00";


  // =======================================================
  // RENDER
  // =======================================================

  return (

    <div className="space-y-8">


      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900/60
          p-6
        "
      >

        <div className="flex items-center gap-4">

          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-cyan-500/10
              text-cyan-400
            "
          >

            <Activity size={25} />

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
              Supervisor Overview
            </p>

            <h1
              className="
                mt-1
                text-2xl
                font-bold
                text-white
              "
            >
              Manufacturing Quality Dashboard
            </h1>

            <p
              className="
                mt-1
                text-sm
                text-slate-400
              "
            >
              Monitor inspection performance,
              defects, and product quality.
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          KPI CARDS
      ================================================= */}

      {statsLoading ? (

        <Loader
          label="Loading dashboard statistics..."
        />

      ) : (

        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
            xl:grid-cols-4
          "
        >

          {/* Total Inspections */}

          <StatsCard
            label="Total Inspections"
            value={total}
            icon="inspection"
          />


          {/* Pass Rate */}

          <StatsCard
            label="Pass Rate"
            value={`${passRate}%`}
            icon="accuracy"
          />


          {/* Passed */}

          <StatsCard
            label="Passed Products"
            value={passed}
            icon="users"
          />


          {/* Failed */}

          <StatsCard
            label="Failed Products"
            value={failed}
            icon="warning"
          />

        </div>

      )}


      {/* =================================================
          QUICK QUALITY SUMMARY
      ================================================= */}

      {!statsLoading && stats && (

        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-3
          "
        >

          {/* Total */}

          <SummaryCard
            title="Total Inspections"
            value={total}
            icon={
              <ClipboardCheck
                size={22}
              />
            }
            iconClass="text-cyan-400"
            bgClass="bg-cyan-500/10"
          />


          {/* Passed */}

          <SummaryCard
            title="Passed"
            value={passed}
            icon={
              <CheckCircle2
                size={22}
              />
            }
            iconClass="text-emerald-400"
            bgClass="bg-emerald-500/10"
          />


          {/* Failed */}

          <SummaryCard
            title="Failed"
            value={failed}
            icon={
              <XCircle
                size={22}
              />
            }
            iconClass="text-red-400"
            bgClass="bg-red-500/10"
          />

        </div>

      )}


      {/* =================================================
          INSPECTION ACTIVITY
      ================================================= */}

      <Card>

        <div className="mb-5">

          <div className="flex items-center gap-3">

            <Activity
              size={22}
              className="text-cyan-400"
            />

            <h2
              className="
                text-xl
                font-semibold
                text-white
              "
            >
              Inspection Activity
            </h2>

          </div>

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            Daily inspection activity across
            the current reporting period.
          </p>

        </div>


        {activityLoading ? (

          <Loader
            label="Loading activity..."
          />

        ) : (

          <div className="min-h-[300px]">

            <ActivityChart
              data={activity || []}
            />

          </div>

        )}

      </Card>


      {/* =================================================
          DEFECT + SEVERITY ANALYSIS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          gap-6
          xl:grid-cols-2
        "
      >


        {/* ===============================================
            DEFECT DISTRIBUTION
        =============================================== */}

        <Card>

          <div className="mb-5">

            <div className="flex items-center gap-3">

              <AlertTriangle
                size={22}
                className="text-orange-400"
              />

              <h2
                className="
                  text-xl
                  font-semibold
                  text-white
                "
              >
                Defect Distribution
              </h2>

            </div>

            <p
              className="
                mt-1
                text-sm
                text-slate-400
              "
            >
              Distribution of detected
              manufacturing defects.
            </p>

          </div>


          {defectLoading ? (

            <Loader
              label="Loading defect data..."
            />

          ) : defectData &&
            defectData.length > 0 ? (

            <div className="min-h-[320px]">

              <DefectPieChart
                data={defectData}
              />

            </div>

          ) : (

            <EmptyState
              message="No defect data available."
            />

          )}

        </Card>


        {/* ===============================================
            SEVERITY DISTRIBUTION
        =============================================== */}

        <Card>

          <div className="mb-5">

            <div className="flex items-center gap-3">

              <ShieldAlert
                size={22}
                className="text-red-400"
              />

              <h2
                className="
                  text-xl
                  font-semibold
                  text-white
                "
              >
                Severity Distribution
              </h2>

            </div>

            <p
              className="
                mt-1
                text-sm
                text-slate-400
              "
            >
              Distribution of detected
              defect severity levels.
            </p>

          </div>


          {severityLoading ? (

            <Loader
              label="Loading severity data..."
            />

          ) : severityData &&
            severityData.length > 0 ? (

            <div className="min-h-[320px]">

              <SeverityBarChart
                data={severityData}
              />

            </div>

          ) : (

            <EmptyState
              message="No severity data available."
            />

          )}

        </Card>

      </div>


      {/* =================================================
          QUALITY PERFORMANCE SUMMARY
      ================================================= */}

      <Card>

        <div className="mb-5">

          <div className="flex items-center gap-3">

            <TrendingUp
              size={22}
              className="text-cyan-400"
            />

            <h2
              className="
                text-xl
                font-semibold
                text-white
              "
            >
              Quality Performance
            </h2>

          </div>

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            Overall product inspection
            performance.
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-3
          "
        >

          {/* Pass Rate */}

          <PerformanceCard
            label="Pass Rate"
            value={`${passRate}%`}
            description="Products passed inspection"
            icon={
              <CheckCircle2 />
            }
            color="emerald"
          />


          {/* Fail Rate */}

          <PerformanceCard
            label="Fail Rate"
            value={`${failRate}%`}
            description="Products requiring attention"
            icon={
              <XCircle />
            }
            color="red"
          />


          {/* Confidence */}

          <PerformanceCard
            label="Average Confidence"
            value={`${stats?.average_confidence ?? 0}%`}
            description="Average AI prediction confidence"
            icon={
              <Activity />
            }
            color="cyan"
          />

        </div>

      </Card>


    </div>

  );

}


// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
  icon,
  iconClass,
  bgClass,
}) {

  return (

    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900/50
        p-5
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <div>

          <p
            className="
              text-sm
              text-slate-400
            "
          >
            {title}
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-white
            "
          >
            {value}
          </p>

        </div>


        <div
          className={`
            rounded-xl
            p-3
            ${bgClass}
            ${iconClass}
          `}
        >
          {icon}
        </div>

      </div>

    </div>

  );

}


// =========================================================
// PERFORMANCE CARD
// =========================================================

function PerformanceCard({
  label,
  value,
  description,
  icon,
  color,
}) {

  const styles = {

    emerald: {
      icon: "text-emerald-400",
      bg: "bg-emerald-500/10",
      value: "text-emerald-400",
    },

    red: {
      icon: "text-red-400",
      bg: "bg-red-500/10",
      value: "text-red-400",
    },

    cyan: {
      icon: "text-cyan-400",
      bg: "bg-cyan-500/10",
      value: "text-cyan-400",
    },

  };


  const style =
    styles[color] ||
    styles.cyan;


  return (

    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-950/40
        p-5
      "
    >

      <div
        className="
          flex
          items-start
          justify-between
        "
      >

        <div>

          <p
            className="
              text-sm
              text-slate-400
            "
          >
            {label}
          </p>

          <h3
            className={`
              mt-2
              text-3xl
              font-bold
              ${style.value}
            `}
          >
            {value}
          </h3>

          <p
            className="
              mt-2
              text-xs
              text-slate-500
            "
          >
            {description}
          </p>

        </div>


        <div
          className={`
            rounded-xl
            p-3
            ${style.bg}
            ${style.icon}
          `}
        >
          {icon}
        </div>

      </div>

    </div>

  );

}


// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({
  message,
}) {

  return (

    <div
      className="
        flex
        min-h-[300px]
        items-center
        justify-center
        rounded-xl
        border
        border-dashed
        border-slate-700
        text-sm
        text-slate-500
      "
    >

      {message}

    </div>

  );

}