import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QualityEngineerDashboard } from "@/components/dashboards/QualityEngineerDashboard";

export default function QualityEngineerPage() {
  return (
    <ProtectedRoute allowedRoles={["quality_engineer"]}>
      <QualityEngineerDashboard />
    </ProtectedRoute>
  );
}
