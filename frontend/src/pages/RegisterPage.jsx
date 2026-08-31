import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, 
  ShieldCheck, 
  ArrowRight, 
  ChevronDown, 
  Lock, 
  Mail, 
  User, 
  UserPlus, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Sliders 
} from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Admin');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (selectedRole === 'Admin') {
      navigate('/admin/dashboard');
    } else if (selectedRole === 'Factory Supervisor') {
      navigate('/supervisor/production-overview');
    } else if (selectedRole === 'Quality Engineer') {
      navigate('/quality/upload-image');
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
              <span className="block text-xs font-semibold text-blue-400 uppercase tracking-widest">Enterprise Registration</span>
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

        {/* Right Side: Glassmorphism Create Account Card */}
        <div className="lg:col-span-5 flex items-center justify-center p-8 bg-[#0B0F19] relative">
          <div className="w-full max-w-md bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">CREATE ACCOUNT</h2>
              <p className="text-xs text-gray-400">Register new credentials to access system portals</p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="user@visioninspect.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
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
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-[#1F2937]/90 border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] cursor-pointer transition-colors"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Factory Supervisor">Factory Supervisor</option>
                    <option value="Quality Engineer">Quality Engineer</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Blue Register Button */}
              <button
                type="submit"
                className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </button>
            </form>

            {/* Footer Link to Login */}
            <div className="pt-2 border-t border-[#1F2937] text-center text-xs text-gray-400">
              Already have account?{' '}
              <Link to="/login" className="text-[#2563EB] hover:underline font-semibold">
                Login
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
