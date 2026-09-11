"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { formatApiError } from '@/services/api';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('session_expired') === 'true') {
        setInfoMessage('Your session has expired. Please sign in to continue.');
      }
    }
  }, []);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setInfoMessage('');
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError('');
      setInfoMessage('');
      
      if (!isLogin) {
        // Register flow
        await authService.register({
          username: data.username,
          email: data.email,
          password: data.password,
          role_name: data.role_name
        });
        
        // Auto-login after register
        const res = await authService.login(data.username, data.password);
        localStorage.setItem('token', res.access_token);
        const user = await authService.getMe();
        login(user, res.access_token);
        router.push('/dashboard');
      } else {
        // Login flow - send credential as username/email
        const credential = (data.email || data.username || '').trim();
        const res = await authService.login(credential, data.password);
        localStorage.setItem('token', res.access_token);
        
        // Get user profile
        const user = await authService.getMe();
        login(user, res.access_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('[LoginPage] Auth error:', err);
      const formatted = formatApiError(err, 'Authentication failed. Please verify credentials.');
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
          <p className="text-slate-500 font-medium text-sm">Industrial Quality Inspection Platform</p>
        </div>

        {infoMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                {...register("email", { required: !isLogin })}
                type="email" 
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
                placeholder="operator@visioninspect.ai"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isLogin ? "Username or Email" : "Username"}
            </label>
            <input 
              {...register(isLogin ? "email" : "username", { required: true })}
              type="text" 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors"
              placeholder={isLogin ? "admin / quality_eng" : "johndoe"}
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

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Platform Role</label>
              <select 
                {...register("role_name", { required: !isLogin })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-colors bg-white"
              >
                <option value="QUALITY_ENGINEER">Quality Engineer</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="OPERATOR">Operator</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-11 text-sm shadow-sm cursor-pointer"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? "Sign In" : "Register Account"
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={toggleMode}
            className="text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? "Need an account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Authorized industrial quality inspection personnel only.</p>
        </div>
      </div>
    </div>
  );
}
