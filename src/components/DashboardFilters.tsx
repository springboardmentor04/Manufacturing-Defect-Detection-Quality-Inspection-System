"use client";

import { useState } from "react";
import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardFilters() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLine, setSelectedLine] = useState("All");
  const [selectedTime, setSelectedTime] = useState("24h");

  const lines = ["All", "Line 01", "Line 03", "Line 07", "Line 11", "Line 15"];
  const timeRanges = [
    { label: "Last 24h", value: "24h" },
    { label: "Last 7d", value: "7d" },
    { label: "Last 30d", value: "30d" },
    { label: "Last 90d", value: "90d" },
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="flex items-center gap-2 border-slate-200"
        >
          <Filter className="h-4 w-4" />
          Filters
          {showFilters ? <X className="h-4 w-4" /> : null}
        </Button>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          <span>Showing data for last <strong>{selectedTime}</strong></span>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Production Line
              </label>
              <div className="flex flex-wrap gap-2">
                {lines.map((line) => (
                  <button
                    key={line}
                    onClick={() => setSelectedLine(line)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      selectedLine === line
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {line}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Time Range
              </label>
              <div className="flex flex-wrap gap-2">
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setSelectedTime(range.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      selectedTime === range.value
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
