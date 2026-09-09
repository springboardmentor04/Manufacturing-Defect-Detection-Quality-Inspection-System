"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "00:00", passRate: 96.8, confidence: 94.2 },
  { time: "04:00", passRate: 97.2, confidence: 95.1 },
  { time: "08:00", passRate: 98.1, confidence: 96.3 },
  { time: "12:00", passRate: 97.8, confidence: 95.9 },
  { time: "16:00", passRate: 98.4, confidence: 96.8 },
  { time: "20:00", passRate: 99.1, confidence: 97.2 },
];

export function TrendChart() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">Performance trends</h2>
        <p className="text-sm text-slate-500">Pass rate and AI confidence over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" style={{ fontSize: 12 }} domain={[90, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981" }}
            name="Pass Rate (%)"
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="confidence"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1" }}
            name="AI Confidence (%)"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
