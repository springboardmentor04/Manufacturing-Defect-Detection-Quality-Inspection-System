// Pre-defined Industrial Inspection Samples (MVTec AD inspired)
export const MOCK_INSPECTION_SAMPLES = [
  {
    id: 'SMP-2026-0891',
    name: 'Cast Aluminum Engine Block (Top Housing)',
    batch: 'B-9021-AL',
    partNumber: 'ENG-884-X',
    timestamp: '2026-07-28 17:14:02',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    type: 'Surface Crack',
    location: 'Functional Component Area',
    sizeScore: 85,
    locationScore: 90,
    defectTypeScore: 95,
    confidenceScore: 94,
    bboxes: [
      { x: 38, y: 32, width: 24, height: 28, label: 'Micro Crack', confidence: 0.94, severity: 'Critical' }
    ],
    heatmapIntensity: 'high',
    status: 'Failed',
    inspector: 'AI Engine (YOLOv8 + U-Net)'
  },
  {
    id: 'SMP-2026-0892',
    name: 'PCB Controller Board (SMT Line #3)',
    batch: 'B-4402-PCB',
    partNumber: 'PCB-301-B',
    timestamp: '2026-07-28 17:20:45',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    type: 'Solder Bridge / Short',
    location: 'Functional Component Area',
    sizeScore: 65,
    locationScore: 95,
    defectTypeScore: 90,
    confidenceScore: 91,
    bboxes: [
      { x: 55, y: 40, width: 18, height: 16, label: 'Solder Short', confidence: 0.91, severity: 'Critical' }
    ],
    heatmapIntensity: 'high',
    status: 'Failed',
    inspector: 'AI Engine (YOLOv8)'
  },
  {
    id: 'SMP-2026-0893',
    name: 'Precision Metal Nut & Threading',
    batch: 'B-1120-NT',
    partNumber: 'NUT-44-M10',
    timestamp: '2026-07-28 17:28:11',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    type: 'Surface Scratch',
    location: 'Cosmetic Surface',
    sizeScore: 30,
    locationScore: 30,
    defectTypeScore: 40,
    confidenceScore: 97,
    bboxes: [
      { x: 20, y: 60, width: 15, height: 10, label: 'Hairline Scratch', confidence: 0.97, severity: 'Low' }
    ],
    heatmapIntensity: 'low',
    status: 'Passed',
    inspector: 'AI Engine (ResNet50)'
  },
  {
    id: 'SMP-2026-0894',
    name: 'Automotive Gear Shaft Assembly',
    batch: 'B-7719-GR',
    partNumber: 'GEAR-900-V2',
    timestamp: '2026-07-28 17:31:00',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    type: 'Pore / Void',
    location: 'Assembly Edge',
    sizeScore: 55,
    locationScore: 60,
    defectTypeScore: 60,
    confidenceScore: 86,
    bboxes: [
      { x: 42, y: 28, width: 16, height: 18, label: 'Surface Pore', confidence: 0.86, severity: 'Medium' }
    ],
    heatmapIntensity: 'medium',
    status: 'Needs Review',
    inspector: 'AI Engine (U-Net)'
  },
  {
    id: 'SMP-2026-0895',
    name: 'Industrial Leather Gasket Seal',
    batch: 'B-5529-LT',
    partNumber: 'GSK-220-L',
    timestamp: '2026-07-28 17:34:50',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
    type: 'Discoloration',
    location: 'Cosmetic Surface',
    sizeScore: 20,
    locationScore: 25,
    defectTypeScore: 25,
    confidenceScore: 98,
    bboxes: [],
    heatmapIntensity: 'none',
    status: 'Passed',
    inspector: 'AI Engine (ResNet50)'
  }
];

export const MOCK_RECENT_INSPECTIONS = [
  { id: 'INS-9921', part: 'ENG-884-X', line: 'Line A1', time: '17:34:10', defect: 'Surface Crack', severity: 'Critical', score: 88, result: 'REJECT' },
  { id: 'INS-9920', part: 'PCB-301-B', line: 'Line B3', time: '17:31:45', defect: 'Solder Short', severity: 'Critical', score: 84, result: 'REJECT' },
  { id: 'INS-9919', part: 'NUT-44-M10', line: 'Line C2', time: '17:28:11', defect: 'Surface Scratch', severity: 'Low', score: 33, result: 'PASS' },
  { id: 'INS-9918', part: 'GEAR-900-V2', line: 'Line A2', time: '17:25:30', defect: 'Pore / Void', severity: 'Medium', score: 55, result: 'REWORK' },
  { id: 'INS-9917', part: 'GSK-220-L', line: 'Line C1', time: '17:22:04', defect: 'None', severity: 'Low', score: 18, result: 'PASS' },
  { id: 'INS-9916', part: 'PCB-301-B', line: 'Line B3', time: '17:19:12', defect: 'Missing Component', severity: 'Critical', score: 92, result: 'REJECT' },
  { id: 'INS-9915', part: 'ENG-884-X', line: 'Line A1', time: '17:15:00', defect: 'Surface Scratch', severity: 'Low', score: 28, result: 'PASS' },
];

export const MOCK_ANALYTICS_STATS = {
  totalInspectedToday: 2840,
  passRate: 94.2,
  defectRate: 5.8,
  avgInspectionTimeMs: 142,
  aiAccuracy: 98.6,
  precision: 97.8,
  recall: 99.1,
  f1Score: 98.4,
  mAP: 0.942,
  defectBreakdown: [
    { name: 'Surface Crack', count: 42, percentage: 25.4, color: '#f43f5e' },
    { name: 'Solder Bridge', count: 38, percentage: 23.0, color: '#f59e0b' },
    { name: 'Surface Scratch', count: 50, percentage: 30.3, color: '#06b6d4' },
    { name: 'Pore / Void', count: 22, percentage: 13.3, color: '#a855f7' },
    { name: 'Missing Part', count: 13, percentage: 7.9, color: '#ec4899' },
  ],
  hourlyYieldTrend: [
    { time: '08:00', total: 320, passed: 308, failed: 12 },
    { time: '09:00', total: 380, passed: 362, failed: 18 },
    { time: '10:00', total: 410, passed: 395, failed: 15 },
    { time: '11:00', total: 390, passed: 372, failed: 18 },
    { time: '12:00', total: 350, passed: 338, failed: 12 },
    { time: '13:00', total: 420, passed: 400, failed: 20 },
    { time: '14:00', total: 400, passed: 381, failed: 19 },
    { time: '15:00', total: 430, passed: 410, failed: 20 },
    { time: '16:00', total: 360, passed: 345, failed: 15 },
    { time: '17:00', total: 280, passed: 268, failed: 12 },
  ],
  severityDistribution: [
    { category: 'Critical (80-100)', count: 48, fill: '#f43f5e' },
    { category: 'High (60-79)', count: 35, fill: '#f59e0b' },
    { category: 'Medium (40-59)', count: 52, fill: '#eab308' },
    { category: 'Low (0-39)', count: 2705, fill: '#10b981' },
  ]
};
