import { BatchInspectionWorkspace } from "@/components/dashboard/BatchInspectionWorkspace";
import { Layers } from "lucide-react";

export const metadata = {
  title: "Batch Inspection | VisionInspect AI",
  description: "Process multiple images in a single batch",
};

export default function BatchInspectionPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Batch Inspection
        </h1>
        <p className="text-slate-500 mt-1">Upload and process multiple images sequentially</p>
      </div>

      <BatchInspectionWorkspace />
    </div>
  );
}
