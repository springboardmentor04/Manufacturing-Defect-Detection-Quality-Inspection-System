"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";

const registerSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  employee_id: z.string().min(1, "Employee ID is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(["QUALITY_ENGINEER", "FACTORY_SUPERVISOR", "ADMIN"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "QUALITY_ENGINEER"
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          employee_id: data.employee_id,
          email: data.email,
          phone: data.phone || null,
          department: data.department || null,
          role: data.role,
          password: data.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to register user");
      }

      // Automatically log the user in after registration
      const formData = new URLSearchParams();
      formData.append("username", data.email);
      formData.append("password", data.password);

      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        
        // Fetch user profile
        const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (profileResponse.ok) {
          const userData = await profileResponse.json();
          login(token, userData);
          return; // Early return to avoid setIsLoading(false) if redirecting
        }
      }
      
      // Fallback: If auto-login fails, redirect to login page
      router.push("/login?registered=true");

    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      
      {/* Left side: Premium Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1565439390141-86641fb38053?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/90 to-slate-950"></div>
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

        <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white">
          <div>
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center transform group-hover:-rotate-12 transition-transform shadow-lg shadow-blue-500/30">
                <div className="w-3 h-3 rounded-sm bg-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">VisionInspect AI</span>
            </Link>
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 leading-tight">Join the future of manufacturing.</h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Create an account to gain access to AI-powered insights, real-time tracking, and automated defect detection.
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 h-screen overflow-y-auto">
        <div className="w-full max-w-xl my-auto py-8">
          
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 group transition-colors">
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" /> Back to login
          </Link>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-none dark:border dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create an account</h2>
                <p className="text-slate-500 dark:text-slate-400">Fill in the details below to register.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      {...register("name")}
                      className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.name ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                      placeholder="Jane Doe"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                  </div>

                  {/* Employee ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Employee ID</label>
                    <input 
                      type="text" 
                      {...register("employee_id")}
                      className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.employee_id ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                      placeholder="QE1001"
                    />
                    {errors.employee_id && <p className="mt-1 text-xs text-red-500">{errors.employee_id.message}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    {...register("email")}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                    placeholder="name@visioninspect.ai"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone Number (Optional)</label>
                    <input 
                      type="text" 
                      {...register("phone")}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department (Optional)</label>
                    <input 
                      type="text" 
                      {...register("department")}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Quality Control"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                  <select 
                    {...register("role")}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.role ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                  >
                    <option value="QUALITY_ENGINEER">Quality Engineer</option>
                    <option value="FACTORY_SUPERVISOR">Factory Supervisor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        {...register("password")}
                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        {...register("confirmPassword")}
                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.confirmPassword ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                {/* Submit */}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-600/25 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  {isLoading ? "Creating account..." : "Create Account"}
                </button>

              </form>
            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}

function AlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
