import { api } from "./api";

export const dashboardService = {

  // =========================================================
  // General Dashboard
  // =========================================================

  getStats: () =>
    api.get("/dashboard/analytics"),

  getActivity: () =>
    api.get("/dashboard/activity"),

  getDefectDistribution: () =>
    api.get("/dashboard/defect-distribution"),

  getSeverityDistribution: () =>
    api.get("/dashboard/severity-distribution"),


  // =========================================================
  // Quality Engineer
  // =========================================================

  getQEDashboard: () =>
    api.get("/qe/dashboard"),

  getQEReports: () =>
    api.get("/qe/reports/"),

  getQEProductionReport: () =>
    api.get("/qe/reports/production"),

  getQEDefectAnalytics: () =>
    api.get("/qe/analytics/defects"),


  // =========================================================
  // Supervisor
  // =========================================================

  getUsers: () =>
    api.get("/supervisor/users/"),

  getProductionQualityReport: (
    startDate = "",
    endDate = ""
  ) =>
    api.get("/supervisor/reports/production", {
      params: {
        ...(startDate && {
          start_date: startDate,
        }),

        ...(endDate && {
          end_date: endDate,
        }),
      },
    }),

};