import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionAPI } from '../api';
import Navbar from '../components/Navbar';

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const DECISION_STYLE = {
  Pass: 'bg-green-600 text-white shadow-green-100',
  Fail: 'bg-red-600 text-white shadow-red-100',
  'Manual Review': 'bg-amber-500 text-white shadow-amber-100',
};

// Actionable manufacturing recommendations based on severity levels
const RECOMMENDATIONS = {
  Critical: {
    action: "REJECT PRODUCT & INITIATE DEFECT TICKET",
    steps: [
      "Immediately route the product to the Rejection bin.",
      "Trigger the Quality Control Workflow and halt the current batch.",
      "Check calibration and noise limits on the manufacturing line.",
      "Notify the Factory Supervisor for immediate machine diagnostic validation."
    ],
    color: "text-red-800 bg-red-50 border-red-200"
  },
  High: {
    action: "FLAG FOR REWORK / REPAIR QUEUE",
    steps: [
      "Route the product to the manual rework station for corrective maintenance.",
      "Flag this product ID in the inventory system as 'Rework Required'.",
      "Inspect surrounding products in the same batch to check for matching defect trends."
    ],
    color: "text-orange-800 bg-orange-50 border-orange-200"
  },
  Medium: {
    action: "REQUEST QUALITY ENGINEER CONFIRMATION",
    steps: [
      "Route the product to a secondary inspection queue.",
      "An authorized Quality Engineer must visually review this visual anomaly.",
      "Confirm if anomaly impacts critical component function or is cosmetic."
    ],
    color: "text-amber-800 bg-amber-50 border-amber-200"
  },
  Low: {
    action: "ACCEPT PRODUCT / LOG COSMETIC DEVIATION",
    steps: [
      "Product quality meets shipping clearance standards.",
      "Proceed with shipping and dispatch log.",
      "No corrective actions are needed for this minor cosmetic anomaly."
    ],
    color: "text-green-800 bg-green-50 border-green-200"
  }
};

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value ?? '—'}</span>
    </div>
  );
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Image toggle state: 'original', 'preprocessed', 'annotated'
  const [imageMode, setImageMode] = useState('annotated');
  
  // Custom inspection parameters for re-run
  const [blurKernel, setBlurKernel] = useState(5);
  const [claheClip, setClaheClip] = useState(2.0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [reRunning, setReRunning] = useState(false);

  // Initial load
  useEffect(() => {
    inspectionAPI.get(id)
      .then(({ data }) => {
        setInspection(data);
        if (data.preprocessing_details) {
          setBlurKernel(data.preprocessing_details.blur_kernel ?? 5);
          setClaheClip(data.preprocessing_details.clahe_clip ?? 2.0);
          setConfidenceThreshold(data.preprocessing_details.confidence_threshold ?? 0.50);
        }
        if (data.status === 'completed') {
          setImageMode('annotated');
        } else {
          setImageMode('original');
        }
      })
      .catch(() => setError('Inspection not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Polling logic when pending/processing
  useEffect(() => {
    let interval = null;
    if (inspection && (inspection.status === 'pending' || inspection.status === 'processing')) {
      interval = setInterval(() => {
        inspectionAPI.get(id)
          .then(({ data }) => {
            setInspection(data);
            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(interval);
            }
          })
          .catch(() => clearInterval(interval));
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, inspection?.status]);

  const handleReRun = async (e) => {
    e.preventDefault();
    setReRunning(true);
    try {
      const { data } = await inspectionAPI.inspect(id, {
        blur_kernel: parseInt(blurKernel),
        clahe_clip: parseFloat(claheClip),
        confidence_threshold: parseFloat(confidenceThreshold),
      });
      setInspection(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to trigger re-run');
    } finally {
      setReRunning(false);
    }
  };

  // Get active image URL
  const getImageUrl = () => {
    if (!inspection) return '';
    if (imageMode === 'preprocessed' && inspection.preprocessed_filename) {
      return `${process.env.REACT_APP_API_URL}/uploads/${inspection.preprocessed_filename}?t=${new Date().getTime()}`;
    }
    if (imageMode === 'annotated' && inspection.annotated_filename) {
      return `${process.env.REACT_APP_API_URL}/uploads/${inspection.annotated_filename}?t=${new Date().getTime()}`;
    }
    return `${process.env.REACT_APP_API_URL}/uploads/${inspection.filename}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const isCompleted = inspection?.status === 'completed';
  const severityRec = isCompleted ? RECOMMENDATIONS[inspection.severity_level] || RECOMMENDATIONS.Low : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 print:bg-white print:pb-0">
      {/* Hide navbar on print */}
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-full">
        {/* Style tag containing print overrides */}
        <style>{`
          @media print {
            .no-print, nav, button, form, select, input {
              display: none !important;
            }
            body {
              background: white !important;
              color: black !important;
              font-size: 12px !important;
            }
            .print-grid {
              display: block !important;
            }
            .print-card {
              border: 1px solid #E5E7EB !important;
              box-shadow: none !important;
              margin-bottom: 1.5rem !important;
              page-break-inside: avoid !important;
            }
            .print-header {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              border-bottom: 2px solid #E5E7EB !important;
              padding-bottom: 1rem !important;
              margin-bottom: 1.5rem !important;
            }
          }
        `}</style>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4 no-print">
          <button onClick={() => navigate('/inspections')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Inspections
          </button>
          {isCompleted && (
            <button
              onClick={handlePrint}
              className="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Quality Report
            </button>
          )}
        </div>

        {/* Printable Header (Visible only when printing) */}
        {inspection && (
          <div className="hidden print-header">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">VisionInspect Quality Report</h1>
              <p className="text-xs text-gray-500">Inspection ID: #{inspection.id} · Category: <span className="capitalize">{inspection.product_category}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-600">VisionInspect AI Platform</p>
              <p className="text-[10px] text-gray-400">{new Date(inspection.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">Loading inspection details...</div>}
        {error && <div className="text-center py-12 text-red-500 font-medium">{error}</div>}

        {inspection && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print-grid">
            
            {/* Left Column: Image Viewer + Control Tuning */}
            <div className="lg:col-span-7 space-y-6">
              {/* Image Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-card">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between no-print">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Image Viewer</span>
                  {isCompleted && (
                    <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-medium">
                      <button
                        onClick={() => setImageMode('original')}
                        className={`px-3 py-1 rounded-md transition-all ${imageMode === 'original' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setImageMode('preprocessed')}
                        className={`px-3 py-1 rounded-md transition-all ${imageMode === 'preprocessed' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        Preprocessed
                      </button>
                      <button
                        onClick={() => setImageMode('annotated')}
                        className={`px-3 py-1 rounded-md transition-all ${imageMode === 'annotated' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        Detections
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Print Title for Image */}
                <div className="hidden print:block p-3 bg-gray-50 border-b font-semibold text-xs text-gray-700">
                  Defect Localization View ({imageMode.toUpperCase()})
                </div>
                
                <div className="p-6 flex items-center justify-center min-h-[350px] bg-slate-900 print:bg-white print:border-0 print:p-0">
                  <img
                    src={getImageUrl()}
                    alt={inspection.original_filename}
                    className="max-h-[450px] max-w-full rounded-lg object-contain border border-slate-800 shadow-lg print:shadow-none print:border print:border-gray-200"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* Parameter Tuning Control */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 no-print">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Inspect Parameter Tuning
                </h3>
                <form onSubmit={handleReRun} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Gaussian Blur (Noise)</label>
                    <select
                      value={blurKernel}
                      onChange={(e) => setBlurKernel(e.target.value)}
                      disabled={reRunning || inspection.status === 'processing'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="0">Off (No Blur)</option>
                      <option value="1">1x1 (Minimal)</option>
                      <option value="3">3x3 (Soft)</option>
                      <option value="5">5x5 (Recommended)</option>
                      <option value="7">7x7 (Medium)</option>
                      <option value="9">9x9 (Strong)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">CLAHE Contrast</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={claheClip}
                      disabled={reRunning || inspection.status === 'processing'}
                      onChange={(e) => setClaheClip(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600">Conf Threshold</label>
                      <span className="text-[10px] font-bold text-indigo-600">{Math.round(confidenceThreshold * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.95"
                      step="0.05"
                      value={confidenceThreshold}
                      disabled={reRunning || inspection.status === 'processing'}
                      onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-2.5"
                    />
                  </div>
                  <div className="sm:col-span-3 mt-2">
                    <button
                      type="submit"
                      disabled={reRunning || inspection.status === 'processing'}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {reRunning || inspection.status === 'processing' ? 'Running Inspection...' : 'Re-Run Inspection Analysis'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Report Card + Details */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Quality Control Report Card */}
              {isCompleted ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-card">
                  <div className={`p-6 text-center shadow-inner ${DECISION_STYLE[inspection.decision] || 'bg-gray-600 text-white'} print:text-black print:bg-white print:border-b print:shadow-none`}>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-85 print:text-gray-500">Quality Control Decision</span>
                    <h2 className="text-3xl font-extrabold mt-1 tracking-tight print:text-gray-800">{inspection.decision}</h2>
                    <p className="text-xs mt-2 opacity-90 print:text-gray-600">
                      {inspection.defect_detected 
                        ? `${inspection.defect_count} defect(s) detected with ${inspection.severity_level.toLowerCase()} severity.` 
                        : 'No defects detected in this product image.'}
                    </p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Severity meter */}
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs font-semibold text-gray-600">
                        <span>Overall Severity Score</span>
                        <span className="font-bold text-gray-800">{inspection.severity_score} / 100</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 print:border">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            inspection.severity_level === 'Critical' ? 'bg-red-600' :
                            inspection.severity_level === 'High' ? 'bg-orange-500' :
                            inspection.severity_level === 'Medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${inspection.severity_score}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                        <span>Low (0-39)</span>
                        <span>Medium (40-59)</span>
                        <span>High (60-79)</span>
                        <span>Critical (80+)</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-xs font-bold text-gray-800 block mb-2">Pre-processing Applied</span>
                      <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded-lg p-3 print:bg-white print:border">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Blur Kernel</span>
                          <span className="font-semibold text-gray-700">{inspection.preprocessing_details?.blur_kernel ?? '—'}x{inspection.preprocessing_details?.blur_kernel ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">CLAHE Limit</span>
                          <span className="font-semibold text-gray-700">{inspection.preprocessing_details?.clahe_clip ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Conf Limit</span>
                          <span className="font-semibold text-gray-700">
                            {inspection.preprocessing_details?.confidence_threshold 
                              ? `${Math.round(inspection.preprocessing_details.confidence_threshold * 100)}%` 
                              : '50%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center space-y-4 print-card">
                  <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 animate-pulse no-print">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Processing Inspection</h3>
                    <p className="text-xs text-gray-500 mt-1">Image is undergoing noise removal, CLAHE enhancement, and YOLO defect detection.</p>
                  </div>
                  <div className={`text-xs px-3 py-1.5 rounded-full inline-block font-semibold border ${STATUS_STYLE[inspection.status]}`}>
                    Status: {inspection.status}
                  </div>
                </div>
              )}

              {/* Actionable QC Recommendations (Gap Fix) */}
              {isCompleted && severityRec && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print-card">
                  <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Operational Recommendation</h3>
                  <div className={`border rounded-xl p-4 ${severityRec.color}`}>
                    <span className="text-[10px] font-extrabold tracking-wider block mb-1">RECOMMENDED ACTION</span>
                    <h4 className="text-sm font-extrabold">{severityRec.action}</h4>
                    <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs font-medium opacity-90">
                      {severityRec.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Defect Details List */}
              {isCompleted && inspection.defect_detected && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print-card">
                  <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider text-gray-400">Defect Anomaly Details</h3>
                  <div className="space-y-3">
                    {inspection.defects_details?.map((defect, index) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-xs print:bg-white print:border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-red-600 uppercase">Defect #{index + 1}</span>
                          <span className="bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded text-[10px] print:border">
                            Severity: {defect.severity_score}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                          <div><span className="text-gray-400">Model Conf:</span> {(defect.confidence * 100).toFixed(1)}%</div>
                          <div><span className="text-gray-400">Size Score:</span> {defect.size_score}%</div>
                          <div><span className="text-gray-400">Location Score:</span> {defect.location_score}%</div>
                          <div><span className="text-gray-400">BBox:</span> [{defect.bbox.map(x => Math.round(x)).join(', ')}]</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Metadata */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print-card">
                <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider text-gray-400">File Metadata</h3>
                <div className="space-y-0.5">
                  <MetaRow label="Inspection ID" value={`#${inspection.id}`} />
                  <MetaRow label="Filename" value={inspection.original_filename} />
                  <MetaRow label="Product Category" value={inspection.product_category} />
                  <MetaRow
                    label="Resolution"
                    value={inspection.image_width && inspection.image_height
                      ? `${inspection.image_width} × ${inspection.image_height} px`
                      : null}
                  />
                  <MetaRow
                    label="File Size"
                    value={inspection.file_size ? `${(inspection.file_size / 1024).toFixed(1)} KB` : null}
                  />
                  <MetaRow
                    label="Acquisition Time"
                    value={new Date(inspection.created_at).toLocaleString()}
                  />
                </div>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
