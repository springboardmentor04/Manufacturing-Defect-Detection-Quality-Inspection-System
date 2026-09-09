"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BellRing, ChevronRight, Download, FileText, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardShell({
  title,
  eyebrow,
  actionLabel,
  children,
}: {
  title: string;
  eyebrow: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/40 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <BellRing className="h-4 w-4 text-indigo-400 animate-pulse" />
                24 live insights
              </div>
              {actionLabel ? (
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {actionLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/5 bg-slate-900/30 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Search className="h-4 w-4" />
              <span className="text-sm">Monitor quality and production health in one place</span>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search records" className="w-full md:w-56 border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50" />
              <Button variant="outline" className="gap-2 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
                <FileText className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-[1.5rem] border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-indigo-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">{icon}</div> : null}
      </div>
      {children}
    </motion.div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const classes = {
    Pass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    Fail: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
    Processing: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
  } as const;

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status as keyof typeof classes] ?? "bg-white/10 text-slate-300 border-white/20"}`}>{status}</span>;
}

export function MetricCard({ label, value, detail, accent, delay = 0 }: { label: string; value: string; detail: string; accent: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: delay, type: "spring", stiffness: 100 }}
      className={`relative overflow-hidden rounded-[1.25rem] border border-white/10 p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-xl ${accent}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-white drop-shadow-md">{value}</p>
        <p className="mt-1 text-sm font-medium text-slate-400">{detail}</p>
      </div>
    </motion.div>
  );
}

export function QuickAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-300 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
    </button>
  );
}
