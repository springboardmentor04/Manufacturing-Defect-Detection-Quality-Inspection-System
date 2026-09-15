"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

function AnimatedCounter({ end, suffix = "", duration = 2 }: { end: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / (duration * 1000);
        
        if (progress < 1) {
          setCount(Math.floor(end * progress));
          animationFrame = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export function StatsSection() {
  const stats = [
    { value: 100, suffix: "K+", label: "Images Processed Daily" },
    { value: 98, suffix: "%", label: "Detection Accuracy" },
    { value: 40, suffix: "%", label: "Inspection Time Reduced" },
    { value: 24, suffix: "/7", label: "AI Monitoring" }
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-200 dark:divide-slate-800">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`text-center ${idx === 0 ? '' : 'pl-8'}`}
            >
              <div className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-2">
                {stat.value === 24 ? "24/7" : <AnimatedCounter end={stat.value} suffix={stat.suffix} />}
              </div>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
