import Card from "../common/Card";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Boxes,
  ShieldCheck,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function StatsCard({
  label,
  value,
  delta,
  direction,
  icon,
}) {

  const isDown = direction === "down";
  const icons = {
    inspection: Boxes,
    accuracy: ShieldCheck,
    users: Users,
    warning: AlertTriangle,
  };

  const Icon = icons[icon] || Activity;
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1">

      {/* Background Glow */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500 opacity-10 blur-2xl transition-all duration-300 group-hover:scale-125"></div>

      <div className="relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-slate-400">
              {label}
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-50">
              {value}
            </h2>

          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">

            <Icon
              size={28}
              className="text-cyan-400"
            />

          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">

          {delta ? (
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                isDown
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {isDown ? (
                <TrendingDown size={16} />
              ) : (
                <TrendingUp size={16} />
              )}

              {delta}
            </div>
          ) : (
            <span className="text-sm text-slate-500">
              Live Factory Data
            </span>
          )}

          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
            LIVE
          </span>

        </div>

      </div>

    </Card>
  );
}
