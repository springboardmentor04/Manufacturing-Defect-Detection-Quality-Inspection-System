import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Cpu,
  Activity,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { useEffect, useState } from "react";

import { dashboardService } from "../../services/dashboardService";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";


// =========================================================
// SUPERVISOR ANALYTICS
// =========================================================

export default function Analytics() {

  // =======================================================
  // STATE
  // =======================================================

  const [stats, setStats] = useState(null);

  const [activity, setActivity] = useState([]);

  const [defects, setDefects] = useState([]);

  const [severity, setSeverity] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // =======================================================
  // LOAD ANALYTICS DATA
  // =======================================================

  useEffect(() => {

    loadAnalytics();

  }, []);


  async function loadAnalytics() {

    try {

      setLoading(true);
      setError("");

      const [
        statsData,
        activityData,
        defectData,
        severityData,
      ] = await Promise.all([

        dashboardService.getStats(),

        dashboardService.getActivity(),

        dashboardService.getDefectDistribution(),

        dashboardService.getSeverityDistribution(),

      ]);


      setStats(statsData);

      setActivity(
        Array.isArray(activityData)
          ? activityData
          : []
      );

      setDefects(
        Array.isArray(defectData)
          ? defectData
          : []
      );

      setSeverity(
        Array.isArray(severityData)
          ? severityData
          : []
      );

    } catch (err) {

      console.error(
        "Analytics loading error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load analytics data."
      );

    } finally {

      setLoading(false);

    }

  }


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (
      <Loader
        label="Loading supervisor analytics..."
      />
    );

  }


  // =======================================================
  // ERROR
  // =======================================================

  if (error) {

    return (

      <div className="space-y-6">

        <div
          className="
            rounded-2xl
            border
            border-red-500/30
            bg-red-500/10
            p-6
          "
        >

          <div className="flex items-center gap-3">

            <AlertTriangle
              size={24}
              className="text-red-400"
            />

            <div>

              <h2 className="font-semibold text-red-400">
                Analytics Error
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {error}
              </p>

            </div>

          </div>


          <button
            onClick={loadAnalytics}
            className="
              mt-5
              rounded-lg
              bg-cyan-600
              px-5
              py-2
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-cyan-700
            "
          >
            Retry
          </button>

        </div>

      </div>

    );

  }


  if (!stats) {
    return null;
  }


  // =======================================================
  // CALCULATE RATES FROM COUNTS
  // =======================================================
  //
  // IMPORTANT:
  // We calculate these ourselves instead of directly
  // displaying stats.fail_rate.
  //
  // Example:
  //
  // Total = 59
  // Failed = 42
  //
  // 42 / 59 * 100 = 71.19%
  //
  // =======================================================

  const totalInspections =
    Number(stats.total_inspections) || 0;

  const passed =
    Number(stats.passed) || 0;

  const failed =
    Number(stats.failed) || 0;


  const calculatedPassRate =
    totalInspections > 0
      ? ((passed / totalInspections) * 100).toFixed(2)
      : "0.00";


  const calculatedFailRate =
    totalInspections > 0
      ? ((failed / totalInspections) * 100).toFixed(2)
      : "0.00";


  const averageConfidence =
    Number(stats.average_confidence) || 0;


  // =======================================================
  // DEFECT CHART DATA
  // =======================================================

  const defectChartData = defects

    // No Defect is not an actual defect
    .filter(
      (item) =>
        item.name !== "No Defect"
    )

    // Normalize old class labels
    .map((item) => ({

      name:
        normalizeDefectName(
          item.name
        ),

      value:
        Number(item.value) || 0,

    }))

    // Combine duplicate defect names
    .reduce(
      (acc, item) => {

        const existing =
          acc.find(
            (x) =>
              x.name === item.name
          );

        if (existing) {

          existing.value +=
            item.value;

        } else {

          acc.push({
            ...item,
          });

        }

        return acc;

      },
      []
    )

    // Highest defects first
    .sort(
      (a, b) =>
        b.value - a.value
    )

    // Show top 10
    .slice(0, 10);


  // =======================================================
  // SEVERITY CHART DATA
  // =======================================================

  const severityChartData = severity

    // "None" means no severity / passed inspection
    .filter(
      (item) =>
        item.severity !== "None"
    )

    .map((item) => ({

      name:
        item.severity,

      value:
        Number(item.count) || 0,

    }));


  // =======================================================
  // HIGH + CRITICAL COUNT
  // =======================================================

  const highRiskCount =
    getHighRiskCount(
      severity
    );


  // =======================================================
  // RENDER
  // =======================================================

  return (

    <div className="space-y-8">


      {/* =================================================
          HEADER
      ================================================= */}

      <div>

        <div className="flex items-center gap-3">

          <Activity
            size={34}
            className="text-cyan-400"
          />

          <div>

            <h1
              className="
                text-3xl
                font-bold
                text-white
              "
            >
              Supervisor Analytics
            </h1>

            <p
              className="
                mt-2
                text-slate-400
              "
            >
              Real-time manufacturing
              inspection performance
              and quality statistics.
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          KPI CARDS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          gap-6
          md:grid-cols-2
          xl:grid-cols-3
        "
      >

        {/* Total */}

        <AnalyticsCard
          title="Total Inspections"
          value={totalInspections}
          icon={
            <ClipboardCheck />
          }
          color="cyan"
        />


        {/* Passed */}

        <AnalyticsCard
          title="Passed"
          value={passed}
          icon={
            <CheckCircle2 />
          }
          color="green"
        />


        {/* Failed */}

        <AnalyticsCard
          title="Failed"
          value={failed}
          icon={
            <XCircle />
          }
          color="red"
        />


        {/* Pass Rate */}

        <AnalyticsCard
          title="Pass Rate"
          value={`${calculatedPassRate}%`}
          icon={
            <TrendingUp />
          }
          color="emerald"
        />


        {/* Fail Rate */}

        <AnalyticsCard
          title="Fail Rate"
          value={`${calculatedFailRate}%`}
          icon={
            <TrendingDown />
          }
          color="orange"
        />


        {/* Average Confidence */}

        <AnalyticsCard
          title="Average Confidence"
          value={`${averageConfidence}%`}
          icon={
            <Cpu />
          }
          color="blue"
        />

      </div>


      {/* =================================================
          WEEKLY INSPECTION ACTIVITY
      ================================================= */}

      <Card>

        <div className="mb-6">

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
              Weekly Inspection Activity
            </h2>

          </div>

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            Number of inspections
            performed each day.
          </p>

        </div>


        <div className="h-[330px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={activity}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
              />

              <XAxis
                dataKey="date"
                stroke="#94a3b8"
              />

              <YAxis
                allowDecimals={false}
                stroke="#94a3b8"
              />

              <Tooltip
                contentStyle={{
                  backgroundColor:
                    "#0f172a",
                  border:
                    "1px solid #334155",
                  borderRadius:
                    "10px",
                  color: "#fff",
                }}
              />

              <Line
                type="monotone"
                dataKey="count"
                name="Inspections"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </Card>


      {/* =================================================
          DEFECT + SEVERITY
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

          <div className="mb-6">

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
              Most frequently detected
              manufacturing defects.
            </p>

          </div>


          {defectChartData.length > 0 ? (

            <div className="h-[380px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={defectChartData}
                  layout="vertical"
                  margin={{
                    left: 20,
                    right: 20,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    stroke="#94a3b8"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "#0f172a",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "10px",
                      color: "#fff",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="Defects"
                    fill="#06b6d4"
                    radius={[
                      0,
                      5,
                      5,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <EmptyChart
              message="No defect data available."
            />

          )}

        </Card>


        {/* ===============================================
            SEVERITY DISTRIBUTION
        =============================================== */}

        <Card>

          <div className="mb-6">

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
              Detected defect severity
              levels.
            </p>

          </div>


          {severityChartData.length > 0 ? (

            <div className="h-[380px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={severityChartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke="#94a3b8"
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "#0f172a",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "10px",
                      color: "#fff",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="Inspections"
                    fill="#f97316"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <EmptyChart
              message="No severity data available."
            />

          )}

        </Card>

      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          gap-5
          md:grid-cols-3
        "
      >

        {/* Total Defects */}

        <SummaryCard
          title="Total Defects"
          value={failed}
          icon={
            <AlertTriangle />
          }
        />


        {/* High + Critical */}

        <SummaryCard
          title="High + Critical"
          value={highRiskCount}
          icon={
            <ShieldAlert />
          }
        />


        {/* Average Confidence */}

        <SummaryCard
          title="Average Confidence"
          value={`${averageConfidence}%`}
          icon={
            <Cpu />
          }
        />

      </div>

    </div>

  );

}


// =========================================================
// ANALYTICS CARD
// =========================================================

function AnalyticsCard({
  title,
  value,
  icon,
  color,
}) {

  const colors = {

    cyan:
      "text-cyan-400",

    green:
      "text-green-400",

    red:
      "text-red-400",

    emerald:
      "text-emerald-400",

    orange:
      "text-orange-400",

    blue:
      "text-blue-400",

  };


  return (

    <Card>

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
              text-slate-400
            "
          >
            {title}
          </p>

          <h2
            className="
              mt-3
              text-4xl
              font-bold
              text-white
            "
          >
            {value}
          </h2>

        </div>


        <div
          className={`text-4xl ${colors[color]}`}
        >
          {icon}
        </div>

      </div>

    </Card>

  );

}


// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
  icon,
}) {

  return (

    <Card>

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

          <h3
            className="
              mt-2
              text-2xl
              font-bold
              text-white
            "
          >
            {value}
          </h3>

        </div>


        <div
          className="
            rounded-xl
            bg-cyan-500/10
            p-3
            text-cyan-400
          "
        >
          {icon}
        </div>

      </div>

    </Card>

  );

}


// =========================================================
// EMPTY CHART
// =========================================================

function EmptyChart({
  message,
}) {

  return (

    <div
      className="
        flex
        h-[380px]
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


// =========================================================
// DEFECT NAME NORMALIZER
// =========================================================

function normalizeDefectName(
  defectName
) {

  if (!defectName) {
    return "Unknown";
  }


  const mapping = {

    "class_3":
      "Cable - Bent Wire",

    "class_4":
      "Cable - Cable Swap",

    "class_36":
      "Metal Nut - Color",

    "class_38":
      "Metal Nut - Scratch",

    "Unknown Defect (Class 36)":
      "Metal Nut - Color",

  };


  return (
    mapping[defectName]
    || defectName
  );

}


// =========================================================
// HIGH + CRITICAL COUNT
// =========================================================

function getHighRiskCount(
  severity
) {

  return severity

    .filter(
      (item) =>
        item.severity === "High"
        ||
        item.severity === "Critical"
    )

    .reduce(
      (
        total,
        item
      ) =>
        total +
        (Number(item.count) || 0),
      0
    );

}