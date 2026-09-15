"use client";

import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, Cpu, Layers, AlertOctagon, CheckCircle2, BarChart4 } from "lucide-react";

export function WorkflowSection() {
  const steps = [
    { id: 1, title: "Image Capture", icon: Camera, desc: "High-speed cameras capture product imagery." },
    { id: 2, title: "Image Processing", icon: ImageIcon, desc: "Images are normalized and enhanced." },
    { id: 3, title: "AI Detection", icon: Cpu, desc: "Models scan for potential anomalies." },
    { id: 4, title: "Classification", icon: Layers, desc: "Defects are categorized by type." },
    { id: 5, title: "Severity Analysis", icon: AlertOctagon, desc: "Impact score is calculated." },
    { id: 6, title: "Quality Decision", icon: CheckCircle2, desc: "PASS or FAIL decision is made." },
    { id: 7, title: "Analytics", icon: BarChart4, desc: "Data sent to dashboard for insights." },
  ];

  return (
    <section id="workflow" className="py-24 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            How It Works
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            A seamless pipeline from image ingestion to actionable manufacturing intelligence in milliseconds.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6 relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-row md:flex-col items-center gap-4 text-left md:text-center group"
              >
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:border-blue-500 transition-colors flex-shrink-0 z-10 relative">
                  <step.icon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
                  
                  {/* Active ping indicator */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-0 group-hover:animate-ping" />
                </div>
                
                {/* Connecting Line (Mobile) */}
                {idx !== steps.length - 1 && (
                  <div className="md:hidden absolute left-8 top-16 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                )}
                
                <div>
                  <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
