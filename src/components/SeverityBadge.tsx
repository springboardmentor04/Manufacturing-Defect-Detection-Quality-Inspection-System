import React from 'react';
import { SeverityLevel } from '../types';

interface SeverityBadgeProps {
  level: SeverityLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ level, score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs rounded-md font-medium',
    md: 'px-2.5 py-1 text-xs rounded-md font-semibold',
    lg: 'px-3 py-1.5 text-sm rounded-lg font-semibold'
  };

  const levelStyles: Record<SeverityLevel, string> = {
    Low: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    Medium: 'bg-amber-50 text-amber-800 border border-amber-200',
    High: 'bg-rose-50 text-rose-800 border border-rose-200',
    Critical: 'bg-red-100 text-red-900 border border-red-300 animate-pulse'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${levelStyles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        level === 'Low' ? 'bg-emerald-500' :
        level === 'Medium' ? 'bg-amber-500' :
        level === 'High' ? 'bg-rose-500' : 'bg-red-600'
      }`} />
      <span>{level} Severity</span>
      {score !== undefined && (
        <span className="opacity-80 font-mono">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
