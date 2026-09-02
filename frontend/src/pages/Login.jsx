import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export const Login = ({ onSwitchToRegister }) => {
  const { login, authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await login(email, password);
    if (!res?.success) {
      setErrorMsg('Login failed. Invalid email or password.');
    }
  };

  const demoLoginQE = async () => {
    setEmail('quality.engineer@visioninspect.ai');
    setPassword('password123');
    await login('quality.engineer@visioninspect.ai', 'password123');
  };

  const demoLoginSupervisor = async () => {
    setEmail('supervisor@visioninspect.ai');
    setPassword('password123');
    await login('supervisor@visioninspect.ai', 'password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-dot-pattern flex items-center justify-center p-4 sm:p-6">
      
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-md mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            VisionInspect <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Manufacturing Defect Detection & Quality Inspection System
          </p>
        </div>

        {/* Clean Light Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Sign In to Account</h2>
            <p className="text-xs text-slate-500">Your dashboard opens automatically based on your registered role</p>
          </div>

          {(errorMsg || authError) && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  placeholder="engineer@factory.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In & Access Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Quick Demo Login:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={demoLoginQE}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all"
              >
                <div className="text-xs font-bold text-blue-600">Demo Quality Engineer</div>
                <div className="text-[10px] text-slate-500">Auto-routes to QE Dashboard</div>
              </button>

              <button
                onClick={demoLoginSupervisor}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all"
              >
                <div className="text-xs font-bold text-indigo-600">Demo Supervisor</div>
                <div className="text-[10px] text-slate-500">Auto-routes to Supervisor Dashboard</div>
              </button>
            </div>
          </div>

          {/* Switch to Register */}
          <div className="text-center text-xs text-slate-500 pt-2">
            Need an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 font-semibold hover:underline"
            >
              Register Account & Select Role
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 font-mono">
          Role-Based Access Control • MongoDB Database Authenticated
        </div>

      </div>

    </div>
  );
};
