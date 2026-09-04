import React from 'react';
import { Upload } from 'lucide-react';
import { ImagePreprocessor } from './ImagePreprocessor';
import { MVTecSample, PreprocessingOptions, Product } from '../types';
import { MVTEC_SAMPLES } from '../data/mvtecSamples';

interface UploadPanelProps {
  selectedSample: MVTecSample;
  onSampleSelect: (sample: MVTecSample) => void;
  customImage: string | null;
  products: Product[];
  selectedProductId: string;
  onProductSelect: (id: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  productName: string;
  productCategory: string;
  factoryLine: string;
  comments: string;
  onProductNameChange: (value: string) => void;
  onProductCategoryChange: (value: string) => void;
  onFactoryLineChange: (value: string) => void;
  onCommentsChange: (value: string) => void;
  preprocessing: PreprocessingOptions;
  onPreprocessingChange: (value: PreprocessingOptions) => void;
  isInspecting: boolean;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  selectedSample,
  onSampleSelect,
  customImage,
  products,
  selectedProductId,
  onProductSelect,
  onImageUpload,
  productName,
  productCategory,
  factoryLine,
  comments,
  onProductNameChange,
  onProductCategoryChange,
  onFactoryLineChange,
  onCommentsChange,
  preprocessing,
  onPreprocessingChange,
  isInspecting
}) => {
  return (
    <div id="section-upload" className="glass-card p-6 rounded-3xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Image Acquisition</span>
        <span className="text-[10px] text-teal-700 font-bold bg-teal-500/10 px-2 py-0.5 rounded-full">Input Image</span>
      </div>

      <div className="space-y-2">
        <label htmlFor="inspection-product" className="text-[11px] font-bold text-slate-700">Product</label>
        <select id="inspection-product" required value={selectedProductId} onChange={(event) => onProductSelect(event.target.value)} disabled={isInspecting} className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium">
          <option value="">Select a saved product</option>
          {products.filter((product) => product.status === 'Active').map((product) => <option key={product.id} value={product.id}>{product.productName} — {product.productCode}</option>)}
        </select>
        {products.length === 0 && <p className="text-[11px] text-amber-700">Create a product before running an inspection.</p>}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-700">Demo / visual examples — not used for AI inspection:</p>
        <div className="grid grid-cols-3 gap-2">
          {MVTEC_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSampleSelect(sample)}
              className={`p-1.5 rounded-xl border text-left transition-all ${
                selectedSample.id === sample.id && !customImage
                  ? 'border-teal-600 bg-teal-600/10 shadow-xs ring-1 ring-teal-600/30'
                  : 'border-white/80 bg-white/40 hover:bg-white/80'
              }`}
            >
              <img src={sample.imageUrl} alt={sample.productName} className="w-full h-12 object-cover rounded-lg mb-1" />
              <span className="text-[10px] font-bold text-slate-800 truncate block">{sample.productName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-2 border-dashed border-slate-300/80 hover:border-teal-600 rounded-2xl p-4 text-center transition-colors bg-white/40 backdrop-blur-md">
        <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" id="file-upload-input" />
        <label htmlFor="file-upload-input" className="cursor-pointer space-y-1 block">
          <Upload className="w-5 h-5 text-slate-400 mx-auto" />
          <span className="text-xs font-bold text-teal-700 block">Click to upload custom product image</span>
          <span className="text-[10px] text-slate-400 block font-medium">Supports PNG, JPG, BMP up to 10MB</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs pt-2">
        <div>
          <label htmlFor="product-name" className="font-bold text-slate-700 block mb-1">Product Name</label>
          <input id="product-name" type="text" value={productName} onChange={(event) => onProductNameChange(event.target.value)} className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium" />
        </div>

        <div>
          <label htmlFor="product-category" className="font-bold text-slate-700 block mb-1">Category</label>
          <input id="product-category" type="text" value={productCategory} onChange={(event) => onProductCategoryChange(event.target.value)} className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono font-medium" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="factory-line" className="font-bold text-slate-700 block mb-1">Factory Line</label>
        <input id="factory-line" type="text" value={factoryLine} onChange={(event) => onFactoryLineChange(event.target.value)} className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium" />
      </div>

      <div className="space-y-2">
        <label htmlFor="inspection-comments" className="font-bold text-slate-700 block mb-1">Inspector Notes</label>
        <textarea id="inspection-comments" value={comments} onChange={(event) => onCommentsChange(event.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium" placeholder="Add any notes for this inspection" />
      </div>

      <ImagePreprocessor options={preprocessing} onChange={onPreprocessingChange} disabled={isInspecting} />
    </div>
  );
};
