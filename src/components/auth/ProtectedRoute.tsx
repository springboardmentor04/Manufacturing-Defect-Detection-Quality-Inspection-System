"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRedirectPath, type RoleKey } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: RoleKey[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace("/unauthorized");
    }
  }, [user, isAuthenticated, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_40%),linear-gradient(120deg,_#f8fafc_0%,_#eef2ff_100%)] p-4 text-slate-900">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-white/80 px-8 py-6 shadow-xl backdrop-blur">
          <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">VisionInspect AI</p>
            <p className="text-xs text-slate-500">Verifying session &amp; role permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
