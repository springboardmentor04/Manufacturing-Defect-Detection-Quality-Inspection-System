declare module 'react';
import React, { useState, useEffect } from 'react';
import { InspectionRecord, PreprocessingOptions, MVTecSample } from '../types';
import { ImagePreprocessor } from '../components/ImagePreprocessor';
import { SeverityBadge } from '../components/SeverityBadge';
import { InspectionDetailModal } from '../components/InspectionDetailModal';
import { MVTEC_SAMPLES } from '../data/mvtecSamples';
import { uploadInspection, fetchInspections } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Upload, Scan, Play, CheckCircle2, AlertTriangle, FileText, History, Sliders, Image as ImageIcon, RefreshCw, Eye } from 'lucide-react';

export const QualityEngineerDashboard: React.FC = () => {
  const { user } = useAuth();

  // State
  const [selectedSample, setSelectedSample] = useState<MVTecSample>(MVTEC_SAMPLES[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [productName, setProductName] = useState(MVTEC_SAMPLES[0].productName);
  const [productCategory, setProductCategory] = useState(MVTEC_SAMPLES[0].productCategory);
  const [factoryLine, setFactoryLine] = useState(user?.assignedLine || 'Assembly Line A1');
  const [comments, setComments] = useState('');

  const [preprocessing, setPreprocessing] = useState<PreprocessingOptions>({
    noiseRemoval: true,
    claheContrast: true,
    edgeDetection: false,
    roiCrop: false
  });

  const [inspecting, setInspecting] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<InspectionRecord | null>(null);
  const [history, setHistory] = useState<InspectionRecord[]>([]);
  const [selectedModalRecord, setSelectedModalRecord] = useState<InspectionRecord | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchInspections();
      setHistory(data);
      if (data.length > 0 && !currentInspection) {
        setCurrentInspection(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSampleSelect = (sample: MVTecSample) => {
    setSelectedSample(sample);
    setCustomImage(null);
    setProductName(sample.productName);
    setProductCategory(sample.productCategory);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImage(reader.result as string);
        setProductName(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunInspection = async () => {
    setInspecting(true);
    try {
      const imageUrl = customImage || selectedSample.imageUrl;
      const result = await uploadInspection({
        productName,
        productCategory,
        factoryLine,
        imageUrl,
        preprocessing,
        comments
      });

      setCurrentInspection(result);
      setHistory((prev) => [result, ...prev]);
    } catch (err) {
      console.error('Inspection failed:', err);
    } finally {
      setInspecting(false);
    }
  };

  const activeImageUrl = customImage || selectedSample.imageUrl;
  const filteredHistory = history.filter((item) => {
    if (filter === 'PASS') return item.passFail === 'PASS';
    if (filter === 'FAIL') return item.passFail === 'FAIL';
    return true;
  });

  return (
    <div className="space-y-8 py-4">
      
      {/* Station Header */}
      <div id="section-dashboard" className="glass-card p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-600/10 px-3 py-1 rounded-full border border-teal-600/20 w-fit mb-2">
            <Scan className="w-3.5 h-3.5 text-teal-700" />
            <span>YOLOv8 Pre-trained Object Detection Engine • Quality Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Product Quality Inspection & Anomaly Localization</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Quality Engineer: <span className="font-bold text-slate-700">{user?.fullName}</span> | Model: <span className="font-bold text-teal-700">YOLOv8-Industrial-Seg (PyTorch/ONNX)</span>
          </p>
        </div>

        <button
          onClick={handleRunInspection}
          disabled={inspecting}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-full shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {inspecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running YOLOv8 Object Detection...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Trigger YOLOv8 Inspection</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Upload & Acquisition (Left) vs Real-Time Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Acquisition & Preprocessor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sample Dataset Picker & Custom File Upload */}
          <div id="section-upload" className="glass-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Image Acquisition</span>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-500/10 px-2 py-0.5 rounded-full">YOLOv8 Input Stream</span>
            </div>

            {/* MVTec Sample Selector Bar */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">Select Industrial Sample:</label>
              <div className="grid grid-cols-3 gap-2">
                {MVTEC_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSampleSelect(sample)}
                    className={`p-1.5 rounded-xl border text-left transition-all ${
                      selectedSample.id === sample.id && !customImage
                        ? 'border-teal-600 bg-teal-600/10 shadow-xs ring-1 ring-teal-600/30'
                        : 'border-white/80 bg-white/40 hover:bg-white/80'
                    }`}
                  >
                    <img 
                      src={sample.imageUrl} 
                      alt={sample.productName} 
                      className="w-full h-12 object-cover rounded-lg mb-1" 
                    />
                    <span className="text-[10px] font-bold text-slate-800 truncate block">{sample.productName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-300/80 hover:border-teal-600 rounded-2xl p-4 text-center transition-colors bg-white/40 backdrop-blur-md">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-1 block">
                <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                <span className="text-xs font-bold text-teal-700 block">Click to upload custom product image</span>
                <span className="text-[10px] text-slate-400 block font-medium">Supports PNG, JPG, BMP up to 20MB</span>
              </label>
            </div>

            {/* Product Meta Form Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <input
                  type="text"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-medium"
                />
              </div>
            </div>

            {/* Preprocessing Controls Component */}
            <ImagePreprocessor options={preprocessing} onChange={setPreprocessing} disabled={inspecting} />

          </div>

        </div>

        {/* Right Column: Live Defect Detection & Severity Analysis (7 cols) */}
        <div id="section-results" className="lg:col-span-7 space-y-6">
          
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Inspection Pipeline Output</span>
                <span className="text-[10px] text-teal-800 font-medium">YOLOv8 Object Detection Bounding Box & Class Confidence</span>
              </div>

              {currentInspection && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
                    currentInspection.passFail === 'PASS' 
                      ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/30' 
                      : 'bg-red-500/10 text-red-800 border border-red-500/30'
                  }`}>
                    {currentInspection.passFail}
                  </span>
                  <SeverityBadge level={currentInspection.severityLevel} score={currentInspection.severityScore} />
                </div>
              )}
            </div>

            {/* Interactive Image View with Bounding Box Overlay */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-300/80 aspect-video bg-slate-900 flex items-center justify-center">
              <img 
                src={activeImageUrl} 
                alt="Product Preview" 
                className={`w-full h-full object-contain ${
                  preprocessing.edgeDetection ? 'invert grayscale contrast-200' : ''
                }`}
              />

              {/* Anomaly Bounding Box Overlay if inspection exists */}
              {currentInspection && currentInspection.defects.length > 0 && (
                <div 
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg flex items-start p-1 transition-all"
                  style={{
                    left: `${currentInspection.defects[0].boundingBox.x}%`,
                    top: `${currentInspection.defects[0].boundingBox.y}%`,
                    width: `${currentInspection.defects[0].boundingBox.width}%`,
                    height: `${currentInspection.defects[0].boundingBox.height}%`
                  }}
                >
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    {currentInspection.defects[0].defectType} ({currentInspection.defects[0].confidence}%)
                  </span>
                </div>
              )}
            </div>

            {/* Severity Scoring & Breakdown Grid */}
            {currentInspection ? (
              <div id="section-defects" className="bg-white/50 p-4 rounded-2xl border border-white/80 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Defect Classification & Multi-Factor Severity Score</span>
                  <span className="font-mono text-teal-700 font-extrabold text-sm">
                    Score: {currentInspection.severityScore.toFixed(1)} / 100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Size (30%)</span>
                    <span className="font-bold text-slate-800">
                      +{((currentInspection.defects[0]?.sizeScore || 50) * 0.3).toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Location (25%)</span>
                    <span className="font-bold text-slate-800">
                      +{((currentInspection.defects[0]?.locationScore || 50) * 0.25).toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Type (25%)</span>
                    <span className="font-bold text-slate-800">
                      +{(currentInspection.severityScore * 0.25).toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Confidence (20%)</span>
                    <span className="font-bold text-slate-800">
                      +{((currentInspection.defects[0]?.confidence || 85) * 0.2).toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span>Recommendation: <strong className="text-slate-800">
                    {currentInspection.passFail === 'PASS' ? 'Approve for Packaging' : 'Quarantine Product & Trigger Rework'}
                  </strong></span>
                  
                  <button
                    onClick={() => setSelectedModalRecord(currentInspection)}
                    className="text-teal-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Full Quality Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/40 p-4 rounded-2xl border border-white/60 text-center text-xs text-slate-500 py-6 font-medium">
                Click "Trigger Manual AI Inspection" to run defect pipeline on the selected product image.
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Quality Reports & Inspection History Table */}
      <div id="section-history" className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Inspection History & Quality Audit Log</h3>
            <p className="text-xs text-slate-500 font-medium">Historical defect logs and automated pass/fail decisions</p>
          </div>

          {/* Pass/Fail Filter Buttons */}
          <div className="flex items-center gap-1 bg-white/40 p-1 rounded-2xl text-xs font-semibold border border-white/60">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setFilter('PASS')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filter === 'PASS' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Pass ({history.filter(h => h.passFail === 'PASS').length})
            </button>
            <button
              onClick={() => setFilter('FAIL')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filter === 'FAIL' ? 'bg-white text-red-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Fail ({history.filter(h => h.passFail === 'FAIL').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Factory Line</th>
                <th className="py-2.5 px-3">Defect Type</th>
                <th className="py-2.5 px-3">Severity Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 font-medium">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-700">{item.inspectionCode}</td>
                  <td className="py-3 px-3 text-slate-900 font-bold">{item.productName}</td>
                  <td className="py-3 px-3 text-slate-500">{item.factoryLine}</td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {item.defects[0]?.defectType || 'None'}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge level={item.severityLevel} score={item.severityScore} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.passFail === 'PASS' ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-red-500/10 text-red-800 border border-red-500/20'
                    }`}>
                      {item.passFail}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedModalRecord(item)}
                      className="px-3 py-1 text-xs font-bold text-teal-700 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-600/20 rounded-full transition-all"
                    >
                      Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Detail Modal */}
      <InspectionDetailModal
        record={selectedModalRecord}
        onClose={() => setSelectedModalRecord(null)}
      />

    </div>
  );
};
