import {
  InspectionBatch,
  Product,
  InspectionImage,
  ModelRun,
  Finding,
  ManualReview,
  QualityReport,
  User,
  getDb
} from "./db";

export async function seedDatabase() {
  await getDb();

  console.log("[MongoDB Seed] Starting database collection population...");

  // 1. Ensure a default admin / quality engineer user exists
  const adminUser = await User.findOneAndUpdate(
    { openId: "usr_qe_admin" },
    {
      _id: "usr_qe_admin",
      openId: "usr_qe_admin",
      name: "Lead Quality Engineer",
      email: "engineer@visioninspect.ai",
      role: "quality_engineer",
      accountStatus: "active"
    },
    { upsert: true, new: true }
  );

  // 2. Operational Collection: inspectionBatches
  const sampleBatches = [
    {
      _id: "BT-4108",
      batchCode: "BT-4108",
      name: "BATCH-L04-20260828-0842",
      line: "Line 04",
      createdBy: adminUser._id,
      status: "Hold for review",
      capturedAt: new Date("2026-08-28T08:42:00Z"),
      itemCount: 3,
      flagCount: 1,
      reviewedCount: 1,
      reviewRequired: true,
      verdict: "Hold",
      overallSeverity: "High",
      overallSeverityScore: 74,
      overallConfidence: 96.4,
      mode: "Detection + segmentation",
      sortOrder: 4,
      failureReason: "Edge discontinuity exceeded the product tolerance."
    },
    {
      _id: "BT-4106",
      batchCode: "BT-4106",
      name: "BATCH-L02-20260828-0817",
      line: "Line 02",
      createdBy: adminUser._id,
      status: "Review queued",
      capturedAt: new Date("2026-08-28T08:17:00Z"),
      itemCount: 2,
      flagCount: 1,
      reviewedCount: 0,
      reviewRequired: true,
      verdict: "Review",
      overallSeverity: "Medium",
      overallSeverityScore: 52,
      overallConfidence: 91.8,
      mode: "Detection",
      sortOrder: 3,
      failureReason: "A solder bridge was detected and requires manual verification."
    },
    {
      _id: "BT-4104",
      batchCode: "BT-4104",
      name: "BATCH-L03-20260827-1630",
      line: "Line 03",
      createdBy: adminUser._id,
      status: "Hold for review",
      capturedAt: new Date("2026-08-27T16:30:00Z"),
      itemCount: 2,
      flagCount: 1,
      reviewedCount: 0,
      reviewRequired: true,
      verdict: "Hold",
      overallSeverity: "High",
      overallSeverityScore: 82,
      overallConfidence: 97.2,
      mode: "Detection + segmentation",
      sortOrder: 2.5,
      failureReason: "Cap deformation was detected on the seal collar."
    },
    {
      _id: "BT-4102",
      batchCode: "BT-4102",
      name: "BATCH-L01-20260825-0751",
      line: "Line 01",
      createdBy: adminUser._id,
      status: "Passed",
      capturedAt: new Date("2026-08-25T07:51:00Z"),
      completedAt: new Date("2026-08-25T08:00:00Z"),
      itemCount: 1,
      flagCount: 0,
      reviewedCount: 1,
      reviewRequired: false,
      verdict: "Pass",
      overallSeverity: "Low",
      overallSeverityScore: 0,
      overallConfidence: 88.6,
      mode: "Segmentation",
      sortOrder: 2
    },
    {
      _id: "BT-4100",
      batchCode: "BT-4100",
      name: "BATCH-L05-20260824-1412",
      line: "Line 05",
      createdBy: adminUser._id,
      status: "Review queued",
      capturedAt: new Date("2026-08-24T14:12:00Z"),
      itemCount: 2,
      flagCount: 1,
      reviewedCount: 0,
      reviewRequired: true,
      verdict: "Review",
      overallSeverity: "Medium",
      overallSeverityScore: 58,
      overallConfidence: 90.5,
      mode: "Detection",
      sortOrder: 1.5,
      failureReason: "Insulation tear requires manual verification before release."
    },
    {
      _id: "BT-4098",
      batchCode: "BT-4098",
      name: "BATCH-L06-20260816-0723",
      line: "Line 06",
      createdBy: adminUser._id,
      status: "Complete",
      capturedAt: new Date("2026-08-16T07:23:00Z"),
      completedAt: new Date("2026-08-16T07:30:00Z"),
      itemCount: 2,
      flagCount: 1,
      reviewedCount: 2,
      reviewRequired: false,
      verdict: "Review",
      overallSeverity: "Medium",
      overallSeverityScore: 47,
      overallConfidence: 93.2,
      mode: "Segmentation",
      sortOrder: 1,
      failureReason: "Surface abrasion requires manual verification before release."
    }
  ];

  for (const batch of sampleBatches) {
    await InspectionBatch.findOneAndUpdate({ _id: batch._id }, batch, { upsert: true });
  }

  // 3. Operational Collection: products
  const sampleProducts = [
    { _id: "PRD-2026-101", productCode: "PRD-2026-101", batchId: "BT-4108", sequence: 1, name: "Machined drive housing", status: "Failed", confidence: 96.4, capturedAt: new Date("2026-08-28T08:42:00Z"), findingCount: 1, failedFindingCount: 1 },
    { _id: "PRD-2026-102", productCode: "PRD-2026-102", batchId: "BT-4108", sequence: 2, name: "Machined drive housing", status: "Passed", confidence: 98.9, capturedAt: new Date("2026-08-28T08:38:00Z"), findingCount: 1, failedFindingCount: 0 },
    { _id: "PRD-2026-103", productCode: "PRD-2026-103", batchId: "BT-4108", sequence: 3, name: "Machined drive housing", status: "Passed", confidence: 97.6, capturedAt: new Date("2026-08-28T08:34:00Z"), findingCount: 1, failedFindingCount: 0 },
    { _id: "PRD-2026-104", productCode: "PRD-2026-104", batchId: "BT-4106", sequence: 1, name: "Circuit board assembly", status: "Failed", confidence: 91.8, capturedAt: new Date("2026-08-28T08:17:00Z"), findingCount: 1, failedFindingCount: 1 },
    { _id: "PRD-2026-105", productCode: "PRD-2026-105", batchId: "BT-4106", sequence: 2, name: "Circuit board assembly", status: "Passed", confidence: 97.1, capturedAt: new Date("2026-08-28T08:12:00Z"), findingCount: 0, failedFindingCount: 0 },
    { _id: "PRD-2026-106", productCode: "PRD-2026-106", batchId: "BT-4102", sequence: 1, name: "Woven protective mesh", status: "Passed", confidence: 88.6, capturedAt: new Date("2026-08-25T07:51:00Z"), findingCount: 1, failedFindingCount: 0 },
    { _id: "PRD-2026-107", productCode: "PRD-2026-107", batchId: "BT-4098", sequence: 1, name: "Wood-finish panel", status: "Failed", confidence: 93.2, capturedAt: new Date("2026-08-16T07:23:00Z"), findingCount: 1, failedFindingCount: 1 },
    { _id: "PRD-2026-108", productCode: "PRD-2026-108", batchId: "BT-4098", sequence: 2, name: "Wood-finish panel", status: "Passed", confidence: 95.6, capturedAt: new Date("2026-08-16T07:18:00Z"), findingCount: 0, failedFindingCount: 0 },
    { _id: "PRD-2026-109", productCode: "PRD-2026-109", batchId: "BT-4104", sequence: 1, name: "Sterile vial closure", status: "Failed", confidence: 97.2, capturedAt: new Date("2026-08-27T16:30:00Z"), findingCount: 1, failedFindingCount: 1 },
    { _id: "PRD-2026-110", productCode: "PRD-2026-110", batchId: "BT-4104", sequence: 2, name: "Sterile vial closure", status: "Passed", confidence: 99.1, capturedAt: new Date("2026-08-27T16:25:00Z"), findingCount: 0, failedFindingCount: 0 },
    { _id: "PRD-2026-111", productCode: "PRD-2026-111", batchId: "BT-4100", sequence: 1, name: "Cable assembly", status: "Failed", confidence: 90.5, capturedAt: new Date("2026-08-24T14:12:00Z"), findingCount: 1, failedFindingCount: 1 },
    { _id: "PRD-2026-112", productCode: "PRD-2026-112", batchId: "BT-4100", sequence: 2, name: "Cable assembly", status: "Passed", confidence: 96.8, capturedAt: new Date("2026-08-24T14:08:00Z"), findingCount: 0, failedFindingCount: 0 }
  ];

  for (const product of sampleProducts) {
    await Product.findOneAndUpdate({ _id: product._id }, product, { upsert: true });
  }

  // 4. Operational Collection: inspectionImages
  const sampleImages = [
    { _id: "IMG-ORIG-101", batchId: "BT-4108", productId: "PRD-2026-101", kind: "original", storageKey: "uploads/hazelnut_cap_defective.png", url: "/manus-storage/hazelnut_cap_defective.png", originalName: "hazelnut_cap_defective.png", mimeType: "image/png", sizeBytes: 524288, uploadedBy: adminUser._id },
    { _id: "IMG-GCAM-101", batchId: "BT-4108", productId: "PRD-2026-101", kind: "gradcam", storageKey: "models/hazelnut_cap_gradcam.png", url: "/manus-storage/hazelnut_cap_gradcam.png", originalName: "hazelnut_cap_gradcam.png", mimeType: "image/png", sizeBytes: 412000, uploadedBy: adminUser._id },
    { _id: "IMG-SEG-101", batchId: "BT-4108", productId: "PRD-2026-101", kind: "segmentation", storageKey: "models/hazelnut_cap_segmentation.png", url: "/manus-storage/hazelnut_cap_segmentation.png", originalName: "hazelnut_cap_segmentation.png", mimeType: "image/png", sizeBytes: 398000, uploadedBy: adminUser._id },
    { _id: "IMG-ORIG-104", batchId: "BT-4106", productId: "PRD-2026-104", kind: "original", storageKey: "uploads/electronics-after.png", url: "/manus-storage/electronics-after_33ab70a2.png", originalName: "electronics-after.png", mimeType: "image/png", sizeBytes: 612000, uploadedBy: adminUser._id },
    { _id: "IMG-ORIG-106", batchId: "BT-4102", productId: "PRD-2026-106", kind: "original", storageKey: "uploads/hazelnut.jpg", url: "/manus-storage/hazelnut.jpg", originalName: "hazelnut.jpg", mimeType: "image/jpeg", sizeBytes: 284000, uploadedBy: adminUser._id }
  ];

  for (const image of sampleImages) {
    await InspectionImage.findOneAndUpdate({ _id: image._id }, image, { upsert: true });
  }

  // 5. Operational Collection: modelRuns
  const sampleModelRuns = [
    { _id: "RUN-CNN-4821", batchId: "BT-4108", productId: "PRD-2026-101", inputImageId: "IMG-ORIG-101", modelType: "cnn", modelVersion: "v2.1.0", status: "completed", startedAt: new Date("2026-08-28T08:42:01Z"), completedAt: new Date("2026-08-28T08:42:03Z"), overallConfidence: 96.4, outputImageIds: ["IMG-GCAM-101", "IMG-SEG-101"], rawOutput: { defectDetected: true, confidence: 0.964, defectType: "Contamination" } },
    { _id: "RUN-YOLO-4819", batchId: "BT-4106", productId: "PRD-2026-104", inputImageId: "IMG-ORIG-104", modelType: "yolo", modelVersion: "v8.4.1", status: "completed", startedAt: new Date("2026-08-28T08:17:01Z"), completedAt: new Date("2026-08-28T08:17:02Z"), overallConfidence: 91.8, outputImageIds: [], rawOutput: { defectDetected: true, confidence: 0.918, defectType: "Solder bridge" } }
  ];

  for (const run of sampleModelRuns) {
    await ModelRun.findOneAndUpdate({ _id: run._id }, run, { upsert: true });
  }

  // 6. Operational Collection: findings
  const sampleFindings = [
    { _id: "IR-4821", batchId: "BT-4108", productId: "PRD-2026-101", modelRunId: "RUN-CNN-4821", findingCode: "IR-4821", defectType: "Contamination", severity: "High", severityScore: 74, confidence: 96.4, defectArea: "12.5%", decision: "Hold for review", boundingBox: { left: "58%", top: "38%", width: "23%", height: "28%" }, gradcamImageId: "IMG-GCAM-101", segmentationMaskImageId: "IMG-SEG-101", isFlagged: true },
    { _id: "IR-4822", batchId: "BT-4108", productId: "PRD-2026-102", findingCode: "IR-4822", defectType: "Not defective", severity: "Low", severityScore: 0, confidence: 98.9, defectArea: "0.0%", decision: "Pass", isFlagged: false },
    { _id: "IR-4823", batchId: "BT-4108", productId: "PRD-2026-103", findingCode: "IR-4823", defectType: "Not defective", severity: "Low", severityScore: 0, confidence: 97.6, defectArea: "0.0%", decision: "Pass", isFlagged: false },
    { _id: "IR-4819", batchId: "BT-4106", productId: "PRD-2026-104", modelRunId: "RUN-YOLO-4819", findingCode: "IR-4819", defectType: "Solder bridge", severity: "Medium", severityScore: 52, confidence: 91.8, defectArea: "Connector pad", decision: "Review queued", boundingBox: { left: "39%", top: "41%", width: "25%", height: "20%" }, isFlagged: true },
    { _id: "IR-4817", batchId: "BT-4102", productId: "PRD-2026-106", findingCode: "IR-4817", defectType: "Not defective", severity: "Low", severityScore: 0, confidence: 88.6, defectArea: "0.0%", decision: "Pass", isFlagged: false },
    { _id: "IR-4815", batchId: "BT-4104", productId: "PRD-2026-109", findingCode: "IR-4815", defectType: "Cap deformation", severity: "High", severityScore: 82, confidence: 97.2, defectArea: "Seal collar", decision: "Hold for review", boundingBox: { left: "35%", top: "25%", width: "20%", height: "25%" }, isFlagged: true },
    { _id: "IR-4814", batchId: "BT-4100", productId: "PRD-2026-111", findingCode: "IR-4814", defectType: "Insulation tear", severity: "Medium", severityScore: 58, confidence: 90.5, defectArea: "Wrap sleeve", decision: "Review queued", boundingBox: { left: "45%", top: "40%", width: "22%", height: "18%" }, isFlagged: true },
    { _id: "IR-4813", batchId: "BT-4098", productId: "PRD-2026-107", findingCode: "IR-4813", defectType: "Surface abrasion", severity: "Medium", severityScore: 47, confidence: 93.2, defectArea: "Right edge", decision: "Review queued", boundingBox: { left: "68%", top: "32%", width: "16%", height: "36%" }, isFlagged: true }
  ];

  for (const finding of sampleFindings) {
    await Finding.findOneAndUpdate({ _id: finding._id }, finding, { upsert: true });
  }

  // 7. Operational Collection: manualReviews
  const sampleReviews = [
    { _id: "REV-4821-1", batchId: "BT-4108", productId: "PRD-2026-101", findingId: "IR-4821", reviewerId: adminUser._id, status: "reviewed", decision: "Hold", note: "Edge discontinuity confirmed visually. Quarantine batch section.", reviewedAt: new Date("2026-08-28T09:00:00Z"), reviewVersion: 1, isCurrent: true }
  ];

  for (const review of sampleReviews) {
    await ManualReview.findOneAndUpdate({ _id: review._id }, review, { upsert: true });
  }

  // 8. Snapshot Collection: qualityReports
  const sampleReports = [
    {
      _id: "REP-20260830-7D",
      periodKey: "2026-08-30:7-days",
      periodStart: new Date("2026-08-23T00:00:00Z"),
      periodEnd: new Date("2026-08-30T23:59:59Z"),
      generatedBy: adminUser._id,
      metrics: {
        totalInspections: 6,
        passRate: 50,
        completionRate: 100,
        defectsPerThousand: 500,
        coverage: 100
      },
      trend: [65, 78, 72, 85, 91, 92.4],
      defectMix: [
        { label: "Surface", value: 42, color: "#27837f" },
        { label: "Assembly", value: 28, color: "#fcbe5a" },
        { label: "Dimensional", value: 19, color: "#ba4a31" },
        { label: "Packaging", value: 11, color: "#799a98" }
      ],
      summary: "Over the last 7 days, 6 batches were inspected. Pass rate stands at 50% with surface defects comprising the majority (42%) of observations."
    }
  ];

  for (const report of sampleReports) {
    await QualityReport.findOneAndUpdate({ _id: report._id }, report, { upsert: true });
  }

  console.log("[MongoDB Seed] Successfully populated all 8 database collections!");
}
