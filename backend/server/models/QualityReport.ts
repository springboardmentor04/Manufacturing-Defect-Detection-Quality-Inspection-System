import mongoose, { Schema, Document } from "mongoose";

export interface IQualityReportMetrics {
  totalInspections: number;
  passRate: number;
  completionRate?: number;
  defectsPerThousand?: number;
  coverage?: number;
}

export interface IDefectMixItem {
  label: string;
  value: number;
  color: string;
}

export interface IQualityReport extends Document {
  _id: string; // Primary key (e.g. "REP-20260830-7D")
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  generatedBy?: string | null;
  metrics: IQualityReportMetrics;
  trend: number[];
  defectMix: IDefectMixItem[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const DefectMixSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    color: { type: String, required: true }
  },
  { _id: false }
);

const MetricsSchema = new Schema(
  {
    totalInspections: { type: Number, required: true },
    passRate: { type: Number, required: true },
    completionRate: { type: Number, default: 100 },
    defectsPerThousand: { type: Number, default: 0 },
    coverage: { type: Number, default: 100 }
  },
  { _id: false }
);

const QualityReportSchema = new Schema<IQualityReport>(
  {
    _id: { type: String, required: true },
    periodKey: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    generatedBy: { type: String, ref: "User", default: null },
    metrics: { type: MetricsSchema, required: true },
    trend: [{ type: Number }],
    defectMix: [{ type: DefectMixSchema }],
    summary: { type: String, required: true }
  },
  {
    timestamps: true,
    _id: false
  }
);

QualityReportSchema.index({ periodStart: 1, periodEnd: 1 });
QualityReportSchema.index({ periodKey: 1 });
QualityReportSchema.index({ generatedBy: 1 });

export const QualityReport =
  mongoose.models.QualityReport ||
  mongoose.model<IQualityReport>("QualityReport", QualityReportSchema, "qualityReports");
