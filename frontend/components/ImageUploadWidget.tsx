'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { UploadCloud, FileImage, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ImageUploadWidgetProps {
  onUploadSuccess: () => void;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'];
const MAX_SIZE_MB = 10;

export default function ImageUploadWidget({ onUploadSuccess }: ImageUploadWidgetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage(`File '${file.name}' has invalid type .${ext}. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`File '${file.name}' exceeds maximum 10MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        return;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      setSuccessMessage(`Successfully uploaded ${response.data.length} inspection image(s). Queue created.`);
      setSelectedFiles([]);
      setUploadProgress(100);
      onUploadSuccess();
    } catch (err: any) {
      const detail = getErrorMessage(err, 'Upload failed. Please check file sizes and formats.');
      setErrorMessage(detail);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div id="upload-section" className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-400" />
            Batch Image Upload & Inspection Trigger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Supported formats: JPG, PNG, BMP, TIFF, WEBP (Max 10MB per file). Drag multiple files or click to browse.
          </p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-sky-500 bg-sky-500/10 scale-[0.99]'
            : 'border-slate-700/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.bmp,.tiff,.webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-full text-sky-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              Drag & drop manufacturing inspection images here, or{' '}
              <span className="text-sky-400 hover:underline">browse files</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Multi-file batch upload enabled</p>
          </div>
        </div>
      </div>

      {/* Notification Toasts */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Selected File Previews */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Selected Files ({selectedFiles.length})
            </h3>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileImage className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span className="text-slate-200 truncate">{file.name}</span>
                  <span className="text-slate-500 text-[10px]">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Progress Bar & Upload Button */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading inspection payload...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading Batch...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Upload & Queue Inspection ({selectedFiles.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
