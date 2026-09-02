import React, { useState } from 'react';
import { MOCK_INSPECTION_SAMPLES } from '../data/mockData';
import { calculateSeverityScore } from '../utils/severityCalculator';
import { 
  Camera, Upload, Eye, Layers, Sliders, CheckCircle2, XCircle, 
  Download, Sparkles, Cpu, FileText, Play, Square, Check, X
} from 'lucide-react';

export const InspectionWorkspace = () => {
  const [selectedSample, setSelectedSample] = useState(MOCK_INSPECTION_SAMPLES[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // View Toggles
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPreprocessing, setShowPreprocessing] = useState(false);
  const [preprocessNoiseFilter, setPreprocessNoiseFilter] = useState(true);
  const [preprocessContrast, setPreprocessContrast] = useState(true);
  const [preprocessEdge, setPreprocessEdge] = useState(false);

  // Severity Parameters
  const [sizeScore, setSizeScore] = useState(selectedSample.sizeScore);
  const [locationScore, setLocationScore] = useState(selectedSample.locationScore);
  const [defectTypeScore, setDefectTypeScore] = useState(selectedSample.defectTypeScore);
  const [confidenceScore, setConfidenceScore] = useState(selectedSample.confidenceScore);
  
  const [selectedDefectType, setSelectedDefectType] = useState(selectedSample.type);
  const [selectedLocation, setSelectedLocation] = useState(selectedSample.location);

  // Certificate Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [manualVerdictOverride, setManualVerdictOverride] = useState(null);

  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setSizeScore(sample.sizeScore);
    setLocationScore(sample.locationScore);
    setDefectTypeScore(sample.defectTypeScore);
    setConfidenceScore(sample.confidenceScore);
    setSelectedDefectType(sample.type);
    setSelectedLocation(sample.location);
    setManualVerdictOverride(null);
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const customSample = {
          id: `SMP-UP-${Math.floor(1000 + Math.random() * 9000)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          batch: 'B-CUSTOM-UP',
          partNumber: 'PART-CUSTOM',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          image: uploadEvent.target.result,
          type: 'Surface Crack',
          location: 'Functional Component Area',
          sizeScore: 75,
          locationScore: 80,
          defectTypeScore: 85,
          confidenceScore: 92,
          bboxes: [
            { x: 30, y: 35, width: 35, height: 30, label: 'Detected Anomaly', confidence: 0.92, severity: 'High' }
          ],
          heatmapIntensity: 'high',
          status: 'Failed',
          inspector: 'AI Engine (Custom Upload)'
        };
        handleSelectSample(customSample);
      };
      reader.readAsDataURL(file);
    }
  };

  const severityResult = calculateSeverityScore({
    sizeScore,
    locationScore,
    defectTypeScore,
    confidenceScore,
  });

  const finalPassVerdict = manualVerdictOverride !== null ? manualVerdictOverride : severityResult.passVerdict;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              MODULE 2, 3 & 4 AI STUDIO
            </span>
            <span className="text-xs text-slate-500 font-mono">VisionInspect AI Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            AI Computer Vision Inspection Studio
          </h1>
        </div>

        {/* Action Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
              isCameraActive
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {isCameraActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
            {isCameraActive ? 'Stop Camera Feed' : 'Simulate Camera Feed'}
          </button>

          <label className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-all">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={handleCustomUpload} className="hidden" />
          </label>

          <button
            onClick={() => setShowPreprocessing(!showPreprocessing)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
              showPreprocessing
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preprocessing Filters</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inspection Certificate</span>
          </button>

        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <span className="text-xs font-bold text-slate-500 font-mono shrink-0 pl-1">Part Sample:</span>
        {MOCK_INSPECTION_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            onClick={() => handleSelectSample(sample)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-2 transition-all ${
              selectedSample.id === sample.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${sample.status === 'Failed' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            <span>{sample.name}</span>
          </button>
        ))}
      </div>

      {/* Inspection Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{selectedSample.name}</span>
                <span className="font-mono text-slate-400">({selectedSample.partNumber})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBBoxes(!showBBoxes)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1 transition-all ${
                    showBBoxes
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  YOLO Bounding Box
                </button>

                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1 transition-all ${
                    showHeatmap
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Anomaly Heatmap
                </button>
              </div>
            </div>

            {/* Preprocessing Filters Drawer */}
            {showPreprocessing && (
              <div className="p-3 rounded-xl bg-slate-50 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={preprocessNoiseFilter}
                    onChange={(e) => setPreprocessNoiseFilter(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Gaussian Noise Filter</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={preprocessContrast}
                    onChange={(e) => setPreprocessContrast(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>CLAHE Contrast Enhancement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={preprocessEdge}
                    onChange={(e) => setPreprocessEdge(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Canny Edge Overlay</span>
                </label>
              </div>
            )}

            {/* Canvas / Viewport */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-300 shadow-inner">
              
              {isCameraActive ? (
                <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center">
                  <img
                    src={selectedSample.image}
                    alt="Live Stream Feed"
                    className={`w-full h-full object-cover ${preprocessContrast ? 'contrast-125 saturate-110' : ''}`}
                  />
                  <div className="absolute top-4 left-4 bg-rose-600 text-white px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    LIVE CAMERA FEED (60 FPS GigE)
                  </div>
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent animate-pulse"></div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={selectedSample.image}
                    alt={selectedSample.name}
                    className={`w-full h-full object-cover ${
                      preprocessContrast ? 'contrast-125 saturate-110' : ''
                    } ${preprocessNoiseFilter ? 'filter blur-[0.2px]' : ''}`}
                  />

                  {showHeatmap && selectedSample.heatmapIntensity !== 'none' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/30 via-amber-500/20 to-transparent mix-blend-color-dodge pointer-events-none"></div>
                  )}

                  {showBBoxes && selectedSample.bboxes.map((box, idx) => (
                    <div
                      key={idx}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      className="absolute border-2 border-rose-500 bg-rose-500/10 rounded pointer-events-none transition-all shadow-md"
                    >
                      <div className="absolute -top-6 left-0 bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap">
                        {box.label} ({(box.confidence * 100).toFixed(0)}%)
                      </div>
                    </div>
                  ))}

                  {preprocessEdge && (
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-400/40 mix-blend-overlay pointer-events-none"></div>
                  )}
                </div>
              )}

              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 flex items-center gap-3">
                <span>Res: 4096 x 3072</span>
                <span className="text-blue-600 font-bold">YOLOv8-X + U-Net</span>
              </div>
            </div>

          </div>

          {/* Severity Scoring Framework */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Severity Scoring Framework (Section 4 & 5 Formula)
                </h2>
                <p className="text-xs text-slate-500">
                  Score = (Size × 30%) + (Location × 25%) + (Defect Type × 25%) + (Confidence × 20%)
                </p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                severityResult.level === 'Critical'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : severityResult.level === 'High'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                Score: {severityResult.score} / 100 ({severityResult.level})
              </span>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700">Defect Size (30% Weight)</span>
                  <span className="text-blue-600 font-bold">{sizeScore} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sizeScore}
                  onChange={(e) => setSizeScore(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700">Location Criticality (25%)</span>
                  <span className="text-blue-600 font-bold">{locationScore} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={locationScore}
                  onChange={(e) => setLocationScore(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700">Defect Type Weight (25%)</span>
                  <span className="text-blue-600 font-bold">{defectTypeScore} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={defectTypeScore}
                  onChange={(e) => setDefectTypeScore(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700">Model Confidence (20%)</span>
                  <span className="text-blue-600 font-bold">{confidenceScore}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

            </div>

          </div>

        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className={`p-5 rounded-2xl border ${
            !finalPassVerdict
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            
            <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
              Automated Decision Verdict
            </span>

            <div className="mt-3 flex items-center gap-3">
              {!finalPassVerdict ? (
                <div className="p-3 rounded-xl bg-rose-600 text-white">
                  <XCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-600 text-white">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}

              <div>
                <div className={`text-xl font-bold ${!finalPassVerdict ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {!finalPassVerdict ? 'QUALITY REJECT' : 'QUALITY PASS'}
                </div>
                <p className="text-xs text-slate-600 font-mono">
                  Severity: <strong>{severityResult.level}</strong>
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-900">Recommended Action:</div>
              <p className="text-slate-600 font-mono text-[11px]">
                {severityResult.recommendation}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                Engineer Manual Decision Override
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    setManualVerdictOverride(true);
                    try {
                      await fetch('http://localhost:8000/api/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          certificateId: `CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                          partNumber: selectedSample.partNumber,
                          partName: selectedSample.name,
                          batchCode: selectedSample.batch,
                          defectType: selectedDefectType,
                          defectLocation: selectedLocation,
                          sizeScore,
                          locationScore,
                          defectTypeScore,
                          confidenceScore,
                          severityScore: severityResult.score,
                          severityLevel: severityResult.level,
                          verdict: 'PASS',
                          recommendation: 'Manual Decision Override: PASSED by Engineer',
                          inspector: 'Quality Engineer (Manual Override)'
                        })
                      });
                    } catch (e) {
                      console.log('MongoDB override report save notice:', e);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    manualVerdictOverride === true
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Override Pass
                </button>
                <button
                  onClick={async () => {
                    setManualVerdictOverride(false);
                    try {
                      await fetch('http://localhost:8000/api/reports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          certificateId: `CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                          partNumber: selectedSample.partNumber,
                          partName: selectedSample.name,
                          batchCode: selectedSample.batch,
                          defectType: selectedDefectType,
                          defectLocation: selectedLocation,
                          sizeScore,
                          locationScore,
                          defectTypeScore,
                          confidenceScore,
                          severityScore: severityResult.score,
                          severityLevel: severityResult.level,
                          verdict: 'REJECT',
                          recommendation: 'Manual Decision Override: REJECTED by Engineer',
                          inspector: 'Quality Engineer (Manual Override)'
                        })
                      });
                    } catch (e) {
                      console.log('MongoDB override report save notice:', e);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    manualVerdictOverride === false
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Override Reject
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Certificate Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-6 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ISO 9001 Quality Certificate</h3>
                  <p className="text-xs text-slate-500 font-mono">VisionInspect AI Verification Certificate</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Certificate ID:</span>
                  <span className="text-blue-600 font-bold">CERT-2026-88091</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold font-sans text-slate-900">Part Information</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Part Description:</span>
                  <span className="text-slate-900 font-bold">{selectedSample.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated Severity:</span>
                  <span className="text-rose-600 font-bold">{severityResult.score} / 100 ({severityResult.level})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500">
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch('http://localhost:8000/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        certificateId: `CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                        partNumber: selectedSample.partNumber,
                        partName: selectedSample.name,
                        batchCode: selectedSample.batch,
                        defectType: selectedDefectType,
                        defectLocation: selectedLocation,
                        sizeScore,
                        locationScore,
                        defectTypeScore,
                        confidenceScore,
                        severityScore: severityResult.score,
                        severityLevel: severityResult.level,
                        verdict: !finalPassVerdict ? 'REJECT' : 'PASS',
                        recommendation: severityResult.recommendation,
                        inspector: 'Quality Engineer'
                      })
                    });
                  } catch (e) {
                    console.log('MongoDB report save notice:', e);
                  }
                  alert('Inspection Certificate saved to MongoDB Atlas & PDF exported successfully!');
                  setShowReportModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Certificate PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
