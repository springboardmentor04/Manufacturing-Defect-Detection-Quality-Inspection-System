"use client";

import { motion } from "framer-motion";

export function TrustedCompanies() {
  const companies = [
    "ACME Corp",
    "Global Manufacturing",
    "Tech Industries",
    "Precision Auto",
    "AeroSpace Dynamics",
    "Quantum Electronics",
  ];

  return (
    <section className="py-10 border-y border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col items-center">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8 text-center">
          Powering quality control for industry leaders
        </p>
        
        {/* Simple Marquee Implementation */}
        <div className="w-full relative flex overflow-x-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10" />
          
          <motion.div 
            className="flex gap-16 md:gap-24 items-center whitespace-nowrap px-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 20, repeat: Infinity }}
          >
            {/* Double the array for seamless looping */}
            {[...companies, ...companies].map((company, idx) => (
              <div 
                key={idx} 
                className="text-xl md:text-2xl font-bold text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-500 transition-colors cursor-default"
              >
                {company}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
