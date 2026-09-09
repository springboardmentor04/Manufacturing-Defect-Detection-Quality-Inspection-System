"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRedirectPath } from "@/lib/auth";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const redirectPath = user ? getRedirectPath(user.role) : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.1),_transparent_35%),linear-gradient(120deg,_#f8fafc_0%,_#fff1f2_100%)] p-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">403 - Access Denied</h1>
        <p className="mt-3 text-sm text-slate-600">
          You don&apos;t have authorization to access this page. This area is restricted to specific role permissions.
        </p>

        {user ? (
          <div className="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-800">{user.full_name}</span> ({user.roleLabel})
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Link
            href={redirectPath}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to your dashboard
          </Link>

          {user ? (
            <button
              onClick={logout}
              className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
            >
              Sign out and change user
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
