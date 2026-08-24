import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#f97316",
];

export default function DefectPieChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[500px] text-slate-400">
        No defect data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]">

      <ResponsiveContainer width="100%" height="100%">

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={170}
            paddingAngle={3}
            label={({ percent }) =>
              `${(percent * 100).toFixed(0)}%`
            }
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value, name) => [
              `${value} Inspections`,
              name,
            ]}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "14px",
            }}
            itemStyle={{
              color: "#ffffff",
            }}
            labelStyle={{
              color: "#94a3b8",
            }}
          />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
}