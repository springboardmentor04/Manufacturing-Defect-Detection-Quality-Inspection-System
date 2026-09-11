"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productsService } from '@/services/products';
import { batchesService } from '@/services/batches';
import { inspectionsService } from '@/services/inspections';
import { formatApiError } from '@/services/api';
import { Product, Batch } from '@/types';
import { Camera as CameraIcon, UploadCloud, X, Cpu, AlertCircle, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '@/hooks/useAuth';

const normalizeRole = (role?: string | null) => (role || '').toString().trim().replace(/\s+/g, '_').toUpperCase();

export default function NewInspectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const normalizedRole = normalizeRole(user?.role);
    if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'FACTORY_SUPERVISOR') {
      router.replace('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingContext(true);
        const [p, b] = await Promise.all([
          productsService.getAll(),
          batchesService.getAll().catch(() => []),
        ]);
        setProducts(Array.isArray(p) ? p : []);
        setBatches(Array.isArray(b) ? b : []);
        if (p && p.length > 0 && !selectedProduct) {
          setSelectedProduct(p[0].id.toString());
        }
      } catch (error: any) {
        console.error('[NewInspectionPage] Failed to load products/batches:', error);
        setErrorMessage(formatApiError(error, 'Failed to load products and batches for inspection.'));
      } finally {
        setLoadingContext(false);
      }
    };
    fetchData();
  }, [router, user]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setErrorMessage(null);
    }
  };

  const captureCamera = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreview(imageSrc);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const newFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setFile(newFile);
          setErrorMessage(null);
        })
        .catch((err) => {
          setErrorMessage(`Camera capture error: ${err.message}`);
        });
    }
  }, [webcamRef]);

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    setErrorMessage(null);
  };

  const runInspection = async () => {
    if (!selectedProduct) {
      setErrorMessage('Please select a product from the list before starting inspection.');
      return;
    }
    if (!file) {
      setErrorMessage('Please upload or capture an optical inspection image.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setStatusText('Uploading high-resolution image to AI pipeline and executing YOLO defect inference...');

      const inspection = await inspectionsService.createAndRun(
        parseInt(selectedProduct, 10),
        selectedBatch ? parseInt(selectedBatch, 10) : null,
        file
      );

      setStatusText('Inference complete! Redirecting to inspection report...');
      router.push(`/inspections/${inspection.id}`);
    } catch (error: any) {
      console.error('[NewInspectionPage] Inspection execution error:', error);
      const formatted = formatApiError(
        error, 
        'AI Quality Inspection failed. Please verify the backend service connection and image format.'
      );
      setErrorMessage(formatted);
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="text-blue-600" size={26} />
            New AI Quality Inspection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Run automated YOLO defect localization and multi-attribute 4-state quality decision assessment
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 shadow-sm animate-fadeIn">
            <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Inspection Error</p>
              <p className="text-xs mt-0.5 whitespace-pre-wrap">{errorMessage}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)} 
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">1. Inspection Context</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-product-inspection" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Product <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-product-inspection"
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isProcessing || loadingContext}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white disabled:bg-slate-50"
              >
                {products.length === 0 ? (
                  <option value="">{loadingContext ? 'Loading products...' : 'No products available'}</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.product_code ? `(${p.product_code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="select-batch-inspection" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Production Batch (Optional)
              </label>
              <select
                id="select-batch-inspection"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={isProcessing || loadingContext}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white disabled:bg-slate-50"
              >
                <option value="">No Batch Assigned</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-800">2. Optical Image Source</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                id="toggle-mode-upload"
                onClick={() => setMode('upload')}
                disabled={isProcessing}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                File Upload
              </button>
              <button
                type="button"
                id="toggle-mode-camera"
                onClick={() => setMode('camera')}
                disabled={isProcessing}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'camera' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Camera
              </button>
            </div>
          </div>

          {!preview ? (
            <div>
              {mode === 'upload' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50 cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
                >
                  <UploadCloud size={40} className="text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Drag and drop optical inspection image here, or{' '}
                    <label className="text-blue-600 hover:underline cursor-pointer">
                      browse
                      <input
                        id="image-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-slate-400">Supports JPG, JPEG, PNG, WEBP high-resolution inspection images</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl overflow-hidden min-h-[300px]">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full max-w-md rounded-lg mb-4"
                  />
                  <button
                    type="button"
                    id="capture-photo-btn"
                    onClick={captureCamera}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-md transition-colors cursor-pointer"
                  >
                    <CameraIcon size={18} />
                    Capture Photo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-2 min-h-[300px]">
              <img
                src={preview}
                alt="Selected inspection preview"
                className="max-h-[420px] object-contain rounded"
              />
              {!isProcessing && (
                <button
                  type="button"
                  id="remove-image-btn"
                  onClick={clearSelection}
                  className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full shadow-lg transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            id="cancel-inspection-btn"
            onClick={() => router.back()}
            disabled={isProcessing}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="run-inspection-btn"
            onClick={runInspection}
            disabled={!file || !selectedProduct || isProcessing}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2.5 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{statusText || 'Executing AI Inspection...'}</span>
              </>
            ) : (
              <>
                <Cpu size={18} />
                <span>Run Inspection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
