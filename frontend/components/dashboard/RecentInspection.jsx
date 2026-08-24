import { useState } from "react";
import { History, Eye } from "lucide-react";
import { formatDate } from "../../utils/formatters";

import InspectionDetailsModal from "./InspectionDetailsModal";

const STATUS = {
  pass: {
    label: "PASS",
    bg: "bg-green-500/20",
    text: "text-green-400",
  },
  fail: {
    label: "FAIL",
    bg: "bg-red-500/20",
    text: "text-red-400",
  },
  pending: {
    label: "PROCESSING",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
  },
};

const SEVERITY = {
  Critical: "text-red-500",
  High: "text-orange-400",
  Medium: "text-yellow-400",
  Low: "text-green-400",
  None: "text-slate-400",
};

export default function RecentInspection({
  inspections = [],
}) {

  const [selectedInspection, setSelectedInspection] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const handleView = (inspection) => {
    setSelectedInspection(inspection);
    setOpenModal(true);
  };

  if (!inspections.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">

        <History
          size={55}
          className="mb-4 text-slate-500"
        />

        <h2 className="text-xl font-semibold text-white">
          No Inspection History
        </h2>

        <p className="mt-2 text-slate-400">
          Upload a product image to begin AI inspection.
        </p>

      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="border-b border-slate-700">

            <tr className="text-left">

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                ID
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Product
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Status
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Defect
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Severity
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Confidence
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Date
              </th>

              <th className="px-5 py-4 text-sm font-semibold text-slate-400">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {inspections.map((row) => {

              const status =
                STATUS[row.status] || STATUS.pending;

              return (

                <tr
                  key={row.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                >

                  <td className="px-5 py-5 font-mono text-cyan-400">
                    #{row.id}
                  </td>

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                        📦
                      </div>

                      <div>

                        <p className="font-medium text-white">
                          {row.product_name}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-5">

                    <span
                      className={`rounded-full px-4 py-1 text-sm font-semibold ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>

                  </td>

                  <td className="px-5 py-5 text-slate-300">
                    {row.defect_type}
                  </td>

                  <td className="px-5 py-5">

                    <span
                      className={`font-semibold ${
                        SEVERITY[row.severity] || "text-slate-400"
                      }`}
                    >
                      {row.severity}
                    </span>

                  </td>

                  <td className="px-5 py-5 text-slate-300">
                    {(row.confidence * 100).toFixed(2)}%
                  </td>

                  <td className="px-5 py-5 text-slate-300">
                    {formatDate(row.created_at)}
                  </td>

                  <td className="px-5 py-5">

                    <button
                      onClick={() => handleView(row)}
                      className="flex items-center gap-2 rounded-lg border border-cyan-600 px-3 py-2 text-cyan-400 transition hover:bg-cyan-500/10"
                    >

                      <Eye size={17} />

                      View

                    </button>

                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>

      <InspectionDetailsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        inspection={selectedInspection}
      />
    </>
  );
}