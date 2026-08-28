'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'QUALITY_ENGINEER' | 'FACTORY_SUPERVISOR' | 'ADMIN'>('QUALITY_ENGINEER');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await authApi.register({
          email,
          password,
          full_name: fullName,
          role,
        });

        const loginData = await authApi.login({ email, password });

        localStorage.setItem('token', loginData.access_token);
        localStorage.setItem('user_email', loginData.email);
        localStorage.setItem('user_name', loginData.full_name);
        localStorage.setItem('user_role', loginData.role);
      } else {
        const loginData = await authApi.login({ email, password });

        localStorage.setItem('token', loginData.access_token);
        localStorage.setItem('user_email', loginData.email);
        localStorage.setItem('user_name', loginData.full_name);
        localStorage.setItem('user_role', loginData.role);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unable to connect to VisionInspectAI backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] p-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A]/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/10 text-blue-400">
            <span className="text-2xl">👁️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">VisionInspect AI</h1>
          <p className="mt-1 text-xs text-slate-400">
            Enterprise Defect Detection & Statistical Process Control
          </p>
        </div>

        {/* Tab Toggle (Sign In / Register) */}
        <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`w-1/2 rounded-lg py-2 text-xs font-semibold transition ${
              !isRegister ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`w-1/2 rounded-lg py-2 text-xs font-semibold transition ${
              isRegister ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Connor"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@factory.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Access Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="FACTORY_SUPERVISOR">Supervisor</option>
                <option value="QUALITY_ENGINEER">Quality Engineer</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create & Sign In' : 'Sign In to Portal'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Protected by Enterprise Role-Based Access Control (RBAC)
        </p>
      </div>
    </div>
  );
}
