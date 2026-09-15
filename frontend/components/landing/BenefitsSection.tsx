"use client";

import { motion } from "framer-motion";
import { Timer, ArrowDownToLine, TrendingUp, Cpu, Factory, Zap } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      title: "Reduce Manual Inspection",
      desc: "Free up your QA team from tedious visual checks, allowing them to focus on root cause analysis and process improvement.",
      icon: ArrowDownToLine
    },
    {
      title: "Increase Product Quality",
      desc: "Achieve near-zero defect rates before products reach your customers, protecting your brand reputation.",
      icon: TrendingUp
    },
    {
      title: "Faster Inspection Cycle",
      desc: "Analyze products moving at high speeds on the conveyor belt without slowing down production throughput.",
      icon: Timer
    },
    {
      title: "AI Automation",
      desc: "Continuous learning models that adapt to new product lines and defect types without manual reprogramming.",
      icon: Cpu
    },
    {
      title: "Production Intelligence",
      desc: "Correlate defect data with specific machines, shifts, or material batches to pinpoint inefficiencies.",
      icon: Zap
    },
    {
      title: "Industry 4.0 Ready",
      desc: "Connect seamlessly with existing MES, ERP, and IoT infrastructure for a fully integrated smart factory.",
      icon: Factory
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight max-w-2xl">
            Built for modern manufacturing environments
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600 dark:text-blue-400">
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
