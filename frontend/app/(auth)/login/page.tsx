"use client";

import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", data.email);
      formData.append("password", data.password);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to log in");
      }

      const responseData = await response.json();
      const token = responseData.access_token;
      
      // Fetch user profile immediately
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!profileResponse.ok) {
        throw new Error("Failed to fetch user profile");
      }
      
      const userData = await profileResponse.json();
      
      login(token, {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        employee_id: userData.employee_id,
        department: userData.department,
        phone: userData.phone,
      });

      // Give router time to navigate before resetting (or don't reset to avoid flash)
      // but we will reset it just in case navigation fails
      setTimeout(() => setIsLoading(false), 2000);

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
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/90 to-slate-950"></div>
        
        {/* Animated grid overlay */}
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
            <h1 className="text-4xl font-bold mb-4 leading-tight">Modernize your manufacturing quality.</h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Join thousands of engineers and supervisors using AI to detect defects, optimize production, and reduce waste in real-time.
            </p>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800">
                  <Image src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" width={40} height={40} unoptimized />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-xs font-bold">
                500+
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 group transition-colors">
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" /> Back to website
          </Link>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-none dark:border dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
                <p className="text-slate-500 dark:text-slate-400">Sign in to access your dashboard.</p>
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

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    suppressHydrationWarning
                    {...register("email")}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                    placeholder="name@visioninspect.ai"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <Link href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      suppressHydrationWarning
                      {...register("password")}
                      className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      suppressHydrationWarning
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                  <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">Remember me for 30 days</label>
                </div>

                {/* Submit */}
                <button 
                  type="submit"
                  disabled={isLoading}
                  suppressHydrationWarning
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-600/25 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

              </form>
              
              <div className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account? <Link href="/register" className="text-blue-600 hover:underline font-medium">Register here</Link>
              </div>
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
