import type { ActivityItem, InspectionRecord, ReportCard, TrendPoint } from "@/components/dashboards/dashboard-types";

export const qualityReports: ReportCard[] = [
  { id: "daily", label: "Daily report", value: "98.4%", detail: "Pass rate today", trend: "+2.1%" },
  { id: "weekly", label: "Weekly report", value: "97.8%", detail: "12k units reviewed", trend: "+1.4%" },
  { id: "monthly", label: "Monthly report", value: "96.9%", detail: "Defect rate improved", trend: "+0.8%" },
];

export const inspectionHistory: InspectionRecord[] = [];

export const trendData: TrendPoint[] = [
  { name: "Mon", passRate: 96, failRate: 4, defects: 18 },
  { name: "Tue", passRate: 97, failRate: 3, defects: 14 },
  { name: "Wed", passRate: 95, failRate: 5, defects: 22 },
  { name: "Thu", passRate: 98, failRate: 2, defects: 11 },
  { name: "Fri", passRate: 99, failRate: 1, defects: 7 },
];

export const productionActivity: ActivityItem[] = [
  { id: "a1", title: "Line 03 completed shift review", subtitle: "2 inspections flagged", timestamp: "8 min ago", severity: "Informational" },
  { id: "a2", title: "Alert on Line 07", subtitle: "Surface finish variance above threshold", timestamp: "18 min ago", severity: "Alert" },
  { id: "a3", title: "Critical defect cluster", subtitle: "Connector misalignment across 3 units", timestamp: "42 min ago", severity: "Critical" },
];
