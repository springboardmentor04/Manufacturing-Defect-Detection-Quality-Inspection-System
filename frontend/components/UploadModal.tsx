'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  UploadCloud,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { uploadImages, analyzeBatch, getErrorMessage, ImageDetail } from '@/lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadCompleted: () => void;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'];
const MAX_SIZE_MB = 10;

export default function UploadModal({
  isOpen,
  onClose,
  onUploadCompleted,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    const validItems: { file: File; previewUrl: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage(
          `File '${file.name}' has unsupported format .${ext}. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMessage(
          `File '${file.name}' exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
        );
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      validItems.push({ file, previewUrl });
    }

    if (validItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validItems]);
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
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClearAll = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
  };

  const handleUploadAndProcess = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Step 1: Upload images
      const rawFiles = selectedFiles.map((item) => item.file);
      const uploaded: ImageDetail[] = await uploadImages(rawFiles, (pct) => {
        setUploadProgress(pct);
      });

      // Step 2: Auto-run background pipeline (preprocessing -> quality check -> YOLO detection)
      setIsUploading(false);
      setIsPipelineRunning(true);

      const inspectionIds = uploaded
        .map((img) => img.inspection_id)
        .filter((id): id is number => typeof id === 'number');

      if (inspectionIds.length > 0) {
        await analyzeBatch(inspectionIds);
      }

      setSuccessMessage(
        `Successfully uploaded and processed ${uploaded.length} inspection payload(s)!`
      );

      // Clean up previews
      handleClearAll();

      // Trigger automatic update without page refresh
      setTimeout(() => {
        onUploadCompleted();
        onClose();
        setIsPipelineRunning(false);
      }, 1000);
    } catch (err: any) {
      setIsUploading(false);
      setIsPipelineRunning(false);
      const detail = getErrorMessage(err, 'Failed to upload and analyze images.');
      setErrorMessage(detail);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Upload Inspection Payloads</h3>
              <p className="text-xs text-slate-400">Single or multi-file batch upload with automatic defect detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading || isPipelineRunning}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
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
            <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-sky-400 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drag and drop manufacturing images here, or{' '}
                <span className="text-sky-400 hover:underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG, PNG, BMP, TIFF, WEBP (Up to 10MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Previews List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Selected Payloads ({selectedFiles.length})
              </h4>
              <button
                onClick={handleClearAll}
                disabled={isUploading || isPipelineRunning}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {selectedFiles.map(({ file, previewUrl }, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-800 flex-shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-slate-200 font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(idx)}
                    disabled={isUploading || isPipelineRunning}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload & Pipeline Progress State */}
        {(isUploading || isPipelineRunning) && (
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                {isUploading
                  ? `Uploading payload (${uploadProgress}%)...`
                  : 'Running automated pipeline (Preprocessing → Quality Check → YOLO Defect Detection)...'}
              </span>
              {isUploading && <span className="font-mono text-sky-400">{uploadProgress}%</span>}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: isPipelineRunning ? '100%' : `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading || isPipelineRunning}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUploadAndProcess}
            disabled={selectedFiles.length === 0 || isUploading || isPipelineRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : isPipelineRunning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Processing Pipeline...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload & Process ({selectedFiles.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
