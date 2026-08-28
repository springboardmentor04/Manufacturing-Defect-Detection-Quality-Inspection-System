'use client';

import { useEffect, useRef, useState } from 'react';
import { DefectItem } from '@/types';

interface BoundingBoxCanvasProps {
  imageUrl: string;
  defects: DefectItem[];
  selectedDefectId?: string | null;
  onSelectDefect?: (defect: DefectItem | null) => void;
}

export default function BoundingBoxCanvas({
  imageUrl,
  defects,
  selectedDefectId,
  onSelectDefect,
}: BoundingBoxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });
  const [activeHoverDefect, setActiveHoverDefect] = useState<DefectItem | null>(null);

  // Recalculate bounding box scaling on window resize or image load
  useEffect(() => {
    const updateScaling = () => {
      if (imageRef.current) {
        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
        if (naturalWidth > 0 && naturalHeight > 0) {
          setScale({
            scaleX: clientWidth / naturalWidth,
            scaleY: clientHeight / naturalHeight,
          });
        }
      }
    };

    updateScaling();
    window.addEventListener('resize', updateScaling);
    return () => window.removeEventListener('resize', updateScaling);
  }, [imageLoaded]);

  // Color helper based on defect severity
  const getSeverityColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return {
          border: 'border-red-500',
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          badge: 'bg-red-500/90 text-white',
          hex: '#ef4444',
        };
      case 'HIGH':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          badge: 'bg-orange-500/90 text-white',
          hex: '#f97316',
        };
      case 'MEDIUM':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500/90 text-black',
          hex: '#eab308',
        };
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          badge: 'bg-blue-500/90 text-white',
          hex: '#3b82f6',
        };
    }
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[350px]">
      {/* Base Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Product Inspection"
        onLoad={() => setImageLoaded(true)}
        className="w-full h-auto max-h-[550px] object-contain block select-none"
      />

      {/* Dynamic Overlay Bounding Boxes */}
      {imageLoaded &&
        defects.map((defect) => {
          const { x, y, width, height, label } = defect.bounding_box;
          const isSelected = selectedDefectId === defect.id;
          const isHovered = activeHoverDefect?.id === defect.id;
          const colors = getSeverityColor(defect.severity_level);

          // Scaled dimensions
          const style = {
            left: `${x * scale.scaleX}px`,
            top: `${y * scale.scaleY}px`,
            width: `${width * scale.scaleX}px`,
            height: `${height * scale.scaleY}px`,
          };

          return (
            <div
              key={defect.id}
              style={style}
              onClick={() => onSelectDefect && onSelectDefect(defect)}
              onMouseEnter={() => setActiveHoverDefect(defect)}
              onMouseLeave={() => setActiveHoverDefect(null)}
              className={`absolute border-2 rounded transition-all cursor-pointer z-10 ${colors.border} ${
                isSelected || isHovered ? `${colors.bg} ring-2 ring-white/50 scale-[1.01]` : 'bg-transparent'
              }`}
            >
              {/* Box Tag Label */}
              <div className={`absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded shadow ${colors.badge} whitespace-nowrap flex items-center space-x-1`}>
                <span>{label || defect.defect_type}</span>
                <span>({Math.round(defect.confidence * 100)}%)</span>
              </div>
            </div>
          );
        })}

      {/* Floating Detailed Hover Card */}
      {activeHoverDefect && (
        <div className="absolute bottom-4 left-4 right-4 z-20 glass-panel p-3 rounded-lg border border-slate-700/80 bg-slate-900/90 shadow-2xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSeverityColor(activeHoverDefect.severity_level).hex }}
            />
            <div>
              <span className="font-bold text-slate-200 capitalize">{activeHoverDefect.defect_type}</span>
              <span className="text-slate-400 text-[11px] ml-2">Location: {activeHoverDefect.location_type}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span className="text-slate-300">Size: {activeHoverDefect.size_mm2} mm²</span>
            <span className="text-slate-300">Score: {activeHoverDefect.severity_score}/100</span>
            <span className={`font-bold ${getSeverityColor(activeHoverDefect.severity_level).text}`}>
              {activeHoverDefect.severity_level}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}