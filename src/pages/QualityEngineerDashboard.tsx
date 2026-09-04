import React, { useEffect, useState } from 'react';
import { InspectionRecord, PreprocessingOptions, MVTecSample, Product } from '../types';
import { InspectionDetailModal } from '../components/InspectionDetailModal';
import { MVTEC_SAMPLES } from '../data/mvtecSamples';
import { uploadInspection, fetchInspections, fetchProducts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Scan, Play, RefreshCw } from 'lucide-react';
import { UploadPanel } from '../components/UploadPanel';
import { InspectionViewer } from '../components/InspectionViewer';
import { SeverityPanel } from '../components/SeverityPanel';
import { InspectionHistory } from '../components/InspectionHistory';

export const QualityEngineerDashboard: React.FC = () => {
  const { user } = useAuth();

  // ---------- State ----------
  const [selectedSample, setSelectedSample] = useState<MVTecSample>(MVTEC_SAMPLES[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [factoryLine, setFactoryLine] = useState(user?.assignedLine || 'Assembly Line A1');
  const [comments, setComments] = useState('');

  const [preprocessing, setPreprocessing] = useState<PreprocessingOptions>({
    noiseRemoval: true,
    claheContrast: true,
    edgeDetection: false,
    roiCrop: false
  });

  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectionRecord | null>(null);
  const [inspectionHistory, setInspectionHistory] = useState<InspectionRecord[]>([]);
  const [selectedModalRecord, setSelectedModalRecord] = useState<InspectionRecord | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('Preparing inspection run...');

  // ---------- Load History ----------
  useEffect(() => {
    void loadHistory();
    void loadProducts();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchInspections();
      setInspectionHistory(data);
      if (data.length > 0 && !inspectionResult) {
        setInspectionResult(data[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load inspection history right now.');
    }
  };

  const loadProducts = async () => {
    try { setProducts(await fetchProducts()); } catch (err) { console.error(err); setError('Unable to load products right now.'); }
  };

  // ---------- Sample Selection ----------
  const handleSampleSelect = (sample: MVTecSample) => {
    setSelectedSample(sample);
    setError('');
  };

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products.find((item) => item.id === id);
    if (product) { setProductName(product.productName); setProductCategory(product.category); setFactoryLine(product.factoryLine); }
  };

  // ---------- Image Upload ----------
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImage(reader.result as string);
        setProductName(file.name.replace(/\.[^/.]+$/, ''));
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // ---------- Inspection ----------
  const handleRunInspection = async () => {
    setError('');
    setSuccess('');

    if (!productName.trim()) {
      setError('Product name is required.');
      return;
    }

    if (!selectedProductId) {
      setError('Please select a saved product.');
      return;
    }

    if (!productCategory.trim()) {
      setError('Product category is required.');
      return;
    }

    if (!customImage) {
      setError('Upload an inspection image before running the trained YOLO model. Demo cards are not inspection inputs.');
      return;
    }

    setIsInspecting(true);
    setInspectionStatus('Uploading image...');

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setInspectionStatus('Processing image...');

      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setInspectionStatus('Applying preprocessing...');

      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setInspectionStatus('Detecting defects...');

      const result = await uploadInspection({
        productId: selectedProductId,
        productName,
        productCategory,
        factoryLine,
        imageUrl: customImage,
        preprocessing,
        comments
      });

      setInspectionResult(result);
      setInspectionStatus('Calculating severity...');
      await loadHistory();
      setInspectionStatus('Inspection complete');
      setSuccess('Inspection completed successfully.');
    } catch (err) {
      console.error('Inspection failed:', err);
      setError(err instanceof Error ? err.message : 'Inspection failed. Please try again.');
      setInspectionStatus('Inspection failed');
    } finally {
      setIsInspecting(false);
    }
  };

  const activeImageUrl = customImage || selectedSample.imageUrl;

  // ---------- Render ----------
  return (
    <div className="space-y-8 py-4">
      <div id="section-dashboard" className="glass-card p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-600/10 px-3 py-1 rounded-full border border-teal-600/20 w-fit mb-2">
            <Scan className="w-3.5 h-3.5 text-teal-700" />
            <span>VisionInspect AI Inspection Engine • Quality Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Product Quality Inspection & Anomaly Localization</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Quality Engineer: <span className="font-bold text-slate-700">{user?.fullName}</span> | Engine: <span className="font-bold text-teal-700">VisionInspect AI Defect Detection Engine</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunInspection}
          disabled={isInspecting || !selectedProductId || !productName || !productCategory}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-full shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isInspecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Inspecting Product...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Inspection</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <UploadPanel
            selectedSample={selectedSample}
            onSampleSelect={handleSampleSelect}
          customImage={customImage}
            products={products}
            selectedProductId={selectedProductId}
            onProductSelect={handleProductSelect}
            onImageUpload={handleImageUpload}
            productName={productName}
            productCategory={productCategory}
            factoryLine={factoryLine}
            comments={comments}
            onProductNameChange={setProductName}
            onProductCategoryChange={setProductCategory}
            onFactoryLineChange={setFactoryLine}
            onCommentsChange={setComments}
            preprocessing={preprocessing}
            onPreprocessingChange={setPreprocessing}
            isInspecting={isInspecting}
          />
        </div>

        <InspectionViewer
          activeImageUrl={activeImageUrl}
          preprocessing={preprocessing}
          inspectionResult={inspectionResult}
          isInspecting={isInspecting}
          inspectionStatus={inspectionStatus}
        />
      </div>

      {inspectionResult && (
        <SeverityPanel
          inspectionResult={inspectionResult}
          onOpenReport={setSelectedModalRecord}
          isInspecting={isInspecting}
        />
      )}

      <InspectionHistory
        inspectionHistory={inspectionHistory}
        historyFilter={historyFilter}
        onSetFilter={setHistoryFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenRecord={setSelectedModalRecord}
      />

      <InspectionDetailModal
        record={selectedModalRecord}
        onClose={() => setSelectedModalRecord(null)}
      />
    </div>
  );
};
