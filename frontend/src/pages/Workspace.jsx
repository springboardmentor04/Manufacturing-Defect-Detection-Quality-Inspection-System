import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import BrandMark from "@/components/BrandMark";
import QualityEngineerDashboard from "@/components/QualityEngineerDashboard";
import FactorySupervisorDashboard from "@/components/FactorySupervisorDashboard";
import { canAccessQualityDashboard } from "@/lib/qualityDashboard";
import { canAccessFactorySupervisorDashboard } from "@/lib/factorySupervisorDashboard";
import { trpc } from "@/lib/trpc";

const roleNames = {
  quality_engineer: "Quality Engineer",
  factory_supervisor: "Factory Supervisor",
  production_manager: "Production Manager",
  admin: "Platform Admin",
  user: "User",
};

export default function Workspace() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: user, isFetching, isPending } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate().catch(() => {});
      try {
        sessionStorage.removeItem("vi_active_tab");
        sessionStorage.removeItem("fs_active_tab");
      } catch {}
      setLocation("/login");
    },
    onError: () => {
      utils.auth.me.setData(undefined, null);
      setLocation("/login");
    },
  });

  useEffect(() => {
    if (!isPending && !isFetching && user === null) setLocation("/login");
  }, [isFetching, isPending, setLocation, user]);

  if ((isPending || isFetching) && user === undefined) return <main className="vi-workspace-loading"><LoaderCircle className="animate-spin" size={25} /> Verifying your secure session…</main>;
  if (!user) return null;

  // Factory Supervisor dashboard — role-specific view
  if (user.role === "factory_supervisor") return <FactorySupervisorDashboard user={user} onSignOut={() => logoutMutation.mutate()} isSigningOut={logoutMutation.isPending} />;

  const dashboardEligible = canAccessQualityDashboard(user.role);
  if (dashboardEligible) return <QualityEngineerDashboard user={user} onSignOut={() => logoutMutation.mutate()} isSigningOut={logoutMutation.isPending} />;


  return (
    <main className="vi-workspace">
      <header><BrandMark /><button type="button" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>Sign out <LogOut size={16} /></button></header>
      <section className="vi-workspace-card">
        <span><ShieldCheck size={19} /> Secure credential session</span>
        <h1>Welcome, {user.name || "inspection teammate"}.</h1>
        <p>Your database-backed JWT session is active. This protected workspace is ready for the image inspection dashboard next.</p>
        <dl><div><dt>Role</dt><dd>{roleNames[user.role] || user.role}</dd></div><div><dt>Account</dt><dd>{user.accountStatus}</dd></div><div><dt>Work email</dt><dd>{user.email || "Not available"}</dd></div></dl>
      </section>
    </main>
  );
}
