"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lock, MoonStar, ShieldCheck, Sparkles, SunMedium, UserCheck, Factory } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  getPasswordStrength,
  getRedirectPath,
  roleOptions,
  signInSchema,
  signUpSchema,
  type RoleKey,
  type SignInValues,
  type SignUpValues,
} from "@/lib/auth";

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Password strength</span>
        <span className="font-medium text-slate-700">{strength.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${strength.color}`}
          style={{ width: `${Math.min(100, (strength.score / 5) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AuthShell() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();

  const { user, login, signUp, isLoading: authLoading } = useAuth();

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "qe@example.com", password: "password123" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      employeeId: "",
      companyName: "",
      password: "",
      confirmPassword: "",
      role: "quality_engineer",
    },
  });

  useEffect(() => {
    if (user && !authLoading) {
      router.replace(getRedirectPath(user.role));
    }
  }, [user, authLoading, router]);

  async function handleSignIn(values: SignInValues) {
    setServerMessage(null);
    try {
      const loggedUser = await login(values);
      router.replace(getRedirectPath(loggedUser.role));
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Unable to sign in right now.");
    }
  }

  async function handleSignUp(values: SignUpValues) {
    setServerMessage(null);
    try {
      const registeredUser = await signUp(values);
      router.replace(getRedirectPath(registeredUser.role));
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Unable to create account right now.");
    }
  }

  const quickDemoLogin = (email: string, pass: string) => {
    signInForm.setValue("email", email);
    signInForm.setValue("password", pass);
    handleSignIn({ email, password: pass });
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_40%),linear-gradient(120deg,_#f8fafc_0%,_#eef2ff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/90 px-8 py-6 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
          <ShieldCheck className="h-5 w-5 text-indigo-600 animate-pulse" />
          Accessing workspace...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.2),_transparent_38%),linear-gradient(120deg,_#f8fafc_0%,_#eef2ff_100%)] p-4 text-slate-900 sm:p-6 lg:p-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Hero Brand Panel */}
        <div className="flex flex-col space-y-6 lg:max-w-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-950">VisionInspect AI</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Industrial Computer Vision Platform
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Next-generation quality inspection &amp; plant analytics
            </h1>
            <p className="text-base text-slate-600">
              Role-based command center for Quality Engineers and Factory Supervisors with AI defect detection.
            </p>
          </div>

          {/* Quick Demo Role Cards */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Test Role Logins
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => quickDemoLogin("qe@example.com", "password123")}
                className="group flex flex-col rounded-2xl border border-violet-200 bg-white/90 p-4 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-violet-700">
                    <UserCheck className="h-4 w-4" />
                    Quality Engineer
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-violet-400 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-2 text-xs text-slate-600">Scan products, inspect AI defects &amp; export reports</p>
                <p className="mt-2 text-[10px] font-mono text-slate-400">qe@example.com</p>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin("supervisor@example.com", "password123")}
                className="group flex flex-col rounded-2xl border border-emerald-200 bg-white/90 p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <Factory className="h-4 w-4" />
                    Factory Supervisor
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-400 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-2 text-xs text-slate-600">Monitor plant lines, defect trends &amp; KPI analytics</p>
                <p className="mt-2 text-[10px] font-mono text-slate-400">supervisor@example.com</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="w-full lg:max-w-md">
          <div className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setServerMessage(null);
                }}
                className={`flex-1 rounded-xl py-2.5 transition-all ${
                  mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setServerMessage(null);
                }}
                className={`flex-1 rounded-xl py-2.5 transition-all ${
                  mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Register
              </button>
            </div>

            {serverMessage ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {serverMessage}
              </div>
            ) : null}

            {mode === "signin" ? (
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Work Email</label>
                  <Input
                    {...signInForm.register("email")}
                    placeholder="qe@example.com"
                    type="email"
                    className="h-10 rounded-xl"
                  />
                  {signInForm.formState.errors.email ? (
                    <p className="mt-1 text-xs text-rose-500">{signInForm.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
                  <Input
                    {...signInForm.register("password")}
                    placeholder="••••••••"
                    type="password"
                    className="h-10 rounded-xl"
                  />
                  {signInForm.formState.errors.password ? (
                    <p className="mt-1 text-xs text-rose-500">{signInForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={signInForm.formState.isSubmitting}
                  className="w-full h-11 rounded-xl bg-slate-900 font-semibold text-white transition hover:bg-slate-800"
                >
                  {signInForm.formState.isSubmitting ? "Authenticating..." : "Sign In to Workspace"}
                </Button>
              </form>
            ) : (
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
                  <Input {...signUpForm.register("fullName")} placeholder="Jane Doe" className="h-9 rounded-xl text-xs" />
                  {signUpForm.formState.errors.fullName ? (
                    <p className="mt-0.5 text-xs text-rose-500">{signUpForm.formState.errors.fullName.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Work Email</label>
                  <Input {...signUpForm.register("email")} placeholder="name@company.com" type="email" className="h-9 rounded-xl text-xs" />
                  {signUpForm.formState.errors.email ? (
                    <p className="mt-0.5 text-xs text-rose-500">{signUpForm.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Employee ID</label>
                    <Input {...signUpForm.register("employeeId")} placeholder="EMP-102" className="h-9 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Company</label>
                    <Input {...signUpForm.register("companyName")} placeholder="Northstar QA" className="h-9 rounded-xl text-xs" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Select Assign Role</label>
                  <select
                    {...signUpForm.register("role")}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="quality_engineer">Quality Engineer</option>
                    <option value="product_supervisor">Factory Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
                  <Input {...signUpForm.register("password")} type="password" placeholder="••••••••" className="h-9 rounded-xl text-xs" />
                  <PasswordStrength password={signUpForm.watch("password")} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Confirm Password</label>
                  <Input {...signUpForm.register("confirmPassword")} type="password" placeholder="••••••••" className="h-9 rounded-xl text-xs" />
                  {signUpForm.formState.errors.confirmPassword ? (
                    <p className="mt-0.5 text-xs text-rose-500">{signUpForm.formState.errors.confirmPassword.message}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={signUpForm.formState.isSubmitting}
                  className="w-full h-10 rounded-xl bg-slate-900 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  {signUpForm.formState.isSubmitting ? "Creating Account..." : "Create Role Account"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
