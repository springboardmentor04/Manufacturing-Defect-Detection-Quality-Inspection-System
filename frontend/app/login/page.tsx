'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setAuthData, getErrorMessage } from '@/lib/api';
import { Eye, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // can be username or email
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Backend expects username & password
      const response = await api.post('/auth/login', {
        username: identifier.trim(),
        password,
      });

      const { access_token, user } = response.data;
      setAuthData(access_token, user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      const message = getErrorMessage(err, 'Invalid credentials. Please check your username and password.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[26rem] h-[26rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-sky-500/25 mb-1">
            <Eye className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            VisionInspect <span className="text-sky-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Manufacturing Defect Detection & Quality Inspection Platform
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer & Demo Credentials Helper */}
        <div className="border-t border-slate-800 pt-4 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline">
              Create an account
            </Link>
          </p>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
            <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3 text-sky-400" /> Demo Roles Available:
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Register as either <span className="text-slate-300 font-medium">Quality Engineer</span> (upload & personal inspections) or <span className="text-slate-300 font-medium">Factory Supervisor</span> (all-team inspection monitoring).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
