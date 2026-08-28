"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { productsService } from '@/services/products';
import { batchesService } from '@/services/batches';
import { inspectionsService } from '@/services/inspections';
import { Product, Batch } from '@/types';
import { Camera as CameraIcon, UploadCloud, X, RefreshCw, Cpu } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '@/hooks/useAuth';

const normalizeRole = (role?: string | null) => (role || '').toString().trim().replace(/\s+/g, '_').toUpperCase();

export default function NewInspectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const normalizedRole = normalizeRole(user?.role);
    if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'FACTORY_SUPERVISOR') {
      router.replace('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const [p, b] = await Promise.all([
          productsService.getAll(),
          batchesService.getAll()
        ]);
        setProducts(p);
        setBatches(b);
      } catch (error) {
        console.error("Failed to load products/batches", error);
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
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const captureCamera = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreview(imageSrc);
      
      // Convert base64 to file
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const newFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setFile(newFile);
        });
    }
  }, [webcamRef]);

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
  };

  const runInspection = async () => {
    if (!file || !selectedProduct) return;
    
    try {
      setIsProcessing(true);
      
      setStatusText('Uploading...');
      await new Promise(r => setTimeout(r, 500)); // Simulating stages for UI feel
      
      setStatusText('Running AI...');
      const inspection = await inspectionsService.createAndRun(
        parseInt(selectedProduct), 
        selectedBatch ? parseInt(selectedBatch) : null, 
        file
      );
      
      setStatusText('Saving results...');
      
      // Redirect to the results page
      router.push(`/inspections/${inspection.id}`);
      
    } catch (error) {
      console.error(error);
      alert('Inspection failed. See console for details.');
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">New AI Inspection</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Inspection Context</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Product <span className="text-red-500">*</span></label>
              <select 
                value={selectedProduct} 
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Batch (Optional)</label>
              <select 
                value={selectedBatch} 
                onChange={e => setSelectedBatch(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">No Batch</option>
                {batches.filter(b => !selectedProduct || b.product_id.toString() === selectedProduct).map(b => (
                  <option key={b.id} value={b.id}>{b.batch_number}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Image Source</h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => { setMode('upload'); clearSelection(); }}
                className={`px-4 py-1 text-sm font-semibold rounded-md ${mode === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >
                Upload File
              </button>
              <button 
                onClick={() => { setMode('camera'); clearSelection(); }}
                className={`px-4 py-1 text-sm font-semibold rounded-md ${mode === 'camera' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >
                Live Camera
              </button>
            </div>
          </div>

          {!preview ? (
            mode === 'upload' ? (
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl h-64 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <UploadCloud size={48} className="text-slate-400 mb-4" />
                <p className="font-semibold text-slate-600 text-lg">Drag & Drop Image Here</p>
                <p className="text-slate-400 text-sm">or click to browse</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden h-[400px] bg-black flex items-center justify-center">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={captureCamera}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-blue-600 rounded-full p-4 shadow-xl hover:scale-105 transition-transform"
                >
                  <CameraIcon size={32} />
                </button>
              </div>
            )
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center p-4">
              <div className="relative w-full max-w-2xl">
                <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow" />
                <button 
                  onClick={clearSelection}
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur text-slate-700 p-2 rounded-full hover:bg-white hover:text-red-500 shadow-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mt-8">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw size={32} className="text-blue-500 animate-spin" />
                    <p className="font-bold text-slate-600">{statusText}</p>
                  </div>
                ) : (
                  <button 
                    onClick={runInspection}
                    disabled={!selectedProduct}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg px-8 py-3 rounded-xl shadow-md flex items-center gap-2 transition-colors"
                  >
                    <Cpu size={24} />
                    RUN AI INSPECTION
                  </button>
                )}
                {!selectedProduct && !isProcessing && (
                  <p className="text-red-500 text-sm font-semibold mt-2 text-center">Please select a product first</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
