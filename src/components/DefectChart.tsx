"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { line: "Line 01", scratches: 8, missing: 2, misalignment: 1 },
  { line: "Line 03", scratches: 12, missing: 4, misalignment: 2 },
  { line: "Line 07", scratches: 18, missing: 7, misalignment: 5 },
  { line: "Line 11", scratches: 5, missing: 1, misalignment: 0 },
  { line: "Line 15", scratches: 10, missing: 3, misalignment: 2 },
];

export function DefectChart() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">Defects by production line</h2>
        <p className="text-sm text-slate-500">Comparative defect distribution across all lines</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="line" stroke="#64748b" style={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar dataKey="scratches" fill="#f59e0b" name="Surface Scratches" radius={[8, 8, 0, 0]} />
          <Bar dataKey="missing" fill="#ef4444" name="Missing Components" radius={[8, 8, 0, 0]} />
          <Bar dataKey="misalignment" fill="#8b5cf6" name="Misalignment" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
