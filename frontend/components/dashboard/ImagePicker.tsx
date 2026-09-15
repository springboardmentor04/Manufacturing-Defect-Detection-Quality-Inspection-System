"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileImage, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function ImagePicker() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<{name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/dataset/categories`);
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
  }, []);

  const validateFile = (selectedFile: File) => {
    setError("");
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Only JPG, JPEG, and PNG are allowed.");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10 MB.");
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadSuccess(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        handleFileSelect(e.clipboardData.files[0]);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedCategory) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const token = localStorage.getItem("visioninspect_auth_token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const uploadRes = await fetch(`${baseUrl}/api/v1/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      
      // Create Inspection
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
          image_path: uploadData.url,
          original_filename: file.name,
          source: "Dashboard Upload"
        }),
      });

      if (!inspectRes.ok) throw new Error("Inspection creation failed");
      const inspectData = await inspectRes.json();
      
      setUploadSuccess(true);
      router.push(`/dashboard/engineer/history/${inspectData.inspection_id}`);
    } catch {
      setError("Failed to upload and create inspection.");
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError("");
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <FileImage className="w-5 h-5 text-blue-500" /> Image Upload
      </h3>

      {!file ? (
        <div 
          className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 cursor-pointer hover:bg-blue-200 transition">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Click to browse or drag image here</h4>
          <p className="text-xs text-slate-500 max-w-[200px] mb-4">Supports JPG, JPEG, PNG up to 10MB. You can also paste from clipboard.</p>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg, image/png, image/jpg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }} 
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 bg-slate-900 flex items-center justify-center min-h-[200px]">
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            )}
            <button onClick={reset} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="truncate pr-4 flex-1">
                <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none capitalize"
                disabled={isUploading}
              >
                <option value="" disabled>Select category...</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name.replace('_', ' ')}</option>
                ))}
              </select>

              <button 
                onClick={handleUpload}
                disabled={isUploading || uploadSuccess || !selectedCategory}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shrink-0 ${uploadSuccess ? 'bg-emerald-600 text-white' : (!selectedCategory ? 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50')}`}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (uploadSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />)}
                {uploadSuccess ? 'Redirecting...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
