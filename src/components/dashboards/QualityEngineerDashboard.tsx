"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  History,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardShell, MetricCard, QuickAction, SectionCard, StatusBadge } from "@/components/dashboards/DashboardShell";
import { inspectionHistory, qualityReports } from "@/components/dashboards/mock-data";
import type { InspectionRecord } from "@/components/dashboards/dashboard-types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function QualityEngineerDashboard() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [inspectionList, setInspectionList] = useState(inspectionHistory);
  const [searchFilter, setSearchFilter] = useState("");
  const [aiResult, setAiResult] = useState<{
    status: string;
    confidence: number;
    defectType: string;
    location: string;
    severity: string;
    details: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      runAiScan(file);
    }
  };

  const loadSampleImage = async () => {
    setImagePreview("https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80");
    // Create a dummy file object for sample image
    try {
      const response = await fetch("https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80");
      const blob = await response.blob();
      const file = new File([blob], "Sample_PCB_Unit_49.jpg", { type: "image/jpeg" });
      runAiScan(file);
    } catch (e) {
      console.error("Failed to load sample image", e);
    }
  };

  const runAiScan = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/inspections/predict`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.token}`
        },
        body: formData,
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please log out and log back in.");
      }
      
      if (!response.ok) {
        throw new Error("Prediction failed");
      }

      const data = await response.json();
      const isGood = data.prediction === "good";

      const newScan: InspectionRecord = {
        id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: file.name,
        category: "Electronics",
        line: "Line 03",
        status: data.status,
        severity: data.severityLevel,
        score: data.calculatedScore,
        confidence: data.confidence,
        uploadedAt: "Just now",
        defectType: data.defectType,
      };
      
      setInspectionList((prev) => [newScan, ...prev]);
      
      setAiResult({
        status: data.status,
        confidence: data.confidence,
        defectType: data.defectType,
        location: isGood ? "N/A" : "Functional Component Area",
        severity: data.severityLevel,
        details: isGood 
          ? `Perfect unit. No defects found. Model confidence: ${data.confidence}%.`
          : `Detected defect: ${data.defectType}. Model confidence: ${data.confidence}%. Calculated Severity: ${data.calculatedScore}.`,
      });
    } catch (error: any) {
      console.error("Error during AI scan:", error);
      alert(error.message || "Failed to process image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = () => {
    setReportGenerated(true);
    setTimeout(() => setReportGenerated(false), 4000);
  };

  const handleExport = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/reports/quality/export`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${user?.token}`
        },
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please log out and log back in.");
      }

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quality_report.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      alert(error.message || "Failed to export data");
    }
  };

  const filteredHistory = inspectionList.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.defectType.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.line.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <DashboardLayout>
      <DashboardShell
        title="Quality Engineer Workspace"
        eyebrow="Quality Engineering & AI Inspection"
        actionLabel="Run AI Scan"
      >
        <div className="space-y-6">
          {/* Section 1: Upload Product Image & AI Inspection Results */}
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]" id="upload">
            {/* Upload Product Image */}
            <SectionCard
              title="Upload Product Image"
              subtitle="Drag & drop component scans to trigger real-time AI defect detection"
              icon={<UploadCloud className="h-5 w-5" />}
            >
              <div className="rounded-[1.25rem] border border-dashed border-white/20 bg-slate-950/50 p-6 text-center transition-all duration-300 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] group">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto h-44 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Inspection Preview" className="h-full w-full object-cover" />
                      {isAnalyzing ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                          <div className="relative flex flex-col items-center gap-3">
                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl"></div>
                            <div className="flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                              <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                              Scanning features...
                            </div>
                            {/* Scanning line animation */}
                            <div className="absolute -inset-x-12 top-0 h-0.5 w-48 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-center gap-3">
                      <label className="cursor-pointer rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/30 hover:shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                        Upload another file
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedFile(null);
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        Clear image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover:scale-110 transition-transform duration-300">
                      <FileImage className="h-8 w-8" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-white drop-shadow-md">Select product scan for AI analysis</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Supports PNG, JPG, or TIFF high-resolution inspection scans (up to 10MB).
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <label className="cursor-pointer rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2.5 text-xs font-semibold text-indigo-300 shadow-sm transition hover:bg-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                        Browse inspection files
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                      <button
                        type="button"
                        onClick={loadSampleImage}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 shadow-sm transition hover:bg-white/10 hover:text-white"
                      >
                        Load sample PCB scan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* AI Inspection Results */}
            <SectionCard
              title="AI Inspection Results"
              subtitle="Real-time computer vision classification"
              icon={<Sparkles className="h-5 w-5" />}
            >
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex h-52 items-center justify-center rounded-[1.25rem] border border-indigo-500/20 bg-indigo-500/5 p-6 text-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
                  >
                    <div>
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                      <p className="mt-3 text-sm font-semibold text-indigo-200 animate-pulse">Scanning neural features...</p>
                      <p className="mt-1 text-xs text-slate-500">Running ResNet-50 vision classification pipeline</p>
                    </div>
                  </motion.div>
                ) : aiResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="space-y-4"
                    id="ai-results"
                  >
                    <div className={`rounded-[1.25rem] border p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)] ${
                      aiResult.status === 'Processing' ? 'border-amber-500/30 bg-amber-500/10' :
                      aiResult.status === 'Flagged' ? 'border-rose-500/30 bg-rose-500/10' :
                      'border-emerald-500/30 bg-emerald-500/10'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                          aiResult.status === 'Processing' ? 'text-amber-400' :
                          aiResult.status === 'Flagged' ? 'text-rose-400' :
                          'text-emerald-400'
                        }`}>
                          Prediction Verdict
                        </span>
                        <StatusBadge status={aiResult.status} />
                      </div>
                      <p className="mt-2 text-base font-bold text-white drop-shadow-sm">{aiResult.defectType}</p>
                      <p className="mt-1 text-xs text-slate-400">{aiResult.details}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md transition-all hover:bg-white/10">
                          <span className="text-slate-400 font-medium">AI Confidence</span>
                          <p className="mt-0.5 text-sm font-bold text-indigo-300 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]">{aiResult.confidence}%</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md transition-all hover:bg-white/10">
                          <span className="text-slate-400 font-medium">Severity Rating</span>
                          <p className={`mt-0.5 text-sm font-bold ${
                            aiResult.severity === 'Critical' ? 'text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' :
                            aiResult.severity === 'High' ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]' :
                            aiResult.severity === 'Medium' ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                            'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                          }`}>{aiResult.severity}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </SectionCard>
          </section>



          {/* Section 3: Defect Details & Inspection History */}
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" id="history">
            {/* Inspection History */}
            <SectionCard
              title="Inspection History"
              subtitle="Search, filter, and review completed unit checks"
              icon={<History className="h-5 w-5" />}
            >
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by product or defect..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-colors"
                />
              </div>

              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                  {filteredHistory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group flex flex-col gap-2 rounded-[1.25rem] border border-white/5 bg-white/5 p-3.5 transition-all hover:border-white/10 hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{item.productName}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.line} • <span className="text-slate-500">{item.category}</span> • <span className="font-medium text-slate-300">{item.defectType}</span>
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-300">Score <span className="text-indigo-300">{item.score}</span>/100</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.uploadedAt}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SectionCard>

            {/* Defect Details */}
            <SectionCard
              title="Defect Details"
              subtitle="Detailed failure analysis and severity annotations"
              icon={<AlertTriangle className="h-5 w-5" />}
            >
              <div className="space-y-3" id="defects">
                {aiResult ? (
                  <>
                    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/40 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white drop-shadow-sm">{aiResult.defectType}</p>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${
                            aiResult.severity === 'Critical' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]' :
                            aiResult.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]' :
                            aiResult.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                          }`}>
                          {aiResult.severity}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-400">
                        <li className="flex justify-between border-b border-white/5 pb-1">
                          <span>Defect Zone:</span>
                          <span className="font-semibold text-slate-200">{aiResult.location}</span>
                        </li>
                        <li className="flex justify-between border-b border-white/5 pb-1">
                          <span>Confidence Score:</span>
                          <span className="font-semibold text-indigo-300">{aiResult.confidence}%</span>
                        </li>
                        <li className="flex justify-between pt-1">
                          <span>Status:</span>
                          <span className="font-semibold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">{aiResult.status}</span>
                        </li>
                      </ul>
                    </div>
    
                    <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-indigo-500/5 p-4 shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                      <p className="relative z-10 text-xs font-bold text-indigo-300">Inspection Details</p>
                      <p className="relative z-10 mt-1.5 text-xs text-slate-300 leading-relaxed">
                        {aiResult.details}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-white/5 text-center">
                    <AlertTriangle className="mb-2 h-6 w-6 text-slate-500" />
                    <p className="text-xs font-medium text-slate-400">No defect selected</p>
                    <p className="mt-1 text-[10px] text-slate-500">Run an AI scan to view defect details here.</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </section>

          {/* Section 3: Quick Actions & Report Generation */}
          <section className="grid gap-6 lg:grid-cols-2" id="reports">
            <SectionCard
              title="Quick Actions"
              subtitle="Fast triggers for engineering workflows"
              icon={<BarChart3 className="h-5 w-5" />}
            >
              <div className="space-y-3">
                <button
                  onClick={handleGenerateReport}
                  className="flex w-full items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-3 text-left text-xs font-semibold text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all hover:bg-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-300" />
                    Generate Official Quality Report
                  </span>
                  <Download className="h-4 w-4 text-indigo-300" />
                </button>

                {reportGenerated ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Quality Inspection Report (PDF) compiled and downloaded!
                  </div>
                ) : null}

                <QuickAction onClick={handleExport} label="Export Raw Inspection Data (CSV)" icon={<FileText className="h-4 w-4" />} />
                <QuickAction label="Calibrate AI Vision Thresholds" icon={<Sparkles className="h-4 w-4" />} />
              </div>
            </SectionCard>
          </section>
        </div>
      </DashboardShell>
    </DashboardLayout>
  );
}
