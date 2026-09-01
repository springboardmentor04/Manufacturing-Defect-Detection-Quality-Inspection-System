import mongoose, { Schema, Document } from "mongoose";

export interface IManualReview extends Document {
  _id: string; // Primary key (e.g. "REV-4821-1")
  batchId: string;
  productId: string;
  findingId?: string | null;
  reviewerId: string;
  status: "reviewed" | "accepted" | "rejected" | "rework" | "pending";
  decision: string;
  note?: string | null;
  reviewedAt: Date;
  reviewVersion: number;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ManualReviewSchema = new Schema<IManualReview>(
  {
    _id: { type: String, required: true },
    batchId: { type: String, ref: "InspectionBatch", required: true },
    productId: { type: String, ref: "Product", required: true },
    findingId: { type: String, ref: "Finding", default: null },
    reviewerId: { type: String, ref: "User", required: true },
    status: {
      type: String,
      enum: ["reviewed", "accepted", "rejected", "rework", "pending"],
      default: "pending"
    },
    decision: { type: String, required: true },
    note: { type: String, default: null },
    reviewedAt: { type: Date, default: Date.now },
    reviewVersion: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    _id: false
  }
);

ManualReviewSchema.index({ batchId: 1, productId: 1 });
ManualReviewSchema.index({ reviewerId: 1, reviewedAt: -1 });

export const ManualReview =
  mongoose.models.ManualReview ||
  mongoose.model<IManualReview>("ManualReview", ManualReviewSchema, "manualReviews");
