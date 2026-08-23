'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number; // 0.0 - 1.0 or 0 - 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ConfidenceBadge({
  score,
  size = 'md',
  showLabel = true,
}: ConfidenceBadgeProps) {
  // Normalize score to percentage (0 - 100)
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  if (pct >= 80) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}
      >
        <ShieldCheck className={iconSizes} />
        <span>{pct}%</span>
        {showLabel && <span className="text-[10px] opacity-80 uppercase tracking-wider font-normal">High</span>}
      </span>
    );
  }

  if (pct >= 50) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
      >
        <AlertTriangle className={iconSizes} />
        <span>{pct}%</span>
        {showLabel && <span className="text-[10px] opacity-80 uppercase tracking-wider font-normal">Med</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}
    >
      <ShieldAlert className={iconSizes} />
      <span>{pct}%</span>
      {showLabel && <span className="text-[10px] opacity-80 uppercase tracking-wider font-normal">Low</span>}
    </span>
  );
}
