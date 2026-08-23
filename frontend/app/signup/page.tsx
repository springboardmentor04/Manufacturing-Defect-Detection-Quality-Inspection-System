'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setAuthData, getErrorMessage } from '@/lib/api';
import { Eye, Lock, User, Mail, Shield, ArrowRight, AlertCircle, CheckCircle2, Loader2, UserCheck, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState<'quality_engineer' | 'factory_supervisor'>('quality_engineer');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // Register user in backend
      await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
        role_name: roleName,
      });

      // Auto-login to obtain JWT token
      const loginRes = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });

      const { access_token, user } = loginRes.data;
      setAuthData(access_token, user);

      setSuccessMessage('Account registered and authenticated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      const message = getErrorMessage(err, 'Registration failed. Username or email may already be taken.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 right-1/2 translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[26rem] h-[26rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-sky-500/25 mb-1">
            <Eye className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Create Inspector Profile
          </h1>
          <p className="text-xs text-slate-400">
            Join VisionInspect AI quality inspection & defect detection workspace
          </p>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_inspector"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@manufacturing.com"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Role Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Workplace Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Quality Engineer */}
              <div
                onClick={() => setRoleName('quality_engineer')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  roleName === 'quality_engineer'
                    ? 'bg-sky-500/10 border-sky-500 text-slate-100 shadow-md shadow-sky-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className={`w-4 h-4 ${roleName === 'quality_engineer' ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-200">Quality Engineer</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Upload inspection images, run defect models, and manage personal inspection passes.
                </p>
              </div>

              {/* Option 2: Factory Supervisor */}
              <div
                onClick={() => setRoleName('factory_supervisor')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  roleName === 'factory_supervisor'
                    ? 'bg-purple-500/10 border-purple-500 text-slate-100 shadow-md shadow-purple-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`w-4 h-4 ${roleName === 'factory_supervisor' ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-200">Factory Supervisor</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Monitor plant-wide inspections, track team pass rates, and review all uploaded payloads.
                </p>
              </div>
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
                <span>Creating Account & Authenticating...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-800 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline">
              Sign in to platform
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
