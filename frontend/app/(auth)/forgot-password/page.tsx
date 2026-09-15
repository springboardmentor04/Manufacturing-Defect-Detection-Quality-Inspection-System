"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async () => {
    setIsLoading(true);
    
    // Mock network request
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md">
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
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Forgot password?</h2>
              <p className="text-slate-500 dark:text-slate-400">
                No worries, we&apos;ll send you reset instructions.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleSubmit(onSubmit)} 
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      {...register("email")}
                      className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-950 outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'}`}
                      placeholder="name@visioninspect.ai"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-600/25 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isLoading ? "Sending..." : "Reset Password"}
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    We&apos;ve sent a password reset link to your email address.
                  </p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Didn&apos;t receive the email? Click to resend
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
