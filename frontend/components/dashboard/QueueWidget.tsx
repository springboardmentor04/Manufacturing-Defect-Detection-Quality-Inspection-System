"use client";

import { Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function QueueWidget({ data }: { data: { waiting: number, processing: number, completed: number } }) {
  const [waiting, setWaiting] = useState(0);
  const [processing, setProcessing] = useState(0);
  const [completed, setCompleted] = useState(0);

  // Animated counters
  useEffect(() => {
    const duration = 1000;
    const steps = 20;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setWaiting(Math.floor((data.waiting / steps) * currentStep));
      setProcessing(Math.floor((data.processing / steps) * currentStep));
      setCompleted(Math.floor((data.completed / steps) * currentStep));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setWaiting(data.waiting);
        setProcessing(data.processing);
        setCompleted(data.completed);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [data]);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm p-6 h-full flex flex-col">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" /> Live Queue Status
      </h3>
      
      <div className="space-y-4 flex-1">
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Waiting</span>
          </div>
          <span className="font-bold text-xl">{waiting}</span>
        </motion.div>
        
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="font-medium text-blue-700 dark:text-blue-300">Processing</span>
          </div>
          <span className="font-bold text-xl text-blue-700 dark:text-blue-300">{processing}</span>
        </motion.div>
        
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Completed (24h)</span>
          </div>
          <span className="font-bold text-xl text-emerald-700 dark:text-emerald-300">{completed.toLocaleString()}</span>
        </motion.div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
        <span className="text-slate-500">Avg. Processing Time</span>
        <span className="font-bold text-slate-900 dark:text-white">1.2s / item</span>
      </div>
    </div>
  );
}
