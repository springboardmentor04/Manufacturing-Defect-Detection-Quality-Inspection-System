import React from 'react';
import { PreprocessingOptions } from '../types';
import { Sliders, Eye, Zap, Layers, Crop } from 'lucide-react';

interface ImagePreprocessorProps {
  options: PreprocessingOptions;
  onChange: (opts: PreprocessingOptions) => void;
  disabled?: boolean;
}

export const ImagePreprocessor: React.FC<ImagePreprocessorProps> = ({ options, onChange, disabled }) => {
  const toggleOption = (key: keyof PreprocessingOptions) => {
    if (disabled) return;
    onChange({
      ...options,
      [key]: !options[key]
    });
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <Sliders className="w-4 h-4 text-teal-700" />
          <span>OpenCV Preprocessing Controls</span>
        </div>
        <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
          Pipeline Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => toggleOption('noiseRemoval')}
          disabled={disabled}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
            options.noiseRemoval
              ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-medium'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>Gaussian Noise Filter</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${options.noiseRemoval ? 'bg-teal-600' : 'bg-slate-300'}`} />
        </button>

        <button
          type="button"
          onClick={() => toggleOption('claheContrast')}
          disabled={disabled}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
            options.claheContrast
              ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-medium'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            <span>CLAHE Contrast Boost</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${options.claheContrast ? 'bg-teal-600' : 'bg-slate-300'}`} />
        </button>

        <button
          type="button"
          onClick={() => toggleOption('edgeDetection')}
          disabled={disabled}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
            options.edgeDetection
              ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-medium'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Canny Edge Extraction</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${options.edgeDetection ? 'bg-teal-600' : 'bg-slate-300'}`} />
        </button>

        <button
          type="button"
          onClick={() => toggleOption('roiCrop')}
          disabled={disabled}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
            options.roiCrop
              ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-medium'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Crop className="w-3.5 h-3.5 text-teal-600" />
            <span>Auto ROI Cropping</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${options.roiCrop ? 'bg-teal-600' : 'bg-slate-300'}`} />
        </button>
      </div>
    </div>
  );
};
