import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, 
  ShieldCheck, 
  ArrowRight, 
  ChevronDown, 
  Lock, 
  Mail, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Sliders,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Invalid email or password credentials.');
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        const roleName = data.user?.role_name?.toUpperCase() || '';
        if (roleName === 'ADMIN' || selectedRole === 'Admin') {
          navigate('/admin/dashboard');
        } else if (roleName === 'FACTORY_SUPERVISOR' || selectedRole === 'Factory Supervisor') {
          navigate('/supervisor/production-overview');
        } else {
          navigate('/quality/upload-image');
        }
      } else {
        setError('Authentication failed. No access token returned.');
      }
    } catch (err) {
      console.error("Login network error:", err);
      setError('Unable to connect to authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featureCards = [
    {
      title: 'Real-Time Detection',
      description: 'Sub-15ms optical defect classification',
      icon: Zap,
      color: '#2563EB'
    },
    {
      title: 'Quality Analytics',
      description: 'Production yield & SPC telemetry',
      icon: Activity,
      color: '#22C55E'
    },
    {
      title: 'Severity Scoring',
      description: 'AI-driven anomaly impact grading',
      icon: Sliders,
      color: '#FACC15'
    },
    {
      title: 'Production Monitoring',
      description: 'Multi-line live camera feed tracking',
      icon: CheckCircle2,
      color: '#EF4444'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-gray-100 flex items-center justify-center p-0 overflow-hidden">
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Factory Background & Feature Cards */}
        <div className="lg:col-span-7 relative flex flex-col justify-between p-8 lg:p-14 overflow-hidden border-r border-[#1F2937]/50">
          
          {/* Factory Background Image with Dark Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 scale-105 filter brightness-75 contrast-110"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80')` 
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19]/95 via-[#0B0F19]/85 to-[#0B0F19]/90 z-0"></div>

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/20 border border-[#2563EB]/40 backdrop-blur-md flex items-center justify-center text-[#2563EB] shadow-lg shadow-blue-600/20">
              <Eye className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-wider">VisionInspect AI</span>
              <span className="block text-xs font-semibold text-blue-400 uppercase tracking-widest">Enterprise Inspection</span>
            </div>
          </div>

          {/* Center Banner Content */}
          <div className="relative z-10 my-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 text-blue-300 text-xs font-medium backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>Next-Gen Computer Vision Platform</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              AI-Powered Manufacturing Quality Inspection
            </h1>

            <p className="text-sm lg:text-base text-gray-300 leading-relaxed">
              Automate optical surface defect recognition, reduce line downtime, and maintain enterprise quality standards with real-time neural network telemetry.
            </p>

            {/* 4 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              {featureCards.map((feat) => {
                const IconComp = feat.icon;
                return (
                  <div 
                    key={feat.title}
                    className="bg-[#111827]/70 border border-white/10 backdrop-blur-md rounded-2xl p-4 transition-all hover:border-[#2563EB]/50 hover:bg-[#111827]/90 space-y-2 group shadow-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-2 rounded-xl border border-white/10 flex items-center justify-center"
                        style={{ backgroundColor: `${feat.color}20`, color: feat.color }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal pl-0.5">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 text-xs text-gray-500 flex items-center space-x-4 border-t border-white/10 pt-4">
            <span>© 2026 VisionInspect AI</span>
            <span>•</span>
            <span>ISO 9001 Compliant Vision Engine</span>
          </div>

        </div>

        {/* Right Side: Glassmorphism Login Card */}
        <div className="lg:col-span-5 flex items-center justify-center p-8 bg-[#0B0F19] relative">
          <div className="w-full max-w-md bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
              <p className="text-xs text-gray-400">Sign in to continue to your operational portal</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-xl p-3 text-xs text-[#EF4444] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="operator@visioninspect.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Select Role Portal
                </label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] cursor-pointer transition-colors"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Factory Supervisor">Factory Supervisor</option>
                    <option value="Quality Engineer">Quality Engineer</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1F2937] border-gray-700 text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs text-[#2563EB] hover:underline font-medium">
                  Forgot Password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Link to Register */}
            <div className="pt-2 border-t border-[#1F2937] text-center text-xs text-gray-400">
              Need a new account?{' '}
              <Link to="/register" className="text-[#2563EB] hover:underline font-semibold">
                Register New User
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
