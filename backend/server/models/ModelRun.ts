import mongoose, { Schema, Document } from "mongoose";

export interface IModelRun extends Document {
  _id: string; // Primary key (e.g. "RUN-CNN-4821")
  batchId: string;
  productId: string;
  inputImageId?: string | null;
  modelType: "cnn" | "unet" | "yolo" | "detection" | "segmentation";
  modelVersion: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date | null;
  overallConfidence?: number | null;
  outputImageIds: string[];
  rawOutput?: Record<string, any> | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ModelRunSchema = new Schema<IModelRun>(
  {
    _id: { type: String, required: true },
    batchId: { type: String, ref: "InspectionBatch", required: true },
    productId: { type: String, ref: "Product", required: true },
    inputImageId: { type: String, ref: "InspectionImage", default: null },
    modelType: {
      type: String,
      enum: ["cnn", "unet", "yolo", "detection", "segmentation"],
      required: true
    },
    modelVersion: { type: String, default: "v1.0.0" },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued"
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    overallConfidence: { type: Number, default: null },
    outputImageIds: [{ type: String, ref: "InspectionImage" }],
    rawOutput: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null }
  },
  {
    timestamps: true,
    _id: false
  }
);

ModelRunSchema.index({ productId: 1, modelType: 1, createdAt: -1 });
ModelRunSchema.index({ batchId: 1, createdAt: -1 });

export const ModelRun =
  mongoose.models.ModelRun ||
  mongoose.model<IModelRun>("ModelRun", ModelRunSchema, "modelRuns");
