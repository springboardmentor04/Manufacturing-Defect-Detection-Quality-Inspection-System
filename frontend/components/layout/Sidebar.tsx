"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  LayoutDashboard, 
  Search, 
  CheckCircle, 
  Activity, 
  Settings,
  Eye,
  Camera,
  LogOut,
  Image as ImageIcon,
  Layers,
  FileText,
  Factory,
  BarChart4,
  Users,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'Overview';
  const { role, user, logout, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define links based on role
  const engineerLinks = [
    { name: "Dashboard", href: "/dashboard/engineer", icon: LayoutDashboard },
    { name: "New Inspection", href: "/dashboard/engineer/new-inspection", icon: Camera },
    { name: "Inspection History", href: "/dashboard/engineer/history", icon: FileText },
    { name: "Batch Inspection", href: "/dashboard/engineer/batch", icon: Layers },

    { name: "Detection Results", href: "/results", icon: Search },
    { name: "Dataset Management", href: "/dashboard/engineer/dataset", icon: Database },
    { name: "Reports", href: "/dashboard/engineer/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Help", href: "#", icon: HelpCircle },
  ];

  const supervisorLinks = [
    { name: "Production Overview", href: "/dashboard/supervisor?tab=Overview", icon: LayoutDashboard, tabMatch: "Overview" },
    { name: "Inspection Reports", href: "/dashboard/supervisor?tab=Reports", icon: FileText, tabMatch: "Reports" },
    { name: "Defect Trends", href: "/dashboard/supervisor?tab=Defect Trends", icon: BarChart4, tabMatch: "Defect Trends" },
    { name: "Quality Analytics", href: "/dashboard/supervisor?tab=Quality", icon: CheckCircle, tabMatch: "Quality" },
    { name: "Production Monitoring", href: "/dashboard/supervisor?tab=Monitoring", icon: Factory, tabMatch: "Monitoring" },
    { name: "User Management", href: "/dashboard/supervisor?tab=Users", icon: Users, tabMatch: "Users" },
    { name: "Settings", href: "/settings", icon: Settings, tabMatch: "Settings" },
  ];

  const adminLinks = [
    { name: "Admin Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "System Settings", href: "/settings", icon: Settings },
  ];

  if (isLoading) return <div className={cn("border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 hidden md:flex h-screen transition-all duration-300", isCollapsed ? "w-20" : "w-64")} />;
  
  const currentLinks = role === "FACTORY_SUPERVISOR" ? supervisorLinks : (role === "ADMIN" ? adminLinks : engineerLinks);
  const displayRole = role ? role.replace("_", " ") : "USER";

  return (
    <motion.div 
      suppressHydrationWarning
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 hidden md:flex flex-col h-full h-screen sticky top-0 z-30"
    >
      <div className={cn("p-6 flex items-center justify-between", isCollapsed && "justify-center px-0")}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              VisionInspect AI
            </span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="bg-blue-600 p-2 rounded-lg shrink-0">
            <Eye className="w-6 h-6 text-white" />
          </Link>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0", isCollapsed && "absolute -right-3 top-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900")}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="px-6 mb-4">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Current Role</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate capitalize">
              {displayRole.toLowerCase()}
            </p>
          </div>
        </div>
      )}
      
      <nav className={cn("flex-1 space-y-1.5 overflow-y-auto pb-4", isCollapsed ? "px-3" : "px-4")}>
        {currentLinks.map((item) => {
          const isActive = role === "FACTORY_SUPERVISOR" && "tabMatch" in item
            ? (item as { tabMatch?: string }).tabMatch === currentTab
            : pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href} className="relative block group">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center transition-colors z-10 text-sm",
                isCollapsed ? "justify-center p-3 rounded-xl" : "gap-3 px-4 py-2.5 rounded-xl",
                isActive 
                  ? "text-blue-700 dark:text-blue-400 font-bold" 
                  : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}>
                <item.icon className={cn("w-5 h-5 shrink-0")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
              </div>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile Footer */}
      <div className={cn("p-4 mt-auto border-t border-slate-200 dark:border-slate-800 transition-all", isCollapsed ? "flex flex-col items-center gap-2" : "")}>
        {user && (
          <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "px-2 py-2")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex flex-shrink-0 items-center justify-center text-white font-bold text-sm shadow-sm">
              {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> Logged In
                </p>
              </div>
            )}
          </div>
        )}
        
        <div 
          onClick={logout}
          className={cn(
            "flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors cursor-pointer text-sm font-medium mt-2",
            isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </div>
      </div>
    </motion.div>
  );
}
