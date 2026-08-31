import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { UploadCloud, ImageIcon, Play, Download, Trash2, Eye, RefreshCw, AlertCircle } from 'lucide-react';

export default function UploadImagePage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!selectedFile) {
      setError('Please select or upload a component image file first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('product_code', 'PRD-BOTTLE-001');
      formData.append('product_category', 'bottle');
      formData.append('production_line_code', 'LINE-A1');

      const res = await fetch('/api/v1/quality/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.status === 401) {
        navigate('/login');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Inspection failed. Please try again.');
        setIsAnalyzing(false);
        return;
      }

      const data = await res.json();
      const inspectionId = data.inspection_id || data.id || data.inspection_code;

      if (inspectionId) {
        navigate(`/quality/inspection-result/${inspectionId}`);
      } else {
        setError('Inspection completed but no inspection ID returned.');
      }
    } catch (err) {
      console.error("Analysis network error:", err);
      setError('Inspection failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setError(null);
  };

  return (
    <DashboardLayout
      title="Upload Component Image"
      subtitle="Quality Engineer Portal - Image Upload Dropzone & Optical Preview"
    >
      <div className="space-y-6">
        
        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-2xl p-4 text-xs text-[#EF4444] font-semibold flex items-center gap-2 shadow-xl">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase pl-2">Inspection Commands:</span>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedImage}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Image'}</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#1F2937] hover:bg-[#EF4444]/20 text-xs font-bold text-[#EF4444] border border-gray-700 rounded-xl cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Upload & Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Upload Component Box */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#2563EB]" />
                <span>Upload Section</span>
              </h2>
              <p className="text-xs text-gray-400">Upload high-resolution camera capture for optical AI model inference</p>
            </div>

            <label className="relative border-2 border-dashed border-[#1F2937] hover:border-[#2563EB] bg-[#1F2937]/30 hover:bg-[#1F2937]/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <UploadCloud className="w-12 h-12 text-[#2563EB] mb-3" />
              <p className="text-sm font-semibold text-white">Drag & Drop Optical Image Here</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Supports PNG, JPG, BMP up to 25MB</p>
              <span className="px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-md">
                Browse Image Button
              </span>
            </label>
          </div>

          {/* Uploaded Image Preview */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#22C55E]" />
                <span>Uploaded Image Preview</span>
              </h2>
              <span className="text-xs font-mono text-gray-400">Part: PCB-8092</span>
            </div>

            <div className="relative w-full h-80 bg-[#0B0F19] rounded-xl border border-[#1F2937] overflow-hidden flex items-center justify-center">
              {selectedImage ? (
                <img src={selectedImage} alt="Component Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-500 space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-600" />
                  <p className="text-xs">No image loaded. Use the upload box on the left.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
