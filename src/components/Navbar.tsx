"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

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
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/40 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-[360px] lg:w-[420px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search inspections, defects, reports..."
              className="h-10 rounded-2xl border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-500 shadow-none focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-2xl text-slate-400 hover:bg-white/10 hover:text-slate-100"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
          </Button>

          <div className="h-6 w-px bg-white/10" />

          {/* User Profile & Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 shadow-sm transition hover:border-white/20 hover:shadow-md focus:outline-none">
                <Avatar className="h-8 w-8 border border-white/20">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.full_name} /> : null}
                  <AvatarFallback className="bg-indigo-600 text-xs font-semibold text-white">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-none text-slate-200">{user?.full_name ?? "User"}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
                        user?.role === "product_supervisor" ? "bg-emerald-500 text-emerald-500" : "bg-violet-500 text-violet-500"
                      }`}
                    />
                    <p className="text-[11px] font-medium leading-none text-slate-400">
                      {user?.roleLabel ?? "Operator"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 rounded-2xl border-white/10 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl">
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-white">{user?.full_name}</p>
                  <p className="text-xs leading-none text-slate-400">{user?.email}</p>
                  <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                    <Shield className="h-3 w-3 text-indigo-400" />
                    {user?.roleLabel}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-white/10" />

              <DropdownMenuItem className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white">
                <User className="h-4 w-4 text-slate-400" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white">
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-white/10" />

              <DropdownMenuItem
                onClick={logout}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 focus:bg-rose-500/10 focus:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
