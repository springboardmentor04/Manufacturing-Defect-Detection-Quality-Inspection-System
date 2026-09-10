import mongoose, { Schema, Document } from "mongoose";

export interface IInspectionImage extends Document {
  _id: string; // Primary key (e.g. "IMG-ORIG-101")
  batchId: string;
  productId?: string | null;
  kind: "original" | "gradcam" | "segmentation" | "bounding_box" | "thumbnail";
  storageKey: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
  uploadedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const InspectionImageSchema = new Schema<IInspectionImage>(
  {
    _id: { type: String, required: true },
    batchId: { type: String, ref: "InspectionBatch", required: true },
    productId: { type: String, ref: "Product", default: null },
    kind: {
      type: String,
      enum: ["original", "gradcam", "segmentation", "bounding_box", "thumbnail"],
      required: true
    },
    storageKey: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: "image/jpeg" },
    sizeBytes: { type: Number, default: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    checksum: { type: String, default: null },
    uploadedBy: { type: String, ref: "User", default: null }
  },
  {
    timestamps: true,
    _id: false
  }
);

InspectionImageSchema.index({ productId: 1, kind: 1 });
InspectionImageSchema.index({ batchId: 1, productId: 1 });

export const InspectionImage =
  mongoose.models.InspectionImage ||
  mongoose.model<IInspectionImage>("InspectionImage", InspectionImageSchema, "inspectionImages");
