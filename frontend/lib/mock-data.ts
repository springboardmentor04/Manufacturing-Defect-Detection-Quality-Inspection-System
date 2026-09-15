export const defectCategories = [
  { name: 'Scratch', count: 42, color: '#ef4444' },
  { name: 'Dent', count: 28, color: '#f97316' },
  { name: 'Misalignment', count: 15, color: '#eab308' },
  { name: 'Discoloration', count: 11, color: '#3b82f6' },
  { name: 'Crack', count: 8, color: '#a855f7' },
];

export const defectTrends = [
  { month: 'Jan', defects: 65, inspected: 1200 },
  { month: 'Feb', defects: 59, inspected: 1300 },
  { month: 'Mar', defects: 80, inspected: 1150 },
  { month: 'Apr', defects: 81, inspected: 1400 },
  { month: 'May', defects: 56, inspected: 1500 },
  { month: 'Jun', defects: 55, inspected: 1550 },
  { month: 'Jul', defects: 40, inspected: 1600 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const recentInspections: any[] = [];

export const qualityMetrics = {
  totalInspected: 15420,
  passed: 14980,
  failed: 440,
  passRate: 97.1,
};

export const inspectionQueue = {
  waiting: 142,
  processing: 8,
  completed: 1240,
};

export const detailedDetectionResult = {
  id: 'INS-4829',
  productName: 'Aluminum Casting X1',
  imageUrl: 'https://images.unsplash.com/photo-1563223771-5fe4038fbfc9?q=80&w=600&auto=format&fit=crop', // Realistic metal part proxy
  defectName: 'Surface Scratch',
  confidence: 94.2,
  severityScore: 68,
  status: 'FAIL',
  recommendation: 'Reject and route to manual rework station B.',
  coordinates: { x: 120, y: 80, width: 200, height: 150 },
};

// ==========================================
// SUPERVISOR DASHBOARD MOCK DATA
// ==========================================

export const supervisorKPIs = {
  totalProduction: 45280,
  productsPassed: 44102,
  productsFailed: 1178,
  overallQualityScore: 97.4,
  averageConfidence: 96.8,
  productionEfficiency: 92.5,
  machineUtilization: 88.3,
  averageInspectionTime: "1.2s",
  currentShiftOutput: 12450,
  targetOutput: 15000,
  completedOrders: 142,
  pendingOrders: 28,
  rejectedUnits: 1178,
};

export const productionLines = [
  { id: "L-A1", name: "Assembly Line A", status: "Running", output: 14500, defects: 320, efficiency: 94, trend: "up" },
  { id: "L-B2", name: "Assembly Line B", status: "Running", output: 12800, defects: 415, efficiency: 89, trend: "down" },
  { id: "L-C3", name: "Assembly Line C", status: "Maintenance", output: 5400, defects: 112, efficiency: 45, trend: "down" },
  { id: "L-P1", name: "Packaging Line", status: "Running", output: 12580, defects: 45, efficiency: 98, trend: "up" },
];

export const shiftPerformance = [
  { shift: "Morning", count: 18500, quality: 98.2, rejected: 1.8, avgTime: "1.1s", supervisor: "Sarah J." },
  { shift: "Evening", count: 16200, quality: 97.5, rejected: 2.5, avgTime: "1.2s", supervisor: "Michael R." },
  { shift: "Night", count: 10580, quality: 96.1, rejected: 3.9, avgTime: "1.4s", supervisor: "David L." },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const teamPerformance: any[] = [];

export const liveAlerts = [
  { id: "ALT-1", type: "Critical", message: "Assembly Line C offline for emergency maintenance.", time: "10 mins ago" },
  { id: "ALT-2", type: "Warning", message: "Defect rate on Line B exceeded 3% threshold.", time: "25 mins ago" },
  { id: "ALT-3", type: "Info", message: "Night shift hand-off completed successfully.", time: "1 hour ago" },
  { id: "ALT-4", type: "Warning", message: "Inspection queue overloaded (150+ items waiting).", time: "2 hours ago" },
];

export const dailyProductionData = [
  { day: 'Mon', output: 42000, target: 45000 },
  { day: 'Tue', output: 44500, target: 45000 },
  { day: 'Wed', output: 46200, target: 45000 },
  { day: 'Thu', output: 43800, target: 45000 },
  { day: 'Fri', output: 45100, target: 45000 },
  { day: 'Sat', output: 38000, target: 35000 },
  { day: 'Sun', output: 39500, target: 35000 },
];

// ==========================================
// SUPERVISOR EXTENDED MOCK DATA
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extensiveReports: any[] = [];

export const qualityAnalyticsData = [
  { month: 'Jan', passRate: 98.1, firstPassYield: 95.2, reworkRate: 2.1, scrapRate: 0.8 },
  { month: 'Feb', passRate: 97.5, firstPassYield: 94.8, reworkRate: 2.5, scrapRate: 1.1 },
  { month: 'Mar', passRate: 98.5, firstPassYield: 96.0, reworkRate: 1.8, scrapRate: 0.7 },
  { month: 'Apr', passRate: 98.2, firstPassYield: 95.5, reworkRate: 2.0, scrapRate: 0.7 },
  { month: 'May', passRate: 97.9, firstPassYield: 95.1, reworkRate: 2.2, scrapRate: 0.9 },
  { month: 'Jun', passRate: 99.1, firstPassYield: 97.2, reworkRate: 1.5, scrapRate: 0.4 },
];

export const defectHeatmapData = [
  { line: 'Line A', morning: 12, evening: 18, night: 5 },
  { line: 'Line B', morning: 8, evening: 10, night: 15 },
  { line: 'Line C', morning: 25, evening: 5, night: 8 },
  { line: 'Packaging', morning: 2, evening: 4, night: 1 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const usersList: any[] = [];

export const userStats = {
  total: 42,
  engineers: 8,
  supervisors: 4,
  operators: 28,
  admins: 2
};
