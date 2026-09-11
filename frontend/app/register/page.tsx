"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { formatApiError } from '@/services/api';
import Link from 'next/link';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Register flow
      await authService.register({
        username: data.username.trim(),
        email: data.email.trim(),
        password: data.password,
        role_name: data.role_name || 'QUALITY_ENGINEER'
      });
      
      // Auto-login after register
      const res = await authService.login(data.username.trim(), data.password);
      localStorage.setItem('token', res.access_token);
      const user = await authService.getMe();
      login(user, res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[RegisterPage] Registration error:', err);
      const formatted = formatApiError(err, 'Registration failed. Please check your details.');
      setError(formatted);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <ShieldCheck size={28} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-blue-600 mb-1">VISIONINSPECT AI</h1>
          <p className="text-slate-500 font-medium text-sm">Create Quality Inspection Account</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username</label>
            <input 
              {...register("username", { required: true })}
              type="text" 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
              placeholder="quality_engineer_1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
            <input 
              {...register("email", { required: true })}
              type="email" 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
              placeholder="engineer@visioninspect.ai"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              {...register("password", { required: true })}
              type="password" 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Platform Role</label>
            <select 
              {...register("role_name", { required: true })}
              defaultValue="QUALITY_ENGINEER"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors bg-white"
            >
              <option value="QUALITY_ENGINEER">Quality Engineer</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="OPERATOR">Operator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-11 text-sm shadow-sm cursor-pointer mt-2"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Register Account"
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="text-sm text-blue-600 font-semibold hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Authorized industrial quality inspection personnel only.</p>
        </div>
      </div>
    </div>
  );
}
