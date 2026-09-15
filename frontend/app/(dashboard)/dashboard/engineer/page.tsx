"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, UploadCloud, AlertTriangle, CheckCircle2, Clock, Plus, FileText, Search } from "lucide-react";
import Link from "next/link";
import { qualityMetrics, inspectionQueue } from "@/lib/mock-data";

import { ImagePicker } from "@/components/dashboard/ImagePicker";
import { CameraCard } from "@/components/dashboard/CameraCard";
import { QueueWidget } from "@/components/dashboard/QueueWidget";
import { DetectionPreview, Inspection } from "@/components/dashboard/DetectionPreview";
import { RecentInspectionsTable } from "@/components/dashboard/RecentInspectionsTable";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { ClientOnly } from "@/components/ClientOnly";

// KPI Cards Data
const stats = [
  { title: "Images Inspected Today", val: qualityMetrics.totalInspected.toLocaleString(), icon: Camera, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { title: "Pending Inspections", val: inspectionQueue.waiting.toString(), icon: Clock, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { title: "Critical Defects", val: "18", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
  { title: "Average AI Confidence", val: "94.2%", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
];

export default function EngineerDashboard() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const token = localStorage.getItem("visioninspect_auth_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inspections?limit=10&sort=newest`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInspections(data.items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInspections();
  }, []);

  const latestInspection = inspections.length > 0 ? inspections[0] : null;

  return (
    <ClientOnly>
      <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-[1600px] mx-auto pb-10"
    >
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quality Engineer Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage AI inspections, review defects, and monitor workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm active:scale-95">
            <Camera className="w-4 h-4" /> Start Camera
          </button>
          <button className="flex items-center gap-2 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm active:scale-95">
            <FileText className="w-4 h-4" /> View Reports
          </button>
          <Link href="/dashboard/engineer/new-inspection" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95">
            <UploadCloud className="w-4 h-4" /> Upload Image
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
               <stat.icon className="w-24 h-24" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0 shadow-inner`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.val}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Panel */}
      <DashboardCharts />

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column (Main Actions) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* New Inspection CTA */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready for a New Inspection?</h2>
                <p className="text-blue-100 max-w-md">Upload high-resolution images or connect a camera stream to run our AI defect detection models instantly.</p>
              </div>
              <Link href="/dashboard/engineer/new-inspection" className="shrink-0 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg active:scale-95">
                <Plus className="w-5 h-5" /> Start New Inspection
              </Link>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <ImagePicker />
            <CameraCard />
          </div>
          
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 flex justify-center items-center border border-slate-200 dark:border-slate-800">
              <Clock className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <RecentInspectionsTable data={inspections} />
          )}
        </div>

        {/* Right Column (Side panels) */}
        <div className="space-y-8">
          {latestInspection ? (
            <DetectionPreview data={latestInspection} />
          ) : (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm h-64">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium">No inspections yet. Start your first inspection.</p>
            </div>
          )}
          <QueueWidget data={inspectionQueue} />
        </div>
      </div>
    </motion.div>
    </ClientOnly>
  );
}
