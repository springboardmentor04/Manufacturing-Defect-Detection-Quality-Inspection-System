import React from 'react';
import { AlertCircle, Flame, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SeverityBadgeProps {
  level?: string | null;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export default function SeverityBadge({
  level = 'Low',
  score,
  size = 'md',
  showScore = true,
}: SeverityBadgeProps) {
  const normLevel = (level || 'Low').trim();

  let config = {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    icon: ShieldCheck,
    label: 'Low',
  };

  if (normLevel.toLowerCase() === 'critical') {
    config = {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      dot: 'bg-rose-500',
      icon: Flame,
      label: 'Critical',
    };
  } else if (normLevel.toLowerCase() === 'high') {
    config = {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/40',
      text: 'text-orange-400',
      dot: 'bg-orange-500',
      icon: ShieldAlert,
      label: 'High',
    };
  } else if (normLevel.toLowerCase() === 'medium') {
    config = {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      icon: AlertCircle,
      label: 'Medium',
    };
  }

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]} tracking-wide shadow-sm`}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="font-mono text-[10px] opacity-80 pl-0.5">
          ({Math.round(score)})
        </span>
      )}
    </span>
  );
}
