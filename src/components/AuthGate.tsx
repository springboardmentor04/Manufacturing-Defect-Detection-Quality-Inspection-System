"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthUser = {
  email: string;
  full_name: string;
  role: string;
  token: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DEMO_CREDENTIALS = {
  email: "engineer@visioninspect.local",
  password: "ChangeMe123!",
};

function readStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem("visioninspect-auth");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistAuth(user: AuthUser) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("visioninspect-auth", JSON.stringify(user));
  }
}

function clearStoredAuth() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("visioninspect-auth");
  }
}

function getDisplayName(email: string) {
  const simple = email.split("@")[0] ?? "Operator";
  return simple.replace(/\./g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("engineer@visioninspect.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("quality_engineer");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = readStoredAuth();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            full_name: getDisplayName(email),
            role,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.detail ?? "Signup failed");
        }

        const nextUser: AuthUser = {
          email,
          full_name: getDisplayName(email),
          role: role === "product_supervisor" ? "Product Supervisor" : "Quality Engineer",
          token: "demo-token",
        };
        persistAuth(nextUser);
        setUser(nextUser);
        router.push(role === "product_supervisor" ? "/dashboard/supervisor" : "/dashboard/quality-engineer");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.detail ?? "Authentication failed");
      }

      const nextUser: AuthUser = {
        email,
        full_name: getDisplayName(email),
        role: "Quality Engineer",
        token: payload.access_token,
      };

      persistAuth(nextUser);
      setUser(nextUser);
      router.push("/dashboard/quality-engineer");
      return;
    } catch (loginError) {
      const isDemoLogin =
        email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;

      if (isDemoLogin) {
        const nextUser: AuthUser = {
          email,
          full_name: getDisplayName(email),
          role: "Quality Engineer",
          token: "demo-token",
        };

        persistAuth(nextUser);
        setUser(nextUser);
        router.push("/dashboard/quality-engineer");
        return;
      }

      setError(loginError instanceof Error ? loginError.message : "Unable to sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    clearStoredAuth();
    setUser(null);
  }

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      if (user.role === "Product Supervisor") {
        router.push("/dashboard/supervisor");
      } else {
        router.push("/dashboard/quality-engineer");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_35%),linear-gradient(120deg,_#f8fafc_0%,_#eef2ff_100%)] px-4">
        <div className="rounded-3xl border border-slate-200 bg-white/80 px-8 py-6 text-sm text-slate-600 shadow-sm">
          Loading your workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_35%),linear-gradient(120deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">VisionInspect AI</p>
            <p className="text-sm text-slate-500">Secure inspection workspace</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-slate-700" />
            {isSignup ? "Create your account" : "Sign in to continue"}
          </div>
          <p>
            Choose your role at signup. Demo access is also available with
            <span className="ml-1 font-semibold text-slate-900">engineer@visioninspect.local</span>.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>

          {isSignup ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="quality_engineer">Quality Engineer</option>
                <option value="product_supervisor">Product Supervisor</option>
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Create account" : "Sign in"}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-slate-600"
            onClick={() => setIsSignup((value) => !value)}
          >
            {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
