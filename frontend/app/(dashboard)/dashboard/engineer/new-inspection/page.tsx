"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, FileImage, X, CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ClientOnly } from "@/components/ClientOnly";
import { DetectionPreview } from "@/components/dashboard/DetectionPreview";

import { getApiBaseUrl } from "@/lib/api";

// Types
type Category = { name: string; is_valid: boolean };
type InspectionRecord = {
  inspection_id: string;
  dataset_category: string;
  image_path: string;
  status: string;
  upload_time: string;
  inspection_result?: string;
  confidence?: number;
  defect_type?: string;
  severity?: string;
  processing_time?: number;
  bounding_boxes?: number[][];
  segmentation_masks?: number[][][];
  error_message?: string;
};

export default function NewInspectionPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [createdInspection, setCreatedInspection] = useState<InspectionRecord | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_CATEGORIES: Category[] = [
    { name: "bottle", is_valid: true }, { name: "cable", is_valid: true },
    { name: "capsule", is_valid: true }, { name: "carpet", is_valid: true },
    { name: "grid", is_valid: true }, { name: "hazelnut", is_valid: true },
    { name: "leather", is_valid: true }, { name: "metal_nut", is_valid: true },
    { name: "pill", is_valid: true }, { name: "screw", is_valid: true },
    { name: "tile", is_valid: true }, { name: "toothbrush", is_valid: true },
    { name: "transistor", is_valid: true }, { name: "wood", is_valid: true },
    { name: "zipper", is_valid: true }
  ];

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/dataset/categories?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data);
            setSelectedCategory(data[0].name);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
      setCategories(DEFAULT_CATEGORIES);
      setSelectedCategory(DEFAULT_CATEGORIES[0].name);
    };
    fetchCategories();
  }, []);

  // Poll for completion once inspection is created
  useEffect(() => {
    if (!createdInspection) return;
    
    // If already finished, stop polling
    if (createdInspection.status === "Completed" || createdInspection.status === "Failed") {
      return;
    }

    const token = localStorage.getItem("visioninspect_auth_token");
    const baseUrl = getApiBaseUrl();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/inspections/${createdInspection.inspection_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const updated = await res.json();
          setCreatedInspection(updated);
          // If modal is currently open, keep it in sync
          setSelectedInspection(prev => (prev ? updated : null));
          if (updated.status === "Completed" || updated.status === "Failed") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling inspection error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [createdInspection?.inspection_id, createdInspection?.status]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: unknown) {
      setError("Camera permission denied or device not found.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          handleFileSelection(file);
          stopCamera();
        }
      }, "image/jpeg");
    }
  };

  const handleFileSelection = (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError("Unsupported file format. Please use JPG or PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Paste Support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!imageFile && !isCameraActive && e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          handleFileSelection(file);
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [imageFile, isCameraActive]);

  const handleUploadAndCreate = async () => {
    if (!imageFile || !selectedCategory) {
      setError("Please select an image and a category.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      // 1. Upload Image
      const formData = new FormData();
      formData.append("file", imageFile);
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem("visioninspect_auth_token");
      
      const uploadRes = await fetch(`${baseUrl}/api/v1/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.detail || "Image upload failed");
      }
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url;

      // 2. Create Inspection
      const inspectRes = await fetch(`${baseUrl}/api/v1/inspections/create`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engineer_id: user?.id || "EMP-000",
          employee_id: user?.employee_id || "UNK-000",
          engineer_name: user?.name || "Unknown Engineer",
          dataset_category: selectedCategory,
          image_path: imageUrl,
          original_filename: imageFile.name,
          source: imageFile.name.startsWith("capture-") ? "Camera" : "Gallery"
        }),
      });

      if (!inspectRes.ok) {
        const errData = await inspectRes.json();
        throw new Error(errData.detail || "Failed to create inspection record");
      }

      const inspectData = await inspectRes.json();
      setCreatedInspection(inspectData);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDetails = async () => {
    if (!createdInspection) return;
    setIsFetchingDetails(true);
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/inspections/${createdInspection.inspection_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedInspection(data);
      } else {
        setSelectedInspection(createdInspection);
      }
    } catch (err) {
      console.error("Failed to fetch details", err);
      // Fall back to showing current inspection info in modal
      setSelectedInspection(createdInspection);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const resetForm = () => {
    setCreatedInspection(null);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <ClientOnly>
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedInspection(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/10 hover:bg-black/20 text-slate-900 dark:text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-y-auto">
              <DetectionPreview data={selectedInspection as any} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto pb-12 pt-6 px-4">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Inspection</h1>
          <p className="text-slate-500 mt-1">Upload or capture an image to create a new AI inspection record.</p>
        </div>

        <AnimatePresence mode="wait">
          {createdInspection ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 text-center shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Inspection Created Successfully!</h2>
              <p className="text-slate-500 mb-8">Your image has been securely uploaded and queued for processing.</p>

              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 max-w-md mx-auto text-left space-y-4 mb-8 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 text-sm">Inspection ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{createdInspection.inspection_id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 text-sm">Category</span>
                  <span className="capitalize font-medium text-slate-900 dark:text-white">{createdInspection.dataset_category.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-slate-500 text-sm">Status</span>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{createdInspection.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Time</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{new Date(createdInspection.upload_time).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Start New Inspection
                </button>
                <button 
                  onClick={handleViewDetails}
                  disabled={isFetchingDetails}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isFetchingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <>View Details <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm"
            >
              
              {/* Step 1: Category */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1. Select Dataset Category</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none capitalize"
                  disabled={isUploading}
                >
                  <option value="" disabled>Select a category...</option>
                  {categories.map(c => (
                    <option key={c.name} value={c.name}>{c.name.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Image Selection */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">2. Provide Image</label>
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {!imagePreview && !isCameraActive ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Drag & Drop or Click to Browse</h3>
                    <p className="text-slate-500 text-sm mb-6">Supports JPG, JPEG, PNG up to 10MB.<br/>You can also paste (Ctrl+V) an image from your clipboard.</p>
                    
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startCamera(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        <Camera className="w-4 h-4" /> Use Camera
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelection(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ) : isCameraActive ? (
                  <div className="rounded-3xl overflow-hidden bg-black relative border border-slate-800 shadow-lg">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-[60vh] object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button 
                        onClick={stopCamera}
                        className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={capturePhoto}
                        className="w-14 h-14 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Camera className="w-6 h-6 text-slate-900" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row gap-8 items-start bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-full md:w-1/2 aspect-square relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-black/5 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview!} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="w-full md:w-1/2 space-y-4">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-blue-500" /> Image Details
                      </h3>
                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Filename</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={imageFile?.name}>{imageFile?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Size</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{(imageFile!.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-sm">Format</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white uppercase">{imageFile?.type.split('/')[1]}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          disabled={isUploading}
                          className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleUploadAndCreate}
                  disabled={!imageFile || !selectedCategory || isUploading}
                  className={`px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all ${
                    !imageFile || !selectedCategory 
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                  }`}
                >
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating Record...</>
                  ) : (
                    <><Upload className="w-5 h-5" /> Upload & Create Inspection</>
                  )}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ClientOnly>
  );
}
