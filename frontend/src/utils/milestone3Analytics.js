// Milestone 3 - Manufacturing Analytics
// This file works with existing inspection data.
// It does not modify the existing inspection workflow.

export const classifyDefect = (defect = "") => {
  const value = defect.toLowerCase();

  if (
    value.includes("crack") ||
    value.includes("broken")
  ) {
    return "Structural Defect";
  }

  if (
    value.includes("scratch") ||
    value.includes("surface")
  ) {
    return "Surface Defect";
  }

  if (
    value.includes("missing") ||
    value.includes("component")
  ) {
    return "Missing Component";
  }

  if (
    value.includes("contamination") ||
    value.includes("contamin")
  ) {
    return "Contamination";
  }

  if (
    value.includes("manufacturing") ||
    value.includes("manufacture")
  ) {
    return "Manufacturing Defect";
  }

  if (
    value.includes("dent") ||
    value.includes("deformation")
  ) {
    return "Physical Deformation";
  }

  return "Other Defect";
};


// Convert confidence into a score from 0-100.
export const getConfidenceScore = (confidence) => {
  if (typeof confidence === "number") {
    return confidence <= 1
      ? confidence * 100
      : confidence;
  }

  if (!confidence) return 0;

  const value = parseFloat(
    String(confidence).replace("%", "")
  );

  return value <= 1 ? value * 100 : value;
};


// Estimate defect size score.
export const getSizeScore = (defect = "") => {
  const value = defect.toLowerCase();

  if (value.includes("large") || value.includes("major")) {
    return 90;
  }

  if (value.includes("medium")) {
    return 65;
  }

  if (
    value.includes("small") ||
    value.includes("minor")
  ) {
    return 35;
  }

  return 50;
};


// Estimate location impact.
export const getLocationScore = (defect = "") => {
  const value = defect.toLowerCase();

  if (
    value.includes("functional") ||
    value.includes("component") ||
    value.includes("structural")
  ) {
    return 90;
  }

  if (
    value.includes("surface") ||
    value.includes("scratch")
  ) {
    return 40;
  }

  return 60;
};


// Defect type seriousness.
export const getDefectTypeScore = (defect = "") => {
  const value = defect.toLowerCase();

  if (
    value.includes("crack") ||
    value.includes("missing") ||
    value.includes("broken")
  ) {
    return 90;
  }

  if (
    value.includes("contamination") ||
    value.includes("manufacturing")
  ) {
    return 70;
  }

  if (value.includes("scratch")) {
    return 35;
  }

  return 50;
};


// Milestone 3 Severity Formula:
//
// Size       × 30%
// Location   × 25%
// Defect     × 25%
// Confidence × 20%

export const calculateSeverityScore = (inspection) => {
  const defect =
    inspection?.defect ||
    inspection?.defectType ||
    inspection?.prediction ||
    "";

  const sizeScore = getSizeScore(defect);

  const locationScore =
    getLocationScore(defect);

  const defectTypeScore =
    getDefectTypeScore(defect);

  const confidenceScore =
    getConfidenceScore(
      inspection?.confidence
    );

  const severity =
    sizeScore * 0.30 +
    locationScore * 0.25 +
    defectTypeScore * 0.25 +
    confidenceScore * 0.20;

  return Math.round(severity);
};


export const getSeverityLevel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";

  return "Low";
};


export const getQualityDecision = (
  severityLevel,
  prediction
) => {
  const value =
    String(prediction || "").toLowerCase();

  if (
    severityLevel === "Critical"
  ) {
    return "REJECT";
  }

  if (
    severityLevel === "High"
  ) {
    return "REJECT";
  }

  if (
    severityLevel === "Medium"
  ) {
    return "REVIEW";
  }

  if (
    value.includes("defective") ||
    value.includes("defect")
  ) {
    return "REVIEW";
  }

  return "PASS";
};


export const analyzeInspection = (inspection) => {
  const defect =
    inspection?.defect ||
    inspection?.defectType ||
    inspection?.prediction ||
    "No Defect";

  const isDefective =
    String(
      inspection?.prediction || ""
    ).toLowerCase()
      .includes("defective") ||
    String(defect).toLowerCase() !==
      "no defect";

  if (!isDefective) {
    return {
      classification: "No Defect",
      severityScore: 0,
      severityLevel: "Low",
      decision: "PASS",
      risk: "Low",
      recommendation:
        "Product meets the current inspection criteria."
    };
  }

  const classification =
    classifyDefect(defect);

  const severityScore =
    calculateSeverityScore(inspection);

  const severityLevel =
    getSeverityLevel(severityScore);

  const decision =
    getQualityDecision(
      severityLevel,
      inspection?.prediction
    );

  let recommendation =
    "Continue normal production monitoring.";

  if (decision === "REVIEW") {
    recommendation =
      "Send product for manual quality inspection.";
  }

  if (decision === "REJECT") {
    recommendation =
      "Reject product and trigger quality control workflow.";
  }

  return {
    classification,
    severityScore,
    severityLevel,
    decision,
    risk: severityLevel,
    recommendation
  };
};


// Generate overall production statistics.
export const generateProductionReport = (
  inspections = []
) => {
  const total = inspections.length;

  const passed = inspections.filter(
    item =>
      String(item.prediction || "")
        .toLowerCase() === "passed" ||
      String(item.decision || "")
        .toLowerCase() === "pass"
  ).length;

  const defective = inspections.filter(
    item =>
      String(item.prediction || "")
        .toLowerCase()
        .includes("defective")
  ).length;

  const review = inspections.filter(
    item =>
      String(item.decision || "")
        .toLowerCase() === "review"
  ).length;

  const passRate =
    total > 0
      ? ((passed / total) * 100).toFixed(1)
      : "0.0";

  const defectRate =
    total > 0
      ? ((defective / total) * 100).toFixed(1)
      : "0.0";

  return {
    total,
    passed,
    defective,
    review,
    passRate,
    defectRate
  };
};


// Week-wise defect analysis.
export const generateWeeklyTrend = (
  inspections = []
) => {
  const weeks = {};

  inspections.forEach((item) => {
    const date =
      item.date ||
      item.createdAt ||
      item.timestamp;

    let week = "Week 1";

    if (date) {
      const d = new Date(date);

      const day =
        Math.floor(
          (d - new Date(d.getFullYear(), 0, 1)) /
            86400000
        );

      const weekNumber =
        Math.floor(day / 7) + 1;

      week =
        `Week ${Math.min(
          weekNumber,
          12
        )}`;
    }

    if (!weeks[week]) {
      weeks[week] = {
        week,
        total: 0,
        defective: 0,
        passed: 0,
        review: 0
      };
    }

    weeks[week].total++;

    const prediction =
      String(
        item.prediction || ""
      ).toLowerCase();

    const decision =
      String(
        item.decision || ""
      ).toLowerCase();

    if (
      prediction.includes("defective")
    ) {
      weeks[week].defective++;
    }

    if (
      prediction === "passed" ||
      decision === "pass"
    ) {
      weeks[week].passed++;
    }

    if (
      decision === "review"
    ) {
      weeks[week].review++;
    }
  });

  return Object.values(weeks);
};