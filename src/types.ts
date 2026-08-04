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
  defectType: string;
  confidence: number;
  sizeScore: number;
  locationScore: number;
  boundingBox: BoundingBox;
}

export interface PreprocessingOptions {
  noiseRemoval: boolean;
  claheContrast: boolean;
  edgeDetection: boolean;
  roiCrop: boolean;
}

export interface InspectionRecord {
  id: string;
  inspectionCode: string;
  productName: string;
  productCategory: string;
  factoryLine: string;
  imageUrl: string;
  processedImageUrl?: string;
  severityScore: number;
  severityLevel: SeverityLevel;
  passFail: PassFailResult;
  inspectorName: string;
  timestamp: string;
  defects: DefectItem[];
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
