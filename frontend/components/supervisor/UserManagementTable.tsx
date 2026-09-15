"use client";

import { useState } from "react";
import { usersList, userStats } from "@/lib/mock-data";
import { Search, Filter, Edit2, ShieldOff, UserCheck, Users, Shield, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserManagementTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* User Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Staff", val: userStats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Engineers", val: userStats.engineers, icon: Cpu, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "Supervisors", val: userStats.supervisors, icon: Shield, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
          { label: "Operators", val: userStats.operators, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Admins", val: userStats.admins, icon: ShieldOff, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stat.val}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500"/> Team Directory
          </h3>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department & Role</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {user.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700 dark:text-slate-300">{user.role}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{user.dept}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{user.line}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold">{user.shift}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", 
                      user.status === 'Active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{user.lastLogin}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
