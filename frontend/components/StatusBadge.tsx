'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, XCircle, HelpCircle } from 'lucide-react';

export type InspectionStatusType =
  | 'passed'
  | 'failed'
  | 'completed'
  | 'pending'
  | 'queued'
  | 'needs_review'
  | 'rejected'
  | string;

interface StatusBadgeProps {
  status: InspectionStatusType;
  defectCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function StatusBadge({
  status,
  defectCount,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  const normStatus = (status || '').toLowerCase();

  // Size styles
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  // Map status to colors and labels
  if (normStatus === 'passed' || (normStatus === 'completed' && defectCount === 0)) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/50 ${sizeClasses}`}
      >
        {showIcon && <CheckCircle2 className={iconSizes} />}
        <span>PASSED</span>
      </span>
    );
  }

  if (normStatus === 'failed' || (normStatus === 'completed' && defectCount !== undefined && defectCount > 0)) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-950/50 ${sizeClasses}`}
      >
        {showIcon && <AlertCircle className={iconSizes} />}
        <span>
          FAILED {defectCount !== undefined ? `(${defectCount} Defect${defectCount === 1 ? '' : 's'})` : ''}
        </span>
      </span>
    );
  }

  if (normStatus === 'needs_review') {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-950/50 ${sizeClasses}`}
      >
        {showIcon && <HelpCircle className={iconSizes} />}
        <span>NEEDS REVIEW</span>
      </span>
    );
  }

  if (normStatus === 'rejected') {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700 shadow-sm ${sizeClasses}`}
      >
        {showIcon && <XCircle className={iconSizes} />}
        <span>REJECTED</span>
      </span>
    );
  }

  // Default: Pending / Queued
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-950/50 ${sizeClasses}`}
    >
      {showIcon && <Clock className={iconSizes} />}
      <span>PENDING</span>
    </span>
  );
}
