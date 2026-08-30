import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = {
  pass: "#10b981",
  fail: "#e11d48",
  pending: "#d97706",
  processing: "#3b6cf0",
  unknown: "#94a3b8",
};

export default function StatusPieChart({ data }) {
  const chartData = (data || []).map((d) => ({ name: d.label, value: d.count }));

  if (chartData.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-10">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={COLORS[entry.name] || "#7c3aed"} stroke="none" />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={30} />
      </PieChart>
    </ResponsiveContainer>
  );
}