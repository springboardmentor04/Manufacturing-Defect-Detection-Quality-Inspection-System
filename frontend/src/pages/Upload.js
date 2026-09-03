import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { inspectionAPI } from '../api';
import Navbar from '../components/Navbar';

const MVTEC_CATEGORIES = [
  'bottle', 'cable', 'capsule', 'carpet', 'grid',
  'hazelnut', 'leather', 'metal_nut', 'pill', 'screw',
  'tile', 'toothbrush', 'transistor', 'wood', 'zipper',
];

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batchFinished, setBatchFinished] = useState(false);

  const onDrop = useCallback((accepted) => {
    setError('');
    const newFiles = accepted.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      status: 'pending', // pending, uploading, completed, failed
      error: ''
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'] },
  });

  const removeFile = (id) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target && target.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearQueue = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setBatchFinished(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please add at least one image to the queue.');
      return;
    }
    setLoading(true);
    setBatchFinished(false);
    setError('');

    // Sequentially process each file in the batch
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'completed') continue; // Skip already uploaded

      // Update status to uploading
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        if (category) {
          formData.append('product_category', category);
        }
        await inspectionAPI.upload(formData);
        
        // Update status to completed
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed' } : f));
      } catch (err) {
        const errMsg = err.response?.data?.detail || 'Upload failed';
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'failed', error: errMsg } : f));
      }
    }

    setLoading(false);
    setBatchFinished(true);
  };

  const handleCameraSimulation = async () => {
    setLoading(true);
    setError('');
    try {
      await inspectionAPI.simulateCamera();
      navigate('/inspections');
    } catch (err) {
      setError(err.response?.data?.detail || 'Camera simulation failed');
      setLoading(false);
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const isUploadActive = files.some(f => f.status === 'uploading');

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Acquisition & Batch Inspection</h2>
            <p className="text-sm text-gray-500 mt-1">Upload multiple product images for parallel manufacturing defect analysis</p>
          </div>
          <button
            type="button"
            onClick={handleCameraSimulation}
            disabled={loading || isUploadActive}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Simulate Camera Feed
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form & Dropzone */}
          <div className="lg:col-span-6 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product Category (MVTec AD)</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={category}
                  disabled={loading || isUploadActive}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {MVTEC_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">If blank, category will be auto-inferred where possible.</p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-indigo-500 bg-indigo-50 scale-[0.99]' 
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-slate-50'
                } ${loading || isUploadActive ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm font-semibold">Drag & drop images here</p>
                    <p className="text-gray-400 text-xs mt-1">Supports JPEG, PNG, BMP, TIFF (Max 10MB per file)</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearQueue}
                  disabled={files.length === 0 || loading || isUploadActive}
                  className="w-1/3 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Clear Queue
                </button>
                <button
                  type="submit"
                  disabled={loading || isUploadActive || files.length === 0 || completedCount === files.length}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? `Uploading (${completedCount}/${files.length})...` : 'Start Inspection Queue'}
                </button>
              </div>

              {batchFinished && (
                <div className="bg-indigo-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div>
                    <h4 className="text-indigo-800 font-bold text-sm">Batch Processing Finished</h4>
                    <p className="text-xs text-indigo-600">
                      Successfully processed {completedCount} product(s). {failedCount > 0 ? `Failed ${failedCount} upload(s).` : 'No errors.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/inspections')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
                  >
                    View Inspections
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Processing Queue Details */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 min-h-[300px]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Acquisition Queue ({files.length})
                </h3>
                {files.length > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                    {completedCount} / {files.length} Done
                  </span>
                )}
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Queue is empty. Select or drag images to get started.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {files.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={item.preview} 
                          alt="thumbnail" 
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-white"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-700 truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(item.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'pending' && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            Queued
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
                            Inspecting...
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Success
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full" title={item.error}>
                              Failed
                            </span>
                          </div>
                        )}

                        {!loading && !isUploadActive && (
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
