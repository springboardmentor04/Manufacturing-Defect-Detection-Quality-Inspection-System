import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

const COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
  None: "#64748b",
};

export default function SeverityBarChart({ data = [] }) {

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[350px] text-slate-400">
        No severity data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid
            stroke="#334155"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="severity"
            tick={{ fill: "#94a3b8", fontSize: 14 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={false}
          />

          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 14 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={false}
          />

          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
            }}
          />

          <Bar
            dataKey="count"
            maxBarSize={70}
            radius={[8, 8, 0, 0]}
          >
            {data.map((item, index) => (
              <Cell
                key={index}
                fill={COLORS[item.severity] || "#06b6d4"}
              />
            ))}
          </Bar>

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}