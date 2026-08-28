import { motion } from "framer-motion";

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
}) {
  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.02,
      }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl"
    >
      {/* Glow */}
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl transition group-hover:bg-cyan-400/20" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {title}
          </p>

          <span className="text-2xl">
            {icon}
          </span>
        </div>

        <h2 className="mt-4 text-4xl font-bold tracking-tight">
          {value}
        </h2>

        <p className="mt-2 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}