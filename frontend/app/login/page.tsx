"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { register, handleSubmit, reset } = useForm();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError('');
      
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
        // Login flow
        const res = await authService.login(data.email, data.password);
        localStorage.setItem('token', res.access_token);
        
        // Get user profile
        const user = await authService.getMe();
        
        login(user, res.access_token);
        
        router.push('/dashboard');
      }
    } catch (err: any) {
      let errorMsg = 'An error occurred';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail) && err.response.data.detail[0]?.msg) {
          errorMsg = err.response.data.detail[0].msg;
        }
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">VISIONINSPECT AI</h1>
          <p className="text-slate-500 font-medium">Quality Inspection Platform</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <input 
                {...register("email", { required: !isLogin })}
                type="email" 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="operator@visioninspect.ai"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
            <input 
              {...register(isLogin ? "email" : "username", { required: true })} // kept "email" binding for login to avoid changing existing login flow params
              type="text" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder={isLogin ? "admin" : "johndoe"}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input 
              {...register("password", { required: true })}
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select 
                {...register("role_name", { required: !isLogin })}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="OPERATOR">Operator</option>
                <option value="QUALITY_ENGINEER">Quality Engineer</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-12"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? "Sign In" : "Register"
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={toggleMode}
            className="text-sm text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? "Need an account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">Authorized industrial personnel only.</p>
        </div>
      </div>
    </div>
  );
}
