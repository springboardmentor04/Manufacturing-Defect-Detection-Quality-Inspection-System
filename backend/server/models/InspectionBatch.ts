import mongoose, { Schema, Document } from "mongoose";

export interface IInspectionBatch extends Document {
  _id: string; // Primary key (e.g. "BT-4108")
  batchCode: string;
  name: string;
  line: string;
  createdBy?: string | null;
  status: "queued" | "processing" | "in_review" | "complete" | "failed" | "Hold for review" | "Review queued" | "Passed" | "In review" | "Complete";
  capturedAt: Date;
  completedAt?: Date | null;
  itemCount: number;
  flagCount: number;
  reviewedCount: number;
  reviewRequired: boolean;
  verdict: "Pass" | "Fail" | "Pending" | "Hold" | "Review";
  overallSeverity?: string | null;
  overallSeverityScore?: number | null;
  overallConfidence?: number | null;
  mode?: string;
  sortOrder?: number;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const InspectionBatchSchema = new Schema<IInspectionBatch>(
  {
    _id: { type: String, required: true },
    batchCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    line: { type: String, required: true },
    createdBy: { type: String, ref: "User", default: null },
    status: {
      type: String,
      enum: ["queued", "processing", "in_review", "complete", "failed", "Hold for review", "Review queued", "Passed", "In review", "Complete"],
      default: "queued"
    },
    capturedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    itemCount: { type: Number, default: 0 },
    flagCount: { type: Number, default: 0 },
    reviewedCount: { type: Number, default: 0 },
    reviewRequired: { type: Boolean, default: true },
    verdict: {
      type: String,
      enum: ["Pass", "Fail", "Pending", "Hold", "Review"],
      default: "Pending"
    },
    overallSeverity: { type: String, default: null },
    overallSeverityScore: { type: Number, default: null },
    overallConfidence: { type: Number, default: null },
    mode: { type: String, default: "Detection + segmentation" },
    sortOrder: { type: Number, default: 0 },
    failureReason: { type: String, default: null }
  },
  {
    timestamps: true,
    _id: false // Disable auto ObjectId generation for _id
  }
);

InspectionBatchSchema.index({ capturedAt: -1 });
InspectionBatchSchema.index({ status: 1, capturedAt: -1 });
InspectionBatchSchema.index({ line: 1, capturedAt: -1 });

export const InspectionBatch =
  mongoose.models.InspectionBatch ||
  mongoose.model<IInspectionBatch>("InspectionBatch", InspectionBatchSchema, "inspectionBatches");
