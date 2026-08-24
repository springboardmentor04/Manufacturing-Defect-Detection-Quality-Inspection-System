import { useState } from "react";
import {
  History,
  Search,
  Filter,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Cpu,
} from "lucide-react";

import { useFetch } from "../../hooks/useFetch";
import { historyService } from "../../services/historyService";

import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import RecentInspection from "../../components/dashboard/RecentInspection";

export default function InspectionHistory() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data, loading } = useFetch(
  () => historyService.getHistory(),
  []
);

  const inspections = data || [];

  const filteredData = inspections.filter((item) => {

    const matchSearch =
        !search ||
        item.product_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
        item.defect_type
            ?.toLowerCase()
            .includes(search.toLowerCase());

    const matchStatus =
        status === "all" ||
        item.status === status;

    return matchSearch && matchStatus;

});
  const total = inspections.length;

  const passed = inspections.filter(
    (item) => item.status === "pass"
  ).length;

  const failed = inspections.filter(
    (item) => item.status === "fail"
  ).length;

  const avgConfidence =
    inspections.length > 0
      ? (
          inspections.reduce(
            (sum, item) => sum + (item.confidence*100),
            0
          ) / inspections.length
        ).toFixed(1)
      : 0;

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-8">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-cyan-500/20 p-4">

            <History
              size={34}
              className="text-cyan-400"
            />

          </div>

          <div>

            <h1 className="text-3xl font-bold text-white">
              Inspection History
            </h1>

            <p className="mt-2 text-slate-300">
              Monitor all completed AI inspections.
            </p>

          </div>

        </div>

      </div>

      {/* Search + Filter */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-4">

          <Search
            size={18}
            className="text-slate-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search product..."
            className="w-full bg-transparent px-3 py-3 text-white outline-none placeholder:text-slate-500"
          />

        </div>

        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-4">

          <Filter
            size={18}
            className="text-slate-400"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            className="w-full bg-transparent px-3 py-3 text-white outline-none"
          >

            <option
              value="all"
              className="bg-slate-900"
            >
              All Results
            </option>

            <option
              value="pass"
              className="bg-slate-900"
            >
              Pass Only
            </option>

            <option
              value="fail"
              className="bg-slate-900"
            >
              Defects Only
            </option>

          </select>

        </div>

      </div>

      {/* Statistics */}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

        <StatCard
          title="Total"
          value={total}
          icon={
            <ClipboardCheck
              className="text-cyan-400"
            />
          }
        />

        <StatCard
          title="Passed"
          value={passed}
          icon={
            <CheckCircle2
              className="text-green-400"
            />
          }
        />

        <StatCard
          title="Failed"
          value={failed}
          icon={
            <XCircle
              className="text-red-400"
            />
          }
        />

        <StatCard
          title="Avg Confidence"
          value={`${avgConfidence}%`}
          icon={
            <Cpu
              className="text-blue-400"
            />
          }
        />

      </div>

      {/* History Table */}

      <Card>

        {loading ? (

          <Loader label="Loading history..." />

        ) : (

          <RecentInspection
            inspections={filteredData}
          />

        )}

      </Card>

    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 hover:border-cyan-500 transition">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-slate-400 text-sm">

            {title}

          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">

            {value}

          </h2>

        </div>

        {icon}

      </div>

    </div>
  );
}