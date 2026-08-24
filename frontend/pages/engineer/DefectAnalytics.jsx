import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

import { analyticsService } from "../../services/analyticsService";


export default function DefectAnalytics() {

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // ========================================================
  // LOAD ANALYTICS
  // ========================================================

  useEffect(() => {

    loadAnalytics();

  }, []);


  async function loadAnalytics() {

    try {

      setLoading(true);

      setError("");

      const data =
        await analyticsService.getDefectAnalytics();

      setAnalytics(data);

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        "Unable to load analytics."
      );

    } finally {

      setLoading(false);

    }
  }


  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {

    return (

      <div className="flex min-h-[400px] items-center justify-center">

        <div className="text-center">

          <Activity
            size={42}
            className="mx-auto mb-4 animate-pulse text-cyan-400"
          />

          <p className="text-slate-400">
            Loading defect analytics...
          </p>

        </div>

      </div>

    );
  }


  // ========================================================
  // ERROR
  // ========================================================

  if (error) {

    return (

      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">

        <div className="flex items-center gap-3">

          <AlertTriangle
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
          className="mt-5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
        >
          Retry
        </button>

      </div>

    );
  }


  if (!analytics) {
    return null;
  }


  // ========================================================
  // TREND DATA
  // ========================================================

  const trendData =
    analytics.daily_trend || [];


  // ========================================================
  // TOP DEFECT DATA
  // ========================================================

  const topDefects =
    analytics.top_defects || [];


  // ========================================================
  // SEVERITY DATA
  // ========================================================

  const severity =
    analytics.severity_distribution || {};


  const severityData = [

    {
      name: "Critical",
      count: severity.Critical || 0,
    },

    {
      name: "High",
      count: severity.High || 0,
    },

    {
      name: "Medium",
      count: severity.Medium || 0,
    },

    {
      name: "Low",
      count: severity.Low || 0,
    },

  ];


  return (

    <div className="space-y-8">


      {/* ====================================================
          HEADER
      ==================================================== */}

      <div>

        <div className="flex items-center gap-3">

          <BarChart3
            size={34}
            className="text-cyan-400"
          />

          <div>

            <h1 className="text-3xl font-bold text-white">
              Defect Analytics
            </h1>

            <p className="mt-1 text-slate-400">
              Quality inspection trends and defect analysis.
            </p>

          </div>

        </div>

      </div>


      {/* ====================================================
          KPI CARDS
      ==================================================== */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">


        <MetricCard
          icon={<Activity />}
          label="Total Inspections"
          value={analytics.total_inspections}
        />


        <MetricCard
          icon={<CheckCircle />}
          label="Passed"
          value={analytics.passed}
          valueClass="text-emerald-400"
        />


        <MetricCard
          icon={<XCircle />}
          label="Failed"
          value={analytics.failed}
          valueClass="text-red-400"
        />


        <MetricCard
          icon={<ShieldAlert />}
          label="Defect Rate"
          value={`${analytics.defect_rate}%`}
          valueClass="text-orange-400"
        />

      </div>


      {/* ====================================================
          PASS / FAIL SUMMARY
      ==================================================== */}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">


        <SummaryCard
          label="Pass Rate"
          value={`${analytics.pass_rate}%`}
        />


        <SummaryCard
          label="Total Defects"
          value={analytics.total_defects}
        />


        <SummaryCard
          label="Pending"
          value={analytics.pending}
        />

      </div>


      {/* ====================================================
          INSPECTION TREND
      ==================================================== */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

        <div className="mb-6">

          <h2 className="text-xl font-semibold text-white">
            📈 Inspection Trend
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Daily inspection results.
          </p>

        </div>


        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={trendData}
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
                stroke="#94a3b8"
              />

              <Tooltip />

              <Legend />


              <Line
                type="monotone"
                dataKey="passed"
                name="Passed"
                stroke="#10b981"
                strokeWidth={3}
              />


              <Line
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#ef4444"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </section>


      {/* ====================================================
          DEFECT + SEVERITY
      ==================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">


        {/* DEFECT DISTRIBUTION */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

          <div className="mb-6">

            <h2 className="text-xl font-semibold text-white">
              🔎 Top Defects
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Most frequently detected defects.
            </p>

          </div>


          <div className="h-[350px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={topDefects.slice(0, 8)}
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
                  stroke="#94a3b8"
                />

                <YAxis
                  type="category"
                  dataKey="defect_type"
                  width={150}
                  stroke="#94a3b8"
                  tick={{
                    fontSize: 11,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Defects"
                  fill="#06b6d4"
                  radius={[0, 5, 5, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>


        {/* SEVERITY */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

          <div className="mb-6">

            <h2 className="text-xl font-semibold text-white">
              ⚠️ Severity Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Distribution of detected severity levels.
            </p>

          </div>


          <div className="h-[350px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={severityData}
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
                  stroke="#94a3b8"
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Inspections"
                  fill="#f97316"
                  radius={[5, 5, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>

      </div>


      {/* ====================================================
          TOP DEFECT TABLE
      ==================================================== */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

        <div className="mb-6">

          <h2 className="text-xl font-semibold text-white">
            🏆 Defect Ranking
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Ranked breakdown of detected defects.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead>

              <tr className="border-b border-slate-800 text-sm text-slate-400">

                <th className="px-4 py-3">
                  Rank
                </th>

                <th className="px-4 py-3">
                  Defect Type
                </th>

                <th className="px-4 py-3">
                  Count
                </th>

                <th className="px-4 py-3">
                  Percentage
                </th>

              </tr>

            </thead>


            <tbody>

              {topDefects.map(
                (defect, index) => (

                  <tr
                    key={defect.defect_type}
                    className="border-b border-slate-800/70"
                  >

                    <td className="px-4 py-4 font-semibold text-cyan-400">
                      #{index + 1}
                    </td>

                    <td className="px-4 py-4 text-white">
                      {defect.defect_type}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {defect.count}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {defect.percentage}%
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


    </div>

  );
}


/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({
  icon,
  label,
  value,
  valueClass = "text-white",
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
          {icon}
        </div>

        <p className="text-sm text-slate-400">
          {label}
        </p>

      </div>

      <h3
        className={`mt-4 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </h3>

    </div>

  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  label,
  value,
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">

      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>

    </div>

  );
}