"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Search, RefreshCcw, FolderTree, HardDrive, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { ClientOnly } from "@/components/ClientOnly";

// Types
type DatasetOverview = {
  total_categories: number;
  total_images: number;
  train_images: number;
  test_images: number;
  ground_truth_images: number;
  total_size: string;
  health_status: string;
  dataset_path: string;
};

type CategoryData = {
  name: string;
  train_images: number;
  test_images: number;
  ground_truth_images: number;
  total_size_bytes: number;
  formatted_size: string;
  status: string;
  is_valid: boolean;
};

type HealthReport = {
  status: string;
  message: string;
  issues: string[];
};

export default function DatasetManagementPage() {
  const [overview, setOverview] = useState<DatasetOverview | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [health, setHealth] = useState<HealthReport | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "images">("name");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const [overviewRes, categoriesRes, healthRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/dataset/overview`),
        fetch(`${baseUrl}/api/v1/dataset/categories`),
        fetch(`${baseUrl}/api/v1/dataset/health`)
      ]);

      if (!overviewRes.ok || !categoriesRes.ok || !healthRes.ok) {
        throw new Error("Failed to fetch dataset information");
      }

      setOverview(await overviewRes.json());
      setCategories(await categoriesRes.json());
      setHealth(await healthRes.json());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred while fetching dataset data.");
      } else {
        setError("An unexpected error occurred while fetching dataset data.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort categories
  const filteredCategories = categories
    .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return b.total_size_bytes - a.total_size_bytes;
      if (sortBy === "images") return (b.train_images + b.test_images + b.ground_truth_images) - (a.train_images + a.test_images + a.ground_truth_images);
      return 0;
    });

  return (
    <ClientOnly>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4 md:px-8 pt-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" /> Dataset Management
            </h1>
            <p className="text-slate-500 mt-1">Monitor, validate, and manage local MVTec AD training datasets.</p>
          </div>
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} /> 
            {isLoading ? 'Scanning...' : 'Refresh Dataset'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error loading dataset</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        {!error && overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                <FolderTree className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Categories</p>
                <h3 className="text-2xl font-bold">{overview.total_categories}</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Images</p>
                <h3 className="text-2xl font-bold">{overview.total_images.toLocaleString()}</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Storage Usage</p>
                <h3 className="text-2xl font-bold">{overview.total_size}</h3>
              </div>
            </div>
            
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${overview.health_status === 'Healthy' ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-amber-200 dark:border-amber-800/50'} p-6 shadow-sm flex items-center gap-4`}>
              <div className={`p-3 rounded-xl ${overview.health_status === 'Healthy' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                {overview.health_status === 'Healthy' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Dataset Status</p>
                <h3 className="text-2xl font-bold">{overview.health_status}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Health Report */}
        {!error && health && health.issues.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
            <h3 className="text-amber-800 dark:text-amber-500 font-bold flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" /> Validation Issues Found
            </h3>
            <ul className="space-y-1 list-disc list-inside text-sm text-amber-700 dark:text-amber-400/80">
              {health.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Categories Section */}
        {!error && !isLoading && categories.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-slate-500 font-medium">Sort by:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "size" | "images")}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                >
                  <option value="name">Alphabetical</option>
                  <option value="images">Most Images</option>
                  <option value="size">Largest Size</option>
                </select>
              </div>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No categories found</h3>
                <p className="text-slate-500 text-sm">Adjust your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCategories.map((cat) => (
                  <div key={cat.name} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-start">
                      <h3 className="font-bold text-xl capitalize text-slate-900 dark:text-white">{cat.name.replace('_', ' ')}</h3>
                      {cat.is_valid ? (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5" /> Warning
                        </span>
                      )}
                    </div>
                    
                    <div className="p-6 space-y-4 flex-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Training Images</span>
                        <span className="font-bold">{cat.train_images.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Testing Images</span>
                        <span className="font-bold">{cat.test_images.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Ground Truth</span>
                        <span className="font-bold">{cat.ground_truth_images.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center mt-auto">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Size</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.formatted_size}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State / Not Found */}
        {!error && !isLoading && categories.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Dataset Not Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              We couldn&apos;t find the MVTec AD dataset. Please ensure it is correctly placed in the 
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded mx-1 font-mono text-sm">dataset/mvtec_ad</code> directory.
            </p>
          </div>
        )}

      </motion.div>
    </ClientOnly>
  );
}
