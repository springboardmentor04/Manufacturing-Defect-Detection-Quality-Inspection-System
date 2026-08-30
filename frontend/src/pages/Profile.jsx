import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold text-slate-800 mb-6">My Profile</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center text-2xl font-bold">
            {user?.full_name?.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-800 capitalize">
              {user?.role?.replaceAll("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Department</dt>
            <dd className="font-medium text-slate-800">{user?.department || "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Account Status</dt>
            <dd className="font-medium text-emerald-600">
              {user?.is_active ? "Active" : "Inactive"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Member Since</dt>
            <dd className="font-medium text-slate-800">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </DashboardLayout>
  );
}
