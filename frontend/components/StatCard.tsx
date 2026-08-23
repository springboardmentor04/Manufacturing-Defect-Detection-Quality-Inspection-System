'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'blue',
  trend,
}: StatCardProps) {
  const variantStyles = {
    blue: {
      border: 'border-slate-800 hover:border-sky-500/40',
      iconBg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
      glow: 'from-sky-500/10 to-transparent',
      textColor: 'text-slate-100',
    },
    emerald: {
      border: 'border-slate-800 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      glow: 'from-emerald-500/10 to-transparent',
      textColor: 'text-emerald-400',
    },
    amber: {
      border: 'border-slate-800 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      glow: 'from-amber-500/10 to-transparent',
      textColor: 'text-amber-400',
    },
    rose: {
      border: 'border-slate-800 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      glow: 'from-rose-500/10 to-transparent',
      textColor: 'text-rose-400',
    },
    purple: {
      border: 'border-slate-800 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      glow: 'from-purple-500/10 to-transparent',
      textColor: 'text-purple-400',
    },
  }[variant];

  return (
    <div
      className={`relative bg-slate-900/90 backdrop-blur-sm border ${variantStyles.border} rounded-2xl p-5 shadow-xl transition-all duration-300 overflow-hidden group hover:translate-y-[-2px]`}
    >
      {/* Dynamic Background Glow */}
      <div
        className={`absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br ${variantStyles.glow} rounded-full blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2 pt-1">
            <h3 className={`text-3xl font-extrabold tracking-tight ${variantStyles.textColor}`}>
              {value}
            </h3>
            {trend && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  trend.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-slate-500 pt-0.5">{subtext}</p>}
        </div>

        <div className={`p-3 rounded-xl border ${variantStyles.iconBg} shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
