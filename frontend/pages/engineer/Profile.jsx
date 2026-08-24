import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

import { dashboardService } from "../../services/dashboardService";

/* =========================================================
   DEFAULT STATISTICS
========================================================= */

const DEFAULT_STATS = {
  total_inspections: 0,
  passed: 0,
  failed: 0,
  pass_rate: 0,
  fail_rate: 0,
  average_confidence: 0,
};

/* =========================================================
   PROFILE
========================================================= */

export default function Profile() {
  const {
    user,
    logout,
    updateProfile,
  } = useAuth();

  const navigate = useNavigate();

  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     DASHBOARD STATISTICS
  ======================================================= */

  const [stats, setStats] = useState(DEFAULT_STATS);

  const [loadingStats, setLoadingStats] = useState(true);

  const [statsError, setStatsError] = useState("");

  /* =======================================================
     LOAD REAL QE STATISTICS
  ======================================================= */

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      const response =
        await dashboardService.getQEDashboard();

      console.log(
        "QE Profile Statistics:",
        response
      );

      setStats({
        ...DEFAULT_STATS,
        ...(response || {}),
      });

      setStatsError("");

    } catch (error) {
      console.error(
        "QE Profile Statistics Error:",
        error
      );

      setStatsError(
        "Unable to load inspection statistics."
      );

    } finally {
      setLoadingStats(false);
    }
  };

  /* =======================================================
     LOAD ON PAGE OPEN + AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    loadStats();

    const interval = setInterval(
      loadStats,
      10000
    );

    return () =>
      clearInterval(interval);
  }, []);

  /* =======================================================
     UPDATE FORM WHEN USER LOADS
  ======================================================= */

  useEffect(() => {
    setForm({
      name: user?.full_name || "",
      email: user?.email || "",
    });
  }, [user]);

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  async function handleSubmit(e) {
    e.preventDefault();

    setSaved(false);
    setError("");

    try {
      const updatedUser =
        await updateProfile(
          form.name,
          form.email
        );

      setForm({
        name: updatedUser.full_name,
        email: updatedUser.email,
      });

      setSaved(true);

    } catch (error) {
      console.error(
        "Profile update failed:",
        error
      );

      setError(
        error.message ||
        "Failed to update profile."
      );
    }
  }

  /* =======================================================
     RESET FORM
  ======================================================= */

  function handleReset() {
    setForm({
      name: user?.full_name || "",
      email: user?.email || "",
    });

    setSaved(false);
    setError("");
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function handleLogout() {
    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  }

  /* =======================================================
     REAL VALUES
  ======================================================= */

  const total =
    stats?.total_inspections ?? 0;

  const passed =
    stats?.passed ?? 0;

  const failed =
    stats?.failed ?? 0;

  const passRate =
    Number(
      stats?.pass_rate ?? 0
    );

  const failRate =
    Number(
      stats?.fail_rate ?? 0
    );

  const confidence =
    Number(
      stats?.average_confidence ?? 0
    );

  /* =======================================================
     ROLE
  ======================================================= */

  const role =
    user?.role ||
    "Quality Engineer";

  /* =======================================================
     ACCOUNT STATUS
  ======================================================= */

  const isActive =
    user?.active !== false;

  return (
    <div className="space-y-8">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-8 text-white shadow-2xl">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          {/* LEFT */}

          <div>

            <p className="uppercase tracking-[0.3em] text-cyan-100 text-xs font-bold">
              VisionInspect AI
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              My Profile
            </h1>

            <p className="mt-3 text-cyan-100 max-w-2xl">
              Manage your account information and
              monitor your real-time inspection statistics.
            </p>

          </div>

          {/* ACCOUNT STATUS */}

          <div className="rounded-2xl bg-white/10 backdrop-blur-lg px-6 py-5 border border-white/20">

            <p className="text-sm text-cyan-100">
              Account Status
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {isActive
                ? "Active"
                : "Inactive"}
            </h2>

            <div className="mt-3 flex items-center gap-2">

              <span
                className={`h-3 w-3 rounded-full ${
                  isActive
                    ? "bg-green-400 animate-pulse"
                    : "bg-red-400"
                }`}
              />

              <span
                className={
                  isActive
                    ? "text-green-200 font-semibold"
                    : "text-red-200 font-semibold"
                }
              >
                {isActive
                  ? "Online"
                  : "Inactive"}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ===================================================
          PROFILE CARD
      =================================================== */}

      <div className="rounded-3xl bg-white shadow-xl border border-slate-200 p-8">

        <div className="flex flex-col lg:flex-row items-center gap-8">

          {/* AVATAR */}

          <div className="relative">

            <div className="w-36 h-36 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl">

              {(
                form.name ||
                user?.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}

            </div>

            <span
              className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${
                isActive
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />

          </div>

          {/* DETAILS */}

          <div className="flex-1">

            <h2 className="text-3xl font-bold text-slate-900">
              {form.name ||
                "Quality Engineer"}
            </h2>

            <p className="mt-2 text-slate-500 text-lg">
              {form.email ||
                "No email available"}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">

              <span className="px-4 py-2 rounded-full bg-cyan-100 text-cyan-700 font-semibold">
                👤 {role}
              </span>

              <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-semibold">
                🟢{" "}
                {isActive
                  ? "Active"
                  : "Inactive"}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ===================================================
          REAL-TIME STATISTICS
      =================================================== */}

      <div>

        <div className="mb-5">

          <h2 className="text-2xl font-bold text-white">
            Inspection Statistics
          </h2>

          <p className="mt-1 text-slate-500">
            Live statistics from your VisionInspect AI inspection system.
          </p>

        </div>

        {statsError && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {statsError}
          </div>
        )}

        {loadingStats ? (

          <Loader
            label="Loading inspection statistics..."
          />

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            <StatCard
              title="Total Inspections"
              value={total}
              color="slate"
            />

            <StatCard
              title="Passed"
              value={passed}
              color="green"
            />

            <StatCard
              title="Failed"
              value={failed}
              color="red"
            />

            <StatCard
              title="Pass Rate"
              value={`${passRate}%`}
              color="cyan"
            />

          </div>

        )}

      </div>

      {/* ===================================================
          ADDITIONAL AI STATISTICS
      =================================================== */}

      {!loadingStats && (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* AI CONFIDENCE */}

          <div className="rounded-3xl bg-white shadow-lg border border-slate-200 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Average AI Confidence
                </p>

                <h2 className="mt-2 text-4xl font-bold text-cyan-600">
                  {confidence}%
                </h2>

              </div>

              <div className="h-14 w-14 rounded-2xl bg-cyan-100 flex items-center justify-center text-2xl">
                🤖
              </div>

            </div>

            <div className="mt-5 h-3 rounded-full bg-slate-200 overflow-hidden">

              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    confidence,
                    100
                  )}%`,
                }}
              />

            </div>

            <p className="mt-3 text-sm text-slate-500">
              Average confidence across completed AI inspections.
            </p>

          </div>

          {/* FAIL RATE */}

          <div className="rounded-3xl bg-white shadow-lg border border-slate-200 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Failure Rate
                </p>

                <h2 className="mt-2 text-4xl font-bold text-red-600">
                  {failRate}%
                </h2>

              </div>

              <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center text-2xl">
                ⚠️
              </div>

            </div>

            <div className="mt-5 h-3 rounded-full bg-slate-200 overflow-hidden">

              <div
                className="h-full rounded-full bg-red-500 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    failRate,
                    100
                  )}%`,
                }}
              />

            </div>

            <p className="mt-3 text-sm text-slate-500">
              Percentage of inspections that resulted in failure.
            </p>

          </div>

        </div>

      )}

      {/* ===================================================
          ACCOUNT INFORMATION
      =================================================== */}

      <Card>

        <div className="mb-8">

          <h2 className="text-2xl font-bold text-white">
            Account Information
          </h2>

          <p className="text-slate-500 mt-2">
            Update your account information.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* NAME */}

            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => {
                setForm({
                  ...form,
                  name: e.target.value,
                });

                setSaved(false);
                setError("");
              }}
            />

            {/* EMAIL */}

            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({
                  ...form,
                  email: e.target.value,
                });

                setSaved(false);
                setError("");
              }}
            />

            {/* ROLE */}

            <div>

              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Role
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                value={role}
                disabled
                readOnly
              />

            </div>

            {/* USER ID */}

            <div>

              <label className="block text-sm font-semibold text-slate-600 mb-2">
                User ID
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                value={
                  user?.id ??
                  "Not available"
                }
                disabled
                readOnly
              />

            </div>

            {/* ACCOUNT STATUS */}

            <div>

              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Account Status
              </label>

              <input
                className={`w-full rounded-xl border px-4 py-3 outline-none font-semibold ${
                  isActive
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-red-300 bg-red-50 text-red-700"
                }`}
                value={
                  isActive
                    ? "Active"
                    : "Inactive"
                }
                disabled
                readOnly
              />

            </div>

            {/* DEPARTMENT */}

            <div>

              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Department
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                value="Quality Assurance"
                disabled
                readOnly
              />

            </div>

          </div>

          {/* ERROR MESSAGE */}

          {error && (

            <div className="mt-6 rounded-xl bg-red-50 border border-red-300 p-4">

              <p className="text-red-700 font-semibold">
                ❌ {error}
              </p>

            </div>

          )}

          {/* SUCCESS MESSAGE */}

          {saved && (

            <div className="mt-6 rounded-xl bg-green-100 border border-green-300 p-4">

              <p className="text-green-700 font-semibold">
                ✅ Profile updated successfully.
              </p>

              <p className="mt-1 text-sm text-green-600">
                Your profile information has been saved to the database.
              </p>

            </div>

          )}

          {/* BUTTONS */}

          <div className="mt-8 flex flex-wrap gap-4">

            <Button type="submit">
              💾 Save Changes
            </Button>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100 transition"
            >
              Reset
            </button>

          </div>

        </form>

      </Card>

      {/* ===================================================
          PERFORMANCE
      =================================================== */}

      <Card>

        <div className="mb-6">

          <h2 className="text-2xl font-bold text-white">
            Inspection Performance
          </h2>

          <p className="text-slate-500 mt-2">
            Real quality metrics calculated from your inspection data.
          </p>

        </div>

        <div className="space-y-6">

          <ProgressMetric
            label="Quality Score"
            value={passRate}
            color="bg-cyan-500"
          />

          <ProgressMetric
            label="Pass Rate"
            value={passRate}
            color="bg-green-500"
          />

          <ProgressMetric
            label="AI Confidence"
            value={confidence}
            color="bg-purple-500"
          />

        </div>

      </Card>

      
      {/* ===================================================
          SECURITY
      =================================================== */}

      <Card>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">

          <div>

            <h2 className="text-2xl font-bold text-white">
              Security Settings
            </h2>

            <p className="text-slate-500 mt-2">
              Protect your VisionInspect AI account.
            </p>

          </div>

          <div className="flex flex-wrap gap-4">

            <button
              type="button"
              className="rounded-xl bg-slate-800 text-white px-6 py-3 hover:bg-slate-700 transition"
            >
              Change Password
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-600 text-white px-6 py-3 hover:bg-red-700 transition"
            >
              Logout
            </button>

          </div>

        </div>

      </Card>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  color,
}) {

  const colors = {
    slate: "text-slate-900",
    green: "text-green-600",
    red: "text-red-600",
    cyan: "text-cyan-600",
  };

  return (

    <div className="rounded-3xl bg-white shadow-lg border border-slate-200 p-6 transition hover:-translate-y-1 hover:shadow-xl">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <h2
        className={`mt-3 text-4xl font-bold ${
          colors[color] ||
          colors.slate
        }`}
      >
        {value}
      </h2>

    </div>
  );
}

/* =========================================================
   PROGRESS METRIC
========================================================= */

function ProgressMetric({
  label,
  value,
  color,
}) {

  const safeValue = Math.min(
    Math.max(
      Number(value) || 0,
      0
    ),
    100
  );

  return (

    <div>

      <div className="flex justify-between mb-2">

        <span className="font-medium text-slate-300">
          {label}
        </span>

        <span className="font-bold text-cyan-400">
          {safeValue.toFixed(2)}%
        </span>

      </div>

      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">

        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

    </div>
  );
}