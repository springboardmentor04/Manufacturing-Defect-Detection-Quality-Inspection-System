import axios from "axios";
import { z } from "zod";

export type RoleKey = "quality_engineer" | "product_supervisor";

export type AuthUser = {
  id?: string;
  email: string;
  full_name: string;
  role: RoleKey;
  roleLabel: string;
  token: string;
  employeeId?: string;
  companyName?: string;
  avatarUrl?: string;
};

export type SignInValues = {
  email: string;
  password: string;
};

export type SignUpValues = {
  fullName: string;
  email: string;
  employeeId: string;
  companyName: string;
  password: string;
  confirmPassword: string;
  role: RoleKey;
};

export const roleOptions = [
  {
    id: "quality_engineer" as const,
    title: "Quality Engineer",
    description:
      "Inspect products, review AI predictions, manage inspection history, and generate reports.",
    accent: "from-violet-500 to-indigo-600",
  },
  {
    id: "product_supervisor" as const,
    title: "Factory Supervisor",
    description:
      "Monitor production performance, track defect trends, and oversee quality analytics.",
    accent: "from-emerald-500 to-teal-600",
  },
];

const STORAGE_KEY = "visioninspect-auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 7000,
});

export const mockUsers: AuthUser[] = [
  {
    id: "qe-001",
    email: "qe@example.com",
    full_name: "Ava Moreno",
    role: "quality_engineer",
    roleLabel: "Quality Engineer",
    token: "jwt-token-quality-engineer-qe",
    employeeId: "QE-1042",
    companyName: "Northstar Manufacturing",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "mock-eng-001",
    email: "engineer@visioninspect.local",
    full_name: "Ava Moreno",
    role: "quality_engineer",
    roleLabel: "Quality Engineer",
    token: "mock-jwt-quality-engineer",
    employeeId: "QE-1042",
    companyName: "Northstar Manufacturing",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "sup-001",
    email: "supervisor@example.com",
    full_name: "Marcus Lee",
    role: "product_supervisor",
    roleLabel: "Factory Supervisor",
    token: "jwt-token-factory-supervisor-sup",
    employeeId: "FS-2089",
    companyName: "Harbor Precision",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "mock-sup-001",
    email: "supervisor@visioninspect.local",
    full_name: "Marcus Lee",
    role: "product_supervisor",
    roleLabel: "Factory Supervisor",
    token: "mock-jwt-factory-supervisor",
    employeeId: "FS-2089",
    companyName: "Harbor Precision",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
  },
];

export function getRoleLabel(role: RoleKey): string {
  return role === "product_supervisor" ? "Factory Supervisor" : "Quality Engineer";
}

export function getRedirectPath(role: RoleKey): string {
  return role === "product_supervisor" ? "/dashboard/supervisor" : "/dashboard/quality-engineer";
}

export function readStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function persistAuth(user: AuthUser): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to persist auth", e);
    }
  }
}

export function clearStoredAuth(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear auth", e);
    }
  }
}

export function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const levels = [
    { label: "Too weak", color: "bg-rose-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-sky-500" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Excellent", color: "bg-emerald-600" },
  ];

  const strength = levels[Math.min(score, levels.length - 1)];
  return { score, label: strength.label, color: strength.color };
}

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid work email"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid work email"),
    employeeId: z.string().trim().min(2, "Employee ID is required"),
    companyName: z.string().trim().min(2, "Company or factory name is required"),
    password: z
      .string()
      .min(8, "Password should be at least 8 characters")
      .regex(/[A-Z]/, "Add at least one uppercase letter")
      .regex(/[a-z]/, "Add at least one lowercase letter")
      .regex(/\d/, "Add at least one number")
      .regex(/[^A-Za-z0-9]/, "Add at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["quality_engineer", "product_supervisor"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function signInWithEmail(values: SignInValues): Promise<AuthUser> {
  const normalizedEmail = values.email.trim().toLowerCase();

  try {
    const response = await api.post("/auth/login", {
      username: normalizedEmail,
      password: values.password,
    });

    const token = response.data?.access_token ?? response.data?.token;

    if (token) {
      const match = mockUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
      const user: AuthUser = {
        id: response.data?.user?.id ?? match?.id ?? `user-${Date.now()}`,
        email: normalizedEmail,
        full_name: response.data?.user?.full_name ?? match?.full_name ?? "VisionInspect Operator",
        role: (response.data?.user?.role === "product_supervisor" ? "product_supervisor" : "quality_engineer") as RoleKey,
        roleLabel: getRoleLabel((response.data?.user?.role === "product_supervisor" ? "product_supervisor" : "quality_engineer") as RoleKey),
        token,
        avatarUrl: match?.avatarUrl,
      };

      persistAuth(user);
      return user;
    }
  } catch {
    // Fall back to local mock credential flow when backend API is offline or returns error
  }

  const fallback = mockUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (!fallback) {
    throw new Error("Invalid email or password. Use qe@example.com or supervisor@example.com");
  }

  const user: AuthUser = {
    ...fallback,
    token: `mock-jwt-token-${fallback.role}`,
  };

  persistAuth(user);
  return user;
}

export async function signUpWithEmail(values: SignUpValues): Promise<AuthUser> {
  const normalizedEmail = values.email.trim().toLowerCase();

  try {
    const response = await api.post("/auth/register", {
      email: normalizedEmail,
      password: values.password,
      full_name: values.fullName.trim(),
      role: values.role,
      employee_id: values.employeeId.trim(),
      company_name: values.companyName.trim(),
    });

    const token = response.data?.access_token ?? response.data?.token;
    const user: AuthUser = {
      id: response.data?.id ?? `user-${Date.now()}`,
      email: normalizedEmail,
      full_name: values.fullName.trim(),
      role: values.role,
      roleLabel: getRoleLabel(values.role),
      token: token ?? "mock-jwt-token",
      employeeId: values.employeeId.trim(),
      companyName: values.companyName.trim(),
    };

    persistAuth(user);
    return user;
  } catch {
    const user: AuthUser = {
      id: `user-${Date.now()}`,
      email: normalizedEmail,
      full_name: values.fullName.trim(),
      role: values.role,
      roleLabel: getRoleLabel(values.role),
      token: `mock-jwt-${values.role}-${Date.now()}`,
      employeeId: values.employeeId.trim(),
      companyName: values.companyName.trim(),
    };

    persistAuth(user);
    return user;
  }
}
