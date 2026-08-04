import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { UserPlus, Scan, ShieldCheck, AlertCircle } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('quality_engineer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, fullName, role);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-8 glass-card rounded-3xl space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/20">
          <Scan className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Create VisionInspect AI Account</h2>
        <p className="text-xs text-slate-500 font-medium">
          Register with email, password, and assign your plant user role.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            placeholder="Dr. Alex Vance"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl glass-input font-medium text-slate-800 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            placeholder="alex.vance@factory.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl glass-input font-medium text-slate-800 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl glass-input font-medium text-slate-800 text-xs"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">User Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3.5 py-2.5 rounded-2xl glass-input font-bold text-slate-800 text-xs"
          >
            <option value="quality_engineer">Quality Engineer (Image Upload & Defect Pipeline)</option>
            <option value="factory_supervisor">Factory Supervisor (Manufacturing Analytics & Reports)</option>
            <option value="admin">Administrator (Master Control & User Management)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" />
          <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 font-medium pt-2">
        Already have an account?{' '}
        <button
          onClick={() => onNavigate('login')}
          className="text-teal-700 font-bold hover:underline"
        >
          Sign In
        </button>
      </div>

    </div>
  );
};
