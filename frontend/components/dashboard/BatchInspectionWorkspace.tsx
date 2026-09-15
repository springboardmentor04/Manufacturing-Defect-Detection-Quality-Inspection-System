"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, FileImage, Loader2, CheckCircle2, AlertCircle, Layers, Play, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface BatchFile {
  file: File;
  previewUrl: string;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  errorMsg?: string;
  inspectionId?: string;
  result?: any;
  category?: string;
}

export function BatchInspectionWorkspace() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [categories, setCategories] = useState<{name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    setMounted(true);
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/dataset/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) setSelectedCategory(data[0].name);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, [baseUrl]);

  const validateFile = (selectedFile: File) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(selectedFile.type)) return false;
    if (selectedFile.size > 10 * 1024 * 1024) return false;
    return true;
  };

  const handleFilesSelect = (selectedFiles: FileList | File[]) => {
    const newFiles: BatchFile[] = [];
    Array.from(selectedFiles).forEach(file => {
      if (validateFile(file) && !files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        newFiles.push({
          file,
          previewUrl: URL.createObjectURL(file),
          status: "idle",
          category: selectedCategory
        });
      }
    });
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setBatchComplete(false);
  };

  const startBatch = async () => {
    if (files.length === 0 || !selectedCategory) return;
    setIsProcessing(true);
    setBatchComplete(false);
    
    const token = localStorage.getItem("visioninspect_auth_token");
    
    // Set all to uploading
    setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const })));
    
    try {
      const formData = new FormData();
      files.forEach(f => {
        formData.append("files", f.file);
      });
      
      const uploadRes = await fetch(`${baseUrl}/api/v1/upload/batch-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      
      // Update statuses to processing
      setFiles(prev => prev.map(f => ({ ...f, status: "processing" as const })));
      
      const batchPayload = {
        engineer_id: user?.id || "EMP-000",
        employee_id: user?.employee_id || "UNK-000",
        engineer_name: user?.name || "Unknown Engineer",
        dataset_category: selectedCategory,
        source: "Batch Upload",
        images: uploadData.files.map((ud: any, i: number) => ({
          image_path: ud.url,
          original_filename: ud.filename,
          dataset_category: files[i].category || selectedCategory
        }))
      };
      
      const inspectRes = await fetch(`${baseUrl}/api/v1/inspections/batch-create`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(batchPayload),
      });

      if (!inspectRes.ok) throw new Error("Batch inspection creation failed");
      const inspectData = await inspectRes.json();
      
      // Update with inspection IDs
      setFiles(prev => prev.map((f, i) => ({ 
        ...f, 
        status: "processing" as const,
        inspectionId: inspectData.inspections[i].inspection_id 
      })));
      
      // Start polling for results
      pollResults(inspectData.inspections.map((i: any) => i.inspection_id));
      
    } catch (err: any) {
      console.error(err);
      setFiles(prev => prev.map(f => f.status !== "success" ? { ...f, status: "error" as const, errorMsg: err.message } : f));
      setIsProcessing(false);
    }
  };

  const pollResults = async (inspectionIds: string[]) => {
    const token = localStorage.getItem("visioninspect_auth_token");
    let pendingIds = [...inspectionIds];
    
    while (pendingIds.length > 0) {
      await new Promise(r => setTimeout(r, 2000));
      
      for (const id of [...pendingIds]) {
        try {
          const res = await fetch(`${baseUrl}/api/v1/inspections/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "Completed" || data.status === "Failed") {
              setFiles(prev => prev.map(f => {
                if (f.inspectionId === id) {
                  return {
                    ...f,
                    status: data.status === "Completed" ? "success" : "error",
                    result: data
                  };
                }
                return f;
              }));
              pendingIds = pendingIds.filter(pid => pid !== id);
            }
          }
        } catch (e) {
          console.error("Polling error for", id, e);
        }
      }
    }
    
    setIsProcessing(false);
    setBatchComplete(true);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFilesSelect(e.dataTransfer.files);
  };

  // Stats
  const completedCount = files.filter(f => f.status === "success" || f.status === "error").length;
  const passedCount = files.filter(f => f.result?.inspection_result === "PASS").length;
  const failedCount = files.filter(f => f.result?.inspection_result === "FAIL").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const totalConfidence = files.filter(f => f.result?.confidence).reduce((sum, f) => sum + f.result.confidence, 0);
  const totalTime = files.filter(f => f.result?.processing_time).reduce((sum, f) => sum + f.result.processing_time, 0);
  const avgConfidence = passedCount + failedCount > 0 ? (totalConfidence / (passedCount + failedCount)).toFixed(1) : 0;
  const avgTime = passedCount + failedCount > 0 ? (totalTime / (passedCount + failedCount)).toFixed(2) : 0;
  
  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" /> Batch Configuration
          </h3>
          <div className="flex gap-4 items-center">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none capitalize"
              disabled={isProcessing}
            >
              <option value="" disabled>Select category...</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name.replace('_', ' ')}</option>
              ))}
            </select>
            
            <button 
              onClick={startBatch}
              disabled={isProcessing || files.length === 0 || !selectedCategory}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isProcessing ? `Processing ${completedCount}/${files.length}` : 'Start Batch Inspection'}
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center transition-all ${
              isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 cursor-pointer hover:bg-blue-200 transition">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">Select or drag multiple images</h4>
            <p className="text-sm text-slate-500">Supports JPG, JPEG, PNG up to 10MB per file.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {files.length} {files.length === 1 ? 'image' : 'images'} selected
              </p>
              <button onClick={clearAll} disabled={isProcessing} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files.map((file, idx) => (
                <div key={idx} className="relative group bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  
                  {/* Overlay */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 ${file.status === 'idle' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity`}>
                    {file.status === 'idle' && !isProcessing && (
                      <>
                        <button onClick={() => removeFile(idx)} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full z-10 shadow">
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={file.category || selectedCategory}
                            onChange={(e) => {
                              const newFiles = [...files];
                              newFiles[idx].category = e.target.value;
                              setFiles(newFiles);
                            }}
                            className="w-full bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 text-xs rounded px-1.5 py-1 text-slate-900 dark:text-white capitalize focus:outline-none"
                          >
                            <option value="" disabled>Select category...</option>
                            {categories.map(c => (
                              <option key={c.name} value={c.name}>{c.name.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {file.status === 'uploading' && <Loader2 className="w-6 h-6 text-white animate-spin" />}
                    {file.status === 'processing' && (
                      <div className="text-center">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-1" />
                        <span className="text-xs text-white font-medium">Analyzing...</span>
                      </div>
                    )}
                    {file.status === 'success' && (
                      <div className="text-center w-full h-full p-2 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex items-center justify-between mt-auto">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${file.result?.inspection_result === 'PASS' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {file.result?.inspection_result}
                          </span>
                          <button onClick={() => window.open(`/dashboard/engineer/history/${file.inspectionId}`, '_blank')} className="text-white hover:text-blue-300">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="text-center text-red-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-xs font-medium">Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isProcessing && (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 aspect-square group">
                  <div className="text-center text-slate-500 group-hover:text-blue-500 transition-colors">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs font-medium">Add More</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/jpeg, image/png, image/jpg"
          multiple
          onChange={(e) => {
            if (e.target.files) handleFilesSelect(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }} 
        />
      </div>

      {batchComplete && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Batch Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 mb-1">Total Images</p>
              <p className="text-2xl font-bold">{files.length}</p>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Passed</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{passedCount}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{failedCount}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 mb-1">Avg Confidence</p>
              <p className="text-2xl font-bold">{avgConfidence}%</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 mb-1">Avg Time</p>
              <p className="text-2xl font-bold">{avgTime}s</p>
            </div>
          </div>
          
          {errorCount > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Processing Issues Detected</p>
                <p className="text-sm mt-1">{errorCount} images failed to process. Check your network or image formats.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
