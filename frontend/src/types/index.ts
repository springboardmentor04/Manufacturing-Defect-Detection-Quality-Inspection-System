export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'QUALITY_ENGINEER' | 'FACTORY_SUPERVISOR' | 'ADMIN';
  created_at: string;
}

export type UserProfile = User;

export interface UserRegisterData {
  email: string;
  full_name: string;
  role: 'QUALITY_ENGINEER' | 'FACTORY_SUPERVISOR' | 'ADMIN';
  password: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: 'bearer';
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface ReportResult {
  inspection_id: string;
  generated_at: string;
  metrics_summary: Record<string, number>;
  download_url?: string;
}

export type DefectType = 'Scratch' | 'Crack' | 'Dent' | 'Missing Component' | 'Surface Defect' | string;

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: DefectType;
  confidence: number;
}

export interface DefectItem {
  id: string;
  defect_type: DefectType;
  size_mm2: number;
  location_type: 'Cosmetic' | 'Functional';
  confidence: number;
  severity_score: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE' | string;
  bounding_box: BoundingBox;
}

export interface InspectionResult {
  id: string;
  image_url: string;
  status: 'PASSED' | 'FAILED' | 'REJECTED' | 'FLAGGED' | 'NEEDS_REVIEW' | 'PASS' | 'FAIL';
  confidence: number;
  severity_score: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE' | 'Low' | 'Medium' | 'High' | 'Critical' | string;
  defects: DefectItem[];
  summary: string;
  recommendation: string;
  created_at: string;
  engine?: string;
}

export interface AnalyticsSummary {
  total_inspections: number;
  pass_rate_percentage: number;
  defect_breakdown: Record<DefectType, number>;
  average_severity: number;
  recent_inspections: InspectionResult[];
}
