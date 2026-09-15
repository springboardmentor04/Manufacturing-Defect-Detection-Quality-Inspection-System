"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm mb-6 border border-blue-100 dark:border-blue-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              VisionInspect AI v2.0 is Live
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white mb-6">
              AI-Powered <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Manufacturing
              </span> <br className="hidden md:block" />
              Quality Platform
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-xl">
              Automatically detect manufacturing defects, classify product quality, generate severity analysis, and improve production efficiency using AI-powered computer vision.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="inline-flex justify-center items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex justify-center items-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 px-8 py-3.5 rounded-full font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md">
                <Play className="w-5 h-5 fill-current" /> Watch Demo
              </button>
            </div>
            
            <div className="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p>Trusted by 500+ QC engineers</p>
            </div>
          </motion.div>

          {/* Right Column: Premium AI Illustration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center perspective-[2000px]"
          >
            {/* The Main Glassmorphism Dashboard Window */}
            <div className="relative w-full max-w-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden transform rotate-y-[-8deg] rotate-x-[4deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out group">
              
              {/* Window Header (macOS style) */}
              <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-950/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-red-500 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-amber-500 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500 transition-colors" />
                </div>
                <div className="text-xs font-mono font-medium text-slate-500 tracking-wider">VisionInspect AI Engine</div>
              </div>
              
              <div className="p-2 bg-slate-50 dark:bg-slate-950/50">
                {/* Inspection Viewport */}
                <div className="relative h-[320px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                  {/* High quality product image background */}
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-80 mix-blend-luminosity"></div>
                  
                  {/* Scanning Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                  {/* Bounding Box for Defect */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.6, type: "spring" }}
                    className="absolute top-[40%] left-[30%] w-[180px] h-[100px] border-[3px] border-red-500 bg-red-500/10 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] z-10"
                  >
                    {/* Targeting Corners */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-[3px] border-l-[3px] border-red-500"></div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-[3px] border-r-[3px] border-red-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-[3px] border-l-[3px] border-red-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-[3px] border-r-[3px] border-red-500"></div>

                    {/* Defect Label */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Surface Crack (98%)
                    </div>
                  </motion.div>
                  
                  {/* Scanning laser animation */}
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_3px_rgba(59,130,246,0.6)] z-20"
                  />
                </div>
              </div>
              
              {/* Analysis Results Footer */}
              <div className="p-6 bg-white dark:bg-slate-900">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Inspection Results</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: QA-77382-X</p>
                    </div>
                  </div>
                  <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    FAIL
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500 font-medium">Confidence Score</span>
                      <span className="font-bold text-slate-900 dark:text-white">98.4%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98.4%' }}
                        transition={{ delay: 1.5, duration: 1, type: "spring" }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500 font-medium">Severity Level</span>
                      <span className="font-bold text-orange-500">CRITICAL</span>
                    </div>
                    <div className="flex gap-1 h-2">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`flex-1 rounded-full ${i <= 5 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </motion.div>
        </div>
      </div>
    </section>
  );
}
