export type Role = 'ADMIN' | 'QUALITY_ENGINEER' | 'SUPERVISOR' | 'OPERATOR';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  product_code: string;
  description?: string;
  production_line: string;
  critical_regions: any;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  batch_number: string;
  product_id: number;
  quantity: number;
  production_line: string;
  status: string;
  created_at: string;
  product?: Product;
}

export interface Inspection {
  id: number;
  product_id: number;
  batch_id?: number;
  image_path: string;
  processed_image_path?: string | null;
  ai_status: string;
  defect_type?: string;
  confidence?: number;
  severity_score?: number;
  severity_level?: string;
  ai_decision?: string;
  human_decision?: string;
  final_decision?: string;
  override_reason?: string;
  model_version?: string;
  model_status?: string;
  model_message?: string | null;
  processing_time_ms?: number;
  created_at: string;
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
  /** Actual defect type (e.g. broken_large) resolved via class_mapping.json. */
  label: string;
  defect_type?: string;
  suggested_defect_type?: string | null;
  classification_source?: string;
  category?: string;
  conf: number;
  area: number;
  assessment?: DefectAssessment;
  class_id?: number;
  /** Raw YOLO class name from model metadata (e.g. bottle_broken_large). */
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
  version: string;
  description?: string;
  dataset_version: string;
  map_score: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  is_active: boolean;
  training_date: string;
  created_at: string;
}
