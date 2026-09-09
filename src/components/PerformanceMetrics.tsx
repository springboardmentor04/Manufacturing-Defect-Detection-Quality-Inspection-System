"use client";

import { TrendingUp, Clock, Zap, Target } from "lucide-react";

const metrics = [
  {
    label: "Avg Processing Time",
    value: "2.3s",
    unit: "per image",
    icon: Clock,
    trend: "-12% faster",
    trendUp: true,
  },
  {
    label: "System Uptime",
    value: "99.8%",
    unit: "this month",
    icon: Zap,
    trend: "+0.2% vs last month",
    trendUp: true,
  },
  {
    label: "Model Accuracy",
    value: "97.2%",
    unit: "on test set",
    icon: Target,
    trend: "+1.5% improvement",
    trendUp: true,
  },
  {
    label: "Daily Throughput",
    value: "42.8k",
    unit: "inspections/day",
    icon: TrendingUp,
    trend: "+8% this week",
    trendUp: true,
  },
];

export function PerformanceMetrics() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-semibold ${metric.trendUp ? "text-emerald-700" : "text-rose-700"}`}>
                {metric.trend}
              </span>
            </div>
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-500">{metric.unit}</p>
          </div>
        );
      })}
    </section>
  );
}
