"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Box,
  Camera,
  ChevronRight,
  LayoutGrid,
  LogOut,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const qeNavItems = [
  { label: "Engineer Workspace", href: "/dashboard/quality-engineer", icon: LayoutGrid },
  { label: "Upload Image", href: "/dashboard/quality-engineer#upload", icon: Camera },
  { label: "AI Results", href: "/dashboard/quality-engineer#ai-results", icon: Sparkles },
  { label: "Defect Details", href: "/dashboard/quality-engineer#defects", icon: AlertTriangle },
  { label: "Inspection History", href: "/dashboard/quality-engineer#history", icon: Box },
  { label: "Quality Reports", href: "/dashboard/quality-engineer#reports", icon: ScanLine },
];

const supervisorNavItems = [
  { label: "Supervisor Console", href: "/dashboard/supervisor", icon: LayoutGrid },
  { label: "Production Overview", href: "/dashboard/supervisor#overview", icon: Activity },
  { label: "Production Monitoring", href: "/dashboard/supervisor#monitoring", icon: Zap },
  { label: "Defect Trend Analysis", href: "/dashboard/supervisor#trends", icon: BarChart3 },
  { label: "Quality Analytics", href: "/dashboard/supervisor#analytics", icon: TrendingUp },
  { label: "KPI Dashboard", href: "/dashboard/supervisor#kpi", icon: ShieldCheck },
  { label: "Inspection Reports", href: "/dashboard/supervisor#reports", icon: ScanLine },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  const navItems = role === "product_supervisor" ? supervisorNavItems : qeNavItems;

  const getInitials = (name?: string) => {
    if (!name) return "VI";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="hidden w-72 flex-col justify-between border-r border-white/5 bg-slate-950/40 px-5 py-6 backdrop-blur-xl xl:flex">
      <div>
        {/* Brand Header */}
        <div className="mb-8 flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white shadow-sm">VisionInspect AI</p>
            <p className="text-xs font-medium text-slate-400">Industrial QA Platform</p>
          </div>
        </div>

        {/* Role Badge Banner */}
        <div
          className={`mb-6 rounded-2xl border p-3.5 backdrop-blur-md ${
            role === "product_supervisor"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-violet-500/20 bg-violet-500/10 text-violet-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Role</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
                role === "product_supervisor"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
              }`}
            >
              {role === "product_supervisor" ? "Supervisor" : "Engineer"}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-white">{user?.roleLabel ?? "Operator"}</p>
        </div>

        {/* Dynamic Nav Menu */}
        <nav className="space-y-1.5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Navigation Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname + "#" === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-slate-400 border border-transparent hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
                      active ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {item.label}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5",
                    active ? "text-indigo-400/70" : "text-slate-600 opacity-0 group-hover:opacity-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Button */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-white/20 shadow-md">
            {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.full_name} /> : null}
            <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
              {getInitials(user?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-200">{user?.full_name}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
          Logout ({user?.roleLabel?.split(" ")[0] ?? "User"})
        </button>
      </div>
    </aside>
  );
}
