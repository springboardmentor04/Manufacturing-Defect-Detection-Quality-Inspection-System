export type DashboardStatus = "Pass" | "Fail" | "Processing";

export type InspectionRecord = {
  id: string;
  productName: string;
  line: string;
  status: DashboardStatus;
  category: string;
  severity: "Low" | "Medium" | "High";
  score: number;
  uploadedAt: string;
  defectType: string;
  confidence: number;
};

export type ReportCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend: string;
};

export type TrendPoint = {
  name: string;
  passRate: number;
  failRate: number;
  defects: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  severity: "Informational" | "Alert" | "Critical";
};
