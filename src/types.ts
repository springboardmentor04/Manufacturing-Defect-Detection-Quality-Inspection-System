export type UserRole = 'quality_engineer' | 'factory_supervisor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedLine?: string;
}

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type PassFailResult = 'PASS' | 'FAIL';

export interface BoundingBox {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface DefectItem {
  classId: number;
  className: string;
  defectType: string;
  confidence: number;
  confidenceScore: number;
  sizeScore: number;
  locationScore: number;
  typeScore: number;
  severityScore: number;
  pixelBoundingBox: { x1: number; y1: number; x2: number; y2: number };
  boundingBox: BoundingBox;
}

export interface PreprocessingOptions {
  noiseRemoval: boolean;
  claheContrast: boolean;
  edgeDetection: boolean;
  roiCrop: boolean;
}

export interface Product {
  id: string;
  productName: string;
  productCode: string;
  category: string;
  manufacturer: string;
  factoryLine: string;
  status: string;
  createdAt?: string;
}

export interface InspectionRecord {
  id: string;
  inspectionCode: string;
  productId: string;
  productName: string;
  productCategory: string;
  factoryLine: string;
  inspectorId: string;
  imageUrl: string;
  processedImageUrl?: string;
  severityScore: number;
  severityLevel: SeverityLevel;
  passFail: PassFailResult;
  inspectorName: string;
  timestamp: string;
  defects: DefectItem[];
  imageWidth: number;
  imageHeight: number;
  preprocessingUsed: PreprocessingOptions;
  model: { architecture: string; weights: string; confidence_threshold: number; detections: number };
  recommendation: string;
  comments?: string;
}

export interface AnalyticsSummary {
  totalInspectedToday: number;
  passedCount: number;
  failedCount: number;
  yieldRatePercent: number;
  activeFactoryLines: number;
  qualityThresholds: {
    criticalSeverityLimit: number;
    highSeverityLimit: number;
    mediumSeverityLimit: number;
    autoApprovePass: boolean;
  };
  defectDistribution: {
    type: string;
    count: number;
    share: number;
  }[];
  hourlyYieldTrend: {
    hour: string;
    passRate: number;
    total: number;
  }[];
}

export interface MVTecSample {
  id: string;
  productName: string;
  productCategory: string;
  imageUrl: string;
  defaultDefectType: string;
  description: string;
  expectedSeverity: SeverityLevel;
}
