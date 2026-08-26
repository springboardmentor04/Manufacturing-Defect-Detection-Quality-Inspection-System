const { spawnSync } = require('child_process');
const path = require('path');

// Map YOLO class names to your severity-scoring "defect type" labels
const TYPE_SCORE_RANGE = {
  bottle: [20, 45], cable: [20, 45], capsule: [20, 45], carpet: [20, 45],
  grid: [20, 45], hazelnut: [20, 45], leather: [20, 45], metal_nut: [35, 60],
  pill: [20, 45], screw: [20, 45], tile: [20, 45], toothbrush: [20, 45],
  transistor: [35, 60], wood: [20, 45], zipper: [20, 45],
};

function severityLevel(score) {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function recommendationFor(level, status) {
  if (status === 'pass') return 'Full Quality Pass — Approve Product for Shipment';
  switch (level) {
    case 'Critical': return 'Reject Product and Trigger Quality Inspection Workflow';
    case 'High': return 'Quarantine Product & Route for Repair / Rework';
    case 'Medium': return 'Flag for Manual Inspection Review';
    default: return 'Log Defect — Product Generally Acceptable';
  }
}

// Runs real YOLO inference on the given image path
function runInspection(imagePath) {
  const scriptPath = path.join(__dirname, 'predict_json.py');

  const proc = spawnSync('python', [scriptPath, imagePath], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (proc.error) throw new Error(`Failed to run model: ${proc.error.message}`);
  if (proc.status !== 0) throw new Error(`Model script exited with error: ${proc.stderr || proc.stdout}`);

  let parsed;
  try {
    parsed = JSON.parse(proc.stdout.trim().split('\n').pop());
  } catch (e) {
    throw new Error(`Could not parse model output: ${proc.stdout}`);
  }

  if (parsed.error) throw new Error(parsed.error);

  if (!parsed.top_detection) {
    const confidence_score = 95;
    return {
      defect_type: 'None',
      status: 'pass',
      size_score: 0,
      location_score: 0,
      type_score: 0,
      confidence_score,
      severity_score: 0,
      severity_level: 'Low',
      recommendation: recommendationFor('Low', 'pass'),
      bbox: null,
    };
  }

  const top = parsed.top_detection;
  const [minT, maxT] = TYPE_SCORE_RANGE[top.class_name] || [20, 45];
  const size_score = Math.min(100, top.bbox.w * top.bbox.h / 10);
  const location_score = 50;
  const type_score = minT + ((maxT - minT) * (top.confidence / 100));
  const confidence_score = top.confidence;

  const severity_score = Math.round(
    (size_score * 0.3 + location_score * 0.25 + type_score * 0.25 + confidence_score * 0.2) * 10
  ) / 10;

  const level = severityLevel(severity_score);
  const status = 'fail';

  return {
    defect_type: top.class_name,
    status,
    size_score: Math.round(size_score * 10) / 10,
    location_score,
    type_score: Math.round(type_score * 10) / 10,
    confidence_score,
    severity_score,
    severity_level: level,
    recommendation: recommendationFor(level, status),
    bbox: {
      x: top.bbox.x,
      y: top.bbox.y,
      w: top.bbox.w,
      h: top.bbox.h,
    },
  };
}

module.exports = { runInspection, severityLevel };