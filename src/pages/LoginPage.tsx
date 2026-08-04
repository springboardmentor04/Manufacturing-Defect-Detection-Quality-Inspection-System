import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Scan, LogIn, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 glass-card rounded-3xl space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/20">
          <Scan className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Sign In to VisionInspect AI</h2>
        <p className="text-xs text-slate-500 font-medium">
          Enter your registered email and password to access quality inspection dashboards.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            placeholder="engineer@factory.com"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'Authenticating JWT...' : 'Sign In'}</span>
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 font-medium pt-2">
        Don't have an account?{' '}
        <button
          onClick={() => onNavigate('register')}
          className="text-teal-700 font-bold hover:underline"
        >
          Register here
        </button>
      </div>

    </div>
  );
};
