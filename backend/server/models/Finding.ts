import mongoose, { Schema, Document } from "mongoose";

export interface IBoundingBox {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface IFinding extends Document {
  _id: string; // Primary key (e.g. "IR-4821")
  batchId: string;
  productId: string;
  modelRunId?: string | null;
  findingCode: string;
  defectType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  severityScore: number;
  confidence: number;
  defectArea?: string;
  decision?: string;
  boundingBox?: IBoundingBox | null;
  segmentationMaskImageId?: string | null;
  gradcamImageId?: string | null;
  boundingBoxImageId?: string | null;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BoundingBoxSchema = new Schema(
  {
    left: { type: String, required: true },
    top: { type: String, required: true },
    width: { type: String, required: true },
    height: { type: String, required: true }
  },
  { _id: false }
);

const FindingSchema = new Schema<IFinding>(
  {
    _id: { type: String, required: true },
    batchId: { type: String, ref: "InspectionBatch", required: true },
    productId: { type: String, ref: "Product", required: true },
    modelRunId: { type: String, ref: "ModelRun", default: null },
    findingCode: { type: String, required: true },
    defectType: { type: String, required: true },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low"
    },
    severityScore: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    defectArea: { type: String, default: "0.0%" },
    decision: { type: String, default: "Review queued" },
    boundingBox: { type: BoundingBoxSchema, default: null },
    segmentationMaskImageId: { type: String, ref: "InspectionImage", default: null },
    gradcamImageId: { type: String, ref: "InspectionImage", default: null },
    boundingBoxImageId: { type: String, ref: "InspectionImage", default: null },
    isFlagged: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    _id: false
  }
);

FindingSchema.index({ productId: 1, isFlagged: 1, severity: 1 });
FindingSchema.index({ batchId: 1, isFlagged: 1 });
FindingSchema.index({ findingCode: 1 });

export const Finding =
  mongoose.models.Finding ||
  mongoose.model<IFinding>("Finding", FindingSchema);
