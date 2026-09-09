"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  BarChart3,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Download,
  LineChart,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardShell, MetricCard, SectionCard, StatusBadge } from "@/components/dashboards/DashboardShell";
import { productionActivity, trendData } from "@/components/dashboards/mock-data";
import { Button } from "@/components/ui/button";

export function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState<"all" | "alerts">("all");

  return (
    <DashboardLayout>
      <DashboardShell
        title="Factory Supervisor Console"
        eyebrow="Plant Operations & Quality Analytics"
        actionLabel="Review Plant Alerts"
      >
        <div className="space-y-6">
          {/* Section 1: Production Overview & KPI Executive Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" id="overview">
            <MetricCard
              label="Total Units Inspected"
              value="14,820"
              detail="Across 14 active lines today"
              accent="bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            />
            <MetricCard
              label="First Pass Yield (FPY)"
              value="96.4%"
              detail="+1.8% vs last week target"
              accent="bg-sky-500/5 border-sky-500/20 hover:border-sky-500/40 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)]"
            />
            <MetricCard
              label="Critical Defect Rate"
              value="3.6%"
              detail="534 units flagged"
              accent="bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            />
            <MetricCard
              label="Factory Throughput"
              value="1,850/hr"
              detail="Operating at 98% efficiency"
              accent="bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
            />
          </section>

          {/* Section 2: Defect Trend Analysis & Quality Analytics */}
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" id="trends">
            {/* Defect Trend Analysis */}
            <SectionCard
              title="Defect Trend Analysis"
              subtitle="Weekly pass vs defect rate movement across critical production shifts"
              icon={<LineChart className="h-5 w-5" />}
            >
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "1rem",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="passRate" name="Pass Rate (%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="failRate" name="Defect Rate (%)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Quality Analytics */}
            <SectionCard
              title="Quality Analytics & Category Breakdown"
              subtitle="Distribution of defect root causes"
              icon={<BarChart3 className="h-5 w-5" />}
            >
              <div className="space-y-3 pt-1" id="analytics">
                <div className="group rounded-[1.25rem] border border-white/5 bg-white/5 p-3.5 transition-all hover:bg-white/10 hover:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Surface Finish Defect</span>
                    <span className="text-xs font-bold text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">38.4% of defects</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "38.4%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" 
                    />
                  </div>
                </div>

                <div className="group rounded-[1.25rem] border border-white/5 bg-white/5 p-3.5 transition-all hover:bg-white/10 hover:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Trace Micro-cracks</span>
                    <span className="text-xs font-bold text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]">27.1% of defects</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "27.1%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                      className="h-full rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" 
                    />
                  </div>
                </div>

                <div className="group rounded-[1.25rem] border border-white/5 bg-white/5 p-3.5 transition-all hover:bg-white/10 hover:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Component Misalignment</span>
                    <span className="text-xs font-bold text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.3)]">21.5% of defects</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "21.5%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                      className="h-full rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" 
                    />
                  </div>
                </div>
              </div>
            </SectionCard>
          </section>

          {/* Section 3: Production Monitoring & Live Activity */}
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" id="monitoring">
            {/* Production Monitoring */}
            <SectionCard
              title="Production Line Monitoring"
              subtitle="Real-time operational status per line"
              icon={<Activity className="h-5 w-5" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Line 03 (Electronics SMT)</p>
                    <StatusBadge status="Pass" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Throughput: <span className="text-slate-200 font-medium">620 units/hr</span> • 98.4% FPY</p>
                </div>

                <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 p-4 transition-all hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Line 07 (Connector Assembly)</p>
                    <StatusBadge status="Processing" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Throughput: <span className="text-slate-200 font-medium">540 units/hr</span> • Recalibration in progress</p>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Line 11 (Final Enclosure)</p>
                    <StatusBadge status="Pass" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Throughput: <span className="text-slate-200 font-medium">690 units/hr</span> • 99.1% FPY</p>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Line 14 (Packaging Inspection)</p>
                    <StatusBadge status="Pass" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Throughput: <span className="text-slate-200 font-medium">810 units/hr</span> • Nominal speed</p>
                </div>
              </div>
            </SectionCard>

            {/* Live Production Activity */}
            <SectionCard
              title="Shift Activity & Alerts"
              subtitle="Urgent escalations and line updates"
              icon={<Zap className="h-5 w-5" />}
            >
              <div className="space-y-2.5">
                <AnimatePresence>
                  {productionActivity.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="group rounded-[1.25rem] border border-white/5 bg-white/5 p-3.5 transition-all hover:border-white/10 hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{item.title}</p>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${
                            item.severity === "Critical"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                              : item.severity === "Alert"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.timestamp}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SectionCard>
          </section>

          {/* Section 4: KPI Dashboard & Executive Reports */}
          <section className="grid gap-6 lg:grid-cols-2" id="kpi">
            <SectionCard
              title="KPI Performance"
              subtitle="Operational health indicators"
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <div className="space-y-2.5 text-xs text-slate-400">
                <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-2.5 transition-colors hover:bg-white/10">
                  <span>Average Cycle Time:</span>
                  <span className="font-bold text-white drop-shadow-sm">1.18 sec</span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-2.5 transition-colors hover:bg-white/10">
                  <span>Overall Rework Rate:</span>
                  <span className="font-bold text-white drop-shadow-sm">2.4%</span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-2.5 transition-colors hover:bg-white/10">
                  <span>OEE Score:</span>
                  <span className="font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">92.6%</span>
                </div>
              </div>
            </SectionCard>



            <SectionCard
              title="Plant Overview"
              subtitle="Cross-factory intelligence"
              icon={<Box className="h-5 w-5" />}
            >
              <div className="space-y-2.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Active Lines:</span>
                  <span className="font-bold text-white">14 / 14</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Escalations:</span>
                  <span className="font-bold text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">2 active</span>
                </div>
                <div className="flex justify-between">
                  <span>System Uptime:</span>
                  <span className="font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">99.98%</span>
                </div>
              </div>
            </SectionCard>
          </section>
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}
