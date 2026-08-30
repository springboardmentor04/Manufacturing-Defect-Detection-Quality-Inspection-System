import React from "react";

const gradients = {
  brand: "from-brand-500 to-accent-purple",
  green: "from-emerald-500 to-teal-500",
  red: "from-rose-500 to-red-600",
  amber: "from-amber-500 to-orange-500",
  teal: "from-teal-500 to-cyan-500",
};

export default function StatCard({ label, value, accent = "brand", icon }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradients[accent]} opacity-10`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">{value}</p>
        </div>
        {icon && (
          <span
            className={`text-lg w-10 h-10 rounded-lg bg-gradient-to-br ${gradients[accent]} text-white flex items-center justify-center shadow-md`}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}