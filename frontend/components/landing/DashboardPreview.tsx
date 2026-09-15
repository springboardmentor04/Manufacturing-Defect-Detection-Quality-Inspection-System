"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";

export function DashboardPreview() {
  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Actionable Intelligence at Your Fingertips
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Monitor your entire production line from a single pane of glass. Get real-time alerts on quality drops, track historical defect trends, and export comprehensive audit reports instantly.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Real-time processing up to 60fps",
                "Customizable pass/fail thresholds",
                "Seamless integration with existing MES/ERP",
                "Automated PDF reporting"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[80px] rounded-full" />
            
            {/* Dashboard Mockup Container */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 backdrop-blur-xl">
              
              {/* Top Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Inspected", val: "15,420", trend: "+12%" },
                  { label: "Defects", val: "440", trend: "-2%", isGood: true },
                  { label: "Pass Rate", val: "97.1%", trend: "+0.5%", isGood: true },
                  { label: "Speed", val: "42ms", trend: "Stable" }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.val}</p>
                    <p className={`text-[10px] mt-1 flex items-center gap-0.5 ${stat.isGood ? 'text-emerald-500' : 'text-blue-500'}`}>
                      <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart Mockup */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-4 mb-6 h-48 relative overflow-hidden">
                <div className="absolute top-4 left-4 font-semibold text-sm">Defect Trends</div>
                <div className="absolute bottom-4 left-4 right-4 h-32 flex items-end gap-2 justify-between">
                  {[40, 65, 45, 80, 55, 30, 45, 20].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="w-full bg-gradient-to-t from-blue-600/50 to-blue-400 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Recent Activity Mockup */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">Recent Alerts</h4>
                <div className="space-y-2">
                  {[
                    { type: 'Scratch', conf: '98%', status: 'FAIL' },
                    { type: 'Dent', conf: '92%', status: 'FAIL' }
                  ].map((alert, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">{alert.type} Detected</span>
                      </div>
                      <span className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono shadow-sm border border-slate-100 dark:border-slate-700">
                        {alert.conf}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
