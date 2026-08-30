import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PALETTE = ["#3b6cf0", "#7c3aed", "#0d9488", "#d97706", "#e11d48", "#22c55e", "#0ea5e9"];

export default function CategoryBarChart({ data, colorful = true }) {
  const chartData = (data || []).slice(0, 8).map((d) => ({ name: d.label, value: d.count }));

  if (chartData.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-10">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={colorful ? PALETTE[index % PALETTE.length] : "#3b6cf0"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}