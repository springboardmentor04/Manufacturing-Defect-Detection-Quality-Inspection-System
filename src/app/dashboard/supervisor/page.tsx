import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SupervisorDashboard } from "@/components/dashboards/SupervisorDashboard";

export default function SupervisorPage() {
  return (
    <ProtectedRoute allowedRoles={["product_supervisor"]}>
      <SupervisorDashboard />
    </ProtectedRoute>
  );
}
