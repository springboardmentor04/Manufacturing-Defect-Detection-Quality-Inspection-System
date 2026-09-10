export type Role = 'ADMIN' | 'QUALITY_ENGINEER' | 'SUPERVISOR' | 'FACTORY_SUPERVISOR' | 'OPERATOR';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: Role | string;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  product_code?: string | null;
  description?: string | null;
  production_line?: string | null;
  critical_regions?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Batch {
  id: number;
  batch_number: string;
  product_id: number;
  quantity?: number;
  production_line?: string;
  status?: string;
  created_at: string;
  product?: Product;
}

export type QualityDecisionType = 'PASS' | 'FAIL' | 'REVIEW' | 'REWORK';

export interface DetectionSchema {
  defect_type: string;
  confidence: number;
  bbox_x1: number;
  bbox_y1: number;
  bbox_x2: number;
  bbox_y2: number;
  area: number;
}

export interface QualityDecisionSchema {
  ai_decision: string;
  human_decision?: string | null;
  final_decision: string;
}

export interface Inspection {
  id: number;
  product_id?: number;
  batch_id?: number | null;
  operator_id?: number;
  model_version_id?: number | null;
  image_path?: string;
  processed_image_path?: string | null;
  ai_status?: string;
  defect_type?: string;
  confidence?: number;
  severity_score?: number;
  severity_level?: string;
  ai_decision?: QualityDecisionType | string;
  human_decision?: QualityDecisionType | string | null;
  final_decision?: QualityDecisionType | string;
  override_reason?: string;
  model_version?: string;
  model_status?: string;
  model_message?: string | null;
  processing_time_ms?: number;
  created_at: string;
  detections?: DetectionSchema[];
  quality_decision?: QualityDecisionSchema | null;
  bounding_boxes?: DefectDetection[];
  severity_components?: SeverityComponents;
  quality_assessment?: QualityAssessment;
  image_quality?: ImageQuality;
  product?: Product;
  batch?: Batch;
}

export interface ImageQuality {
  width: number;
  height: number;
  file_size_bytes: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  status: 'GOOD' | 'ACCEPTABLE' | 'POOR';
  warning?: string | null;
}

export interface SeverityComponents {
  size: number;
  confidence: number;
  type: number;
  location: number;
}

export interface DefectAssessment {
  size_score: number;
  location_score: number;
  type_score: number;
  confidence_score: number;
  severity_score: number;
  severity_level: string;
  quality_risk: string;
  quality_decision: string;
  recommended_action: string;
  manual_review_required: boolean;
}

export interface DefectDetection {
  box: [number, number, number, number];
  label: string;
  defect_type?: string;
  suggested_defect_type?: string | null;
  classification_source?: string;
  category?: string;
  conf: number;
  area: number;
  assessment?: DefectAssessment;
  class_id?: number;
  class_name?: string;
  product_category?: string | null;
  defect_present?: boolean;
  defect_display_name?: string;
  detection_confidence?: number;
  classification_confidence?: number;
}

export interface QualityAssessment {
  overall_result: string;
  highest_severity: string;
  quality_risk: string;
  defect_count: number;
  recommended_action: string;
  manual_review_required: boolean;
}

export interface ModelVersion {
  id: number;
  name?: string;
  version: string;
  dataset?: string;
  dataset_version?: string;
  description?: string;
  precision?: number | null;
  recall?: number | null;
  f1_score?: number | null;
  map_score?: number | null;
  precision_score?: number | null;
  recall_score?: number | null;
  status?: string;
  is_active?: boolean;
  training_date?: string;
  created_at?: string;
}

export interface Report {
  id: number;
  report_type: string;
  date_range: string;
  generated_by: number;
  file_path: string;
  created_at: string;
}

export interface AnalyticsOverview {
  total_inspections: number;
  total_defects: number;
  defect_rate: number;
  pass_rate: number;
  reject_rate: number;
  average_severity: number;
  critical_defects: number;
}
