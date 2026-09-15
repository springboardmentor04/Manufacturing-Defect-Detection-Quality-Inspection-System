"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Clock, AlertCircle, CheckCircle2, RefreshCcw, FileImage, User, HardDrive, Calendar, Activity, BarChart3, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";

type Inspection = {
  inspection_id: string;
  dataset_category: string;
  engineer_name: string;
  employee_id: string;
  status: string;
  upload_time: string;
  source: string;
  image_path: string;
  original_filename: string;
  ai_status?: string;
  inspection_result?: string;
  confidence?: number;
  defect_type?: string;
  defect_category?: string;
  severity?: string;
  severity_score?: number;
  severity_level?: string;
  severity_components?: {
    size_score: number;
    location_score: number;
    defect_type_score: number;
    confidence_score: number;
  };
  quality_risk?: string;
  recommended_action?: string;
  completed_at?: string;
  processing_time?: number;
  bounding_boxes?: number[][];
  processing_time?: number;
  bounding_boxes?: number[][];
  segmentation_masks?: number[][][];
  image_quality?: {
    width: number;
    height: number;
    channels: number;
    mean_brightness: number;
    contrast: number;
    sharpness: number;
    quality_status: string;
    format: string;
    file_size_bytes: number;
  };
  image_analytics?: {
    defect_count: number;
    detected_defect_types: string[];
    highest_confidence: number;
    average_confidence: number;
    defect_coverage_percentage: number;
  };
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspection_id = params.inspection_id as string;
  
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInspection = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inspections/${inspection_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Inspection not found");
        if (res.status === 403) throw new Error("Not authorized to view this inspection");
        throw new Error("Failed to fetch inspection details");
      }
      
      const data = await res.json();
      setInspection(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred");
      } else {
        setError("An error occurred");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [inspection_id]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  // Polling for processing state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inspection && (inspection.status === 'Pending' || inspection.status === 'Processing')) {
      interval = setInterval(() => {
        fetchInspection(true);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inspection?.status, fetchInspection]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this inspection? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("visioninspect_auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inspections/${inspection_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        router.push('/dashboard/engineer/history');
      } else {
        alert("Failed to delete inspection");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting");
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider flex items-center gap-2 w-max"><CheckCircle2 className="w-4 h-4"/> COMPLETED</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider flex items-center gap-2 w-max"><Clock className="w-4 h-4 animate-spin"/> PROCESSING</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider flex items-center gap-2 w-max"><AlertCircle className="w-4 h-4"/> FAILED</span>;
      default:
        return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider flex items-center gap-2 w-max"><Clock className="w-4 h-4"/> PENDING</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Clock className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-medium">Loading inspection details...</p>
        </div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="max-w-4xl mx-auto pb-12 pt-6 px-4">
        <Link href="/dashboard/engineer/history" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors w-max">
          <ChevronLeft className="w-5 h-5" /> Back to History
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-12 text-center text-red-600 dark:text-red-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Inspection</h2>
          <p>{error || "Inspection not found"}</p>
        </div>
      </div>
    );
  }

  const imageUrl = inspection.image_path.startsWith('http') 
    ? inspection.image_path 
    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${inspection.image_path}`;

  return (
    <ClientOnly>
      <div className="max-w-6xl mx-auto pb-12 pt-6 px-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <Link href="/dashboard/engineer/history" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 transition-colors w-max">
              <ChevronLeft className="w-4 h-4" /> Back to History
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Inspection {inspection.inspection_id}
            </h1>
            <p className="text-slate-500 mt-1 capitalize">{inspection.dataset_category.replace('_', ' ')} • {inspection.source}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchInspection}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
            <button 
              onClick={handleDelete}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2 font-medium"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content - Image & Timeline */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-blue-500" /> Captured Image
                </h3>
                {renderStatusBadge(inspection.status)}
              </div>
              <div className="bg-black/5 dark:bg-black/20 p-8 flex items-center justify-center min-h-[400px]">
                <div className="relative inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={imageUrl} 
                    alt={inspection.dataset_category} 
                    className="max-w-full max-h-[600px] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 block"
                  />
                  {/* Segmentation Overlay */}
                  {inspection.segmentation_masks && inspection.segmentation_masks.length > 0 && (
                    <svg 
                      viewBox="0 0 1 1" 
                      preserveAspectRatio="none" 
                      className="absolute inset-0 w-full h-full rounded-xl pointer-events-none"
                    >
                      {inspection.segmentation_masks.map((polygon, i) => (
                        <polygon 
                          key={i}
                          points={polygon.map((p: number[]) => `${p[0]},${p[1]}`).join(' ')}
                          fill="rgba(239, 68, 68, 0.4)"
                          stroke="rgb(239, 68, 68)"
                          strokeWidth="0.005"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                  )}
                  {/* Bounding Box Overlay (Fallback if masks are not present or to show both) */}
                  {(!inspection.segmentation_masks || inspection.segmentation_masks.length === 0) && inspection.bounding_boxes && inspection.bounding_boxes.map((box, i) => {
                    const [x1, y1, x2, y2] = box;
                    return (
                      <div 
                        key={i}
                        className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                        style={{
                          left: `${x1 * 100}%`,
                          top: `${y1 * 100}%`,
                          width: `${(x2 - x1) * 100}%`,
                          height: `${(y2 - y1) * 100}%`
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Inspection Timeline</h3>
              
              <div className="relative pl-8 space-y-6 before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent">
                
                {/* Upload Step */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 dark:text-white">Inspection Created</div>
                      <time className="text-xs font-medium text-blue-500">{new Date(inspection.upload_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                    </div>
                    <div className="text-slate-500 text-sm">Image uploaded by {inspection.engineer_name}</div>
                  </div>
                </div>

                {/* Processing Step */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                    inspection.status === 'Completed' ? 'bg-blue-500 text-white' : (inspection.status === 'Processing' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400')
                  }`}>
                    {inspection.status === 'Processing' ? <Clock className="w-5 h-5 animate-spin" /> : (inspection.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />)}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 dark:text-white">AI Processing</div>
                    </div>
                    <div className="text-slate-500 text-sm">
                      {inspection.status === 'Completed' 
                        ? "AI analysis completed successfully." 
                        : (inspection.status === 'Failed' 
                            ? "AI processing failed." 
                            : (inspection.ai_status || "Waiting for AI model to process the image."))}
                    </div>
                  </div>
                </div>

                {/* Completed Step */}
                {inspection.status === 'Completed' && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 dark:text-white">Result Generated</div>
                        <time className="text-xs font-medium text-emerald-500">{inspection.completed_at ? new Date(inspection.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</time>
                      </div>
                      <div className="text-slate-500 text-sm">Processed in {inspection.processing_time} seconds</div>
                    </div>
                  </div>
                )}
                
                
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Details */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">Metadata</h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <User className="w-4 h-4" /> Engineer
                  </div>
                  <div className="font-medium text-slate-900 dark:text-white">{inspection.engineer_name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{inspection.employee_id}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <Calendar className="w-4 h-4" /> Date & Time
                  </div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {new Date(inspection.upload_time).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(inspection.upload_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <HardDrive className="w-4 h-4" /> File Details
                  </div>
                  <div className="font-medium text-slate-900 dark:text-white truncate" title={inspection.original_filename}>
                    {inspection.original_filename}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 capitalize flex items-center justify-between">
                    <span>Source: {inspection.source}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {inspection.status === 'Completed' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
              >
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">AI Results</h3>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Result
                    </div>
                    <div className="font-medium">
                      {inspection.inspection_result === 'PASS' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-sm">PASS</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full text-sm">FAIL</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Confidence
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${inspection.inspection_result === 'PASS' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${inspection.confidence}%` }}></div>
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{inspection.confidence}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Defect Type
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {inspection.defect_type || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Category
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {inspection.defect_category || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Severity Level
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        inspection.severity_level === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        inspection.severity_level === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 
                        inspection.severity_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        inspection.severity_level === 'LOW' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {inspection.severity_level || inspection.severity || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {inspection.quality_risk && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                         Quality Risk
                      </div>
                      <div className="font-medium text-slate-900 dark:text-white text-sm">
                        {inspection.quality_risk}
                      </div>
                    </div>
                  )}

                  {inspection.recommended_action && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                         Recommended Action
                      </div>
                      <div className="font-medium text-slate-900 dark:text-white text-sm">
                        {inspection.recommended_action}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       Processing Time
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {inspection.processing_time}s
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Severity Calculation Breakdown */}
            {inspection.status === 'Completed' && inspection.severity_components && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
              >
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
                  Severity Calculation
                </h3>
                
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Size</span>
                    <span>{inspection.severity_components.size_score} × 30% = {(inspection.severity_components.size_score * 0.30).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Location</span>
                    <span>{inspection.severity_components.location_score} × 25% = {(inspection.severity_components.location_score * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Defect Type</span>
                    <span>{inspection.severity_components.defect_type_score} × 25% = {(inspection.severity_components.defect_type_score * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Confidence</span>
                    <span>{inspection.severity_components.confidence_score} × 20% = {(inspection.severity_components.confidence_score * 0.20).toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 mt-3 font-bold">
                    <div className="flex justify-between items-center mb-1">
                      <span>Final Score</span>
                      <span>{inspection.severity_score} / 100</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-xs">
                      <span>Severity</span>
                      <span className={
                        inspection.severity_level === 'CRITICAL' ? 'text-red-600 dark:text-red-400' : 
                        inspection.severity_level === 'HIGH' ? 'text-amber-600 dark:text-amber-400' : 
                        inspection.severity_level === 'MEDIUM' ? 'text-blue-600 dark:text-blue-400' :
                        'text-slate-600 dark:text-slate-400'
                      }>{inspection.severity_level}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Image Quality Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" /> Image Quality
              </h3>
              
              {!inspection.image_quality ? (
                <div className="text-slate-500 text-sm italic">Not available</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Resolution</span>
                    <span className="font-medium text-slate-900 dark:text-white">{inspection.image_quality.width}x{inspection.image_quality.height}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Brightness</span>
                    <span className="font-medium text-slate-900 dark:text-white">{inspection.image_quality.mean_brightness}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Contrast</span>
                    <span className="font-medium text-slate-900 dark:text-white">{inspection.image_quality.contrast}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Sharpness</span>
                    <span className="font-medium text-slate-900 dark:text-white">{inspection.image_quality.sharpness}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Format</span>
                    <span className="font-medium text-slate-900 dark:text-white uppercase">{inspection.image_quality.format}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Size</span>
                    <span className="font-medium text-slate-900 dark:text-white">{(inspection.image_quality.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="col-span-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quality Status</span>
                      <span className={`font-bold px-2 py-1 rounded text-xs ${inspection.image_quality.quality_status === 'GOOD' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : (inspection.image_quality.quality_status === 'ACCEPTABLE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}`}>
                        {inspection.image_quality.quality_status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Image Analytics Card */}
            {inspection.status === 'Completed' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
              >
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" /> Image Analytics
                </h3>
                
                {!inspection.image_analytics ? (
                  <div className="text-slate-500 text-sm italic">Not available</div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Defect Count</span>
                      <span className="font-bold text-slate-900 dark:text-white">{inspection.image_analytics.defect_count}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Avg Confidence</span>
                      <span className="font-medium text-slate-900 dark:text-white">{inspection.image_analytics.average_confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Defect Coverage</span>
                      <span className="font-medium text-slate-900 dark:text-white">{inspection.image_analytics.defect_coverage_percentage}% area</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-2">Detected Types</span>
                      <div className="flex flex-wrap gap-2">
                        {inspection.image_analytics.detected_defect_types.length > 0 ? (
                          inspection.image_analytics.detected_defect_types.map((type, i) => (
                            <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-medium">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>

        </div>
      </div>
    </ClientOnly>
  );
}
