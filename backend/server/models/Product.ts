import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  _id: string; // Primary key (e.g. "PRD-2026-101")
  productCode: string;
  batchId: string;
  sequence: number;
  name: string;
  status: "pending" | "passed" | "failed" | "in_review" | "Passed" | "Failed" | "Pending";
  confidence?: number | null;
  capturedAt: Date;
  primaryImageId?: string | null;
  findingCount: number;
  failedFindingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    _id: { type: String, required: true },
    productCode: { type: String, required: true },
    batchId: { type: String, ref: "InspectionBatch", required: true },
    sequence: { type: Number, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "passed", "failed", "in_review", "Passed", "Failed", "Pending"],
      default: "pending"
    },
    confidence: { type: Number, default: null },
    capturedAt: { type: Date, default: Date.now },
    primaryImageId: { type: String, ref: "InspectionImage", default: null },
    findingCount: { type: Number, default: 0 },
    failedFindingCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    _id: false
  }
);

ProductSchema.index({ batchId: 1, sequence: 1 }, { unique: true });
ProductSchema.index({ productCode: 1 });
ProductSchema.index({ batchId: 1, status: 1 });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
