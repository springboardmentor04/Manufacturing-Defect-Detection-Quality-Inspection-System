const STORAGE_KEY = "visionInspect_inspections";

// Get all saved inspections
export const getInspections = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading inspections:", error);
    return [];
  }
};


// Save a new inspection
export const saveInspection = (inspection) => {
  try {
    const inspections = getInspections();

    const newInspection = {
      id: inspection.id || Date.now(),

      product:
        inspection.product ||
        inspection.filename ||
        "Product",

      filename:
        inspection.filename ||
        "Unknown",

      prediction:
        inspection.prediction ||
        "Pending",

      confidence:
        Number(inspection.confidence || 0),

      defect:
        inspection.defect || false,

      defectType:
        inspection.defectType ||
        "No Defect",

      sizeScore:
        Number(inspection.sizeScore || 0),

      locationScore:
        Number(inspection.locationScore || 0),

      defectTypeScore:
        Number(inspection.defectTypeScore || 0),

      confidenceScore:
        Number(inspection.confidenceScore || 0),

      severityScore:
        Number(inspection.severityScore || 0),

      severityLevel:
        inspection.severityLevel ||
        "Low",

      qualityDecision:
        inspection.qualityDecision ||
        "REVIEW",

      recommendedAction:
        inspection.recommendedAction ||
        "Manual inspection required",

      inspectedBy:
        inspection.inspectedBy ||
        "Unknown User",

      inspectedByName:
        inspection.inspectedByName ||
        "User",

      role:
        inspection.role ||
        "Quality Engineer",

      createdAt:
        inspection.createdAt ||
        new Date().toISOString(),

      status:
        inspection.status ||
        (
          inspection.prediction === "Passed"
            ? "Passed"
            : "Defective"
        ),
    };

    inspections.push(newInspection);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(inspections)
    );

    console.log(
      "Inspection saved successfully:",
      newInspection
    );

    return newInspection;

  } catch (error) {

    console.error(
      "Error saving inspection:",
      error
    );

    return null;
  }
};


// Delete all inspections
export const clearInspections = () => {
  localStorage.removeItem(STORAGE_KEY);
};


// Delete one inspection
export const deleteInspection = (id) => {

  const inspections = getInspections();

  const updatedInspections =
    inspections.filter(
      (item) => item.id !== id
    );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedInspections)
  );

  return updatedInspections;
};