"use client";

import { motion } from "framer-motion";
import { Scan, Cpu, Layers, BarChart4, AlertOctagon, Microscope } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Scan,
      title: "AI Defect Detection",
      desc: "Identify microscopic scratches, dents, and anomalies with 99.9% precision.",
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      icon: Microscope,
      title: "Computer Vision Inspection",
      desc: "Process high-resolution imagery from any industrial camera feed in real-time.",
      color: "from-indigo-500 to-purple-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      icon: Cpu,
      title: "Quality Control Automation",
      desc: "Eliminate human error by automating the pass/fail decision making pipeline.",
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      icon: Layers,
      title: "Defect Classification",
      desc: "Automatically categorize defects by type, size, and location for better insights.",
      color: "from-orange-500 to-amber-500",
      bg: "bg-orange-50 dark:bg-orange-900/20"
    },
    {
      icon: AlertOctagon,
      title: "Severity Scoring",
      desc: "Assess the critical impact of each defect to determine rework or scrap actions.",
      color: "from-rose-500 to-red-500",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    },
    {
      icon: BarChart4,
      title: "Manufacturing Analytics",
      desc: "Track production quality trends over time and optimize manufacturing processes.",
      color: "from-blue-600 to-indigo-600",
      bg: "bg-blue-50 dark:bg-indigo-900/20"
    }
  ];

  return (
    <section id="features" className="py-24 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Next-Generation Vision
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Our proprietary AI models are trained on millions of manufacturing samples to catch what the human eye misses.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-bl-full pointer-events-none ${feature.color}" />
              
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className="w-7 h-7 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
