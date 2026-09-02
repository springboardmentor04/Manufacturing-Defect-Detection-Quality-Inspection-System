/**
 * VisionInspect AI - Severity Scoring Engine
 * Evaluates defects based on the document specification:
 * Severity Score = (Size * 30%) + (Location * 25%) + (Defect Type * 25%) + (Confidence * 20%)
 */

export const calculateSeverityScore = ({
  sizeScore = 0,
  locationScore = 0,
  defectTypeScore = 0,
  confidenceScore = 0,
}) => {
  const sizeContrib = (sizeScore * 30) / 100;
  const locationContrib = (locationScore * 25) / 100;
  const typeContrib = (defectTypeScore * 25) / 100;
  const confidenceContrib = (confidenceScore * 20) / 100;

  const totalScore = Math.round(sizeContrib + locationContrib + typeContrib + confidenceContrib);

  let level = 'Low';
  let badgeColor = 'emerald';
  let recommendation = 'Pass Product (Acceptable Quality)';
  let passVerdict = true;

  if (totalScore >= 80) {
    level = 'Critical';
    badgeColor = 'rose';
    recommendation = 'Reject Product & Trigger Quality Inspection Workflow';
    passVerdict = false;
  } else if (totalScore >= 60) {
    level = 'High';
    badgeColor = 'amber';
    recommendation = 'Repair or Rework Recommended';
    passVerdict = false;
  } else if (totalScore >= 40) {
    level = 'Medium';
    badgeColor = 'yellow';
    recommendation = 'Manual Quality Inspection Review Required';
    passVerdict = false;
  } else {
    level = 'Low';
    badgeColor = 'emerald';
    recommendation = 'Product Passed Quality Check (Minor Cosmetic Defect)';
    passVerdict = true;
  }

  return {
    score: totalScore,
    level,
    badgeColor,
    recommendation,
    passVerdict,
    breakdown: {
      sizeContrib,
      locationContrib,
      typeContrib,
      confidenceContrib,
    },
  };
};

export const DEFECT_TYPE_WEIGHTS = {
  'Surface Scratch': { baseScore: 40, category: 'Cosmetic' },
  'Surface Crack': { baseScore: 85, category: 'Structural' },
  'Missing Component': { baseScore: 95, category: 'Functional' },
  'Pore / Void': { baseScore: 60, category: 'Material' },
  'Solder Bridge / Short': { baseScore: 90, category: 'Electrical' },
  'Discoloration': { baseScore: 25, category: 'Cosmetic' },
};

export const LOCATION_WEIGHTS = {
  'Cosmetic Surface': { score: 30, description: 'Non-critical exterior surface' },
  'Assembly Edge': { score: 60, description: 'Non-functional structural boundary' },
  'Functional Component Area': { score: 90, description: 'High-stress critical operation zone' },
};
