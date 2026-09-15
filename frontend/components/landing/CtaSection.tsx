"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 bg-slate-900 dark:bg-slate-950">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-30" />
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Ready to Modernize Manufacturing Quality Inspection?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join industry leaders using VisionInspect AI to eliminate defects, reduce costs, and accelerate production lines.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-transparent text-white border border-slate-700 px-8 py-4 rounded-full font-bold hover:bg-slate-800 transition-all">
              Schedule Demo
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            No credit card required. 14-day free trial on enterprise features.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
