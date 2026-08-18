import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_user', username);
        onLogin(data.token, username);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Background glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/4 rounded-full blur-3xl pointer-events-none" />

      {/* Floating AWS service labels */}
      {[
        { label: 'EC2', top: '12%', left: '8%' },
        { label: 'ECS', top: '25%', left: '88%' },
        { label: 'RDS', top: '65%', left: '5%' },
        { label: 'S3', top: '78%', left: '90%' },
        { label: 'IAM', top: '8%', left: '75%' },
        { label: 'VPC', top: '82%', left: '55%' },
        { label: 'Lambda', top: '45%', left: '92%' },
        { label: 'CloudWatch', top: '18%', left: '22%' },
      ].map((item) => (
        <div
          key={item.label}
          className="absolute text-slate-700/60 text-xs font-mono font-bold pointer-events-none select-none"
          style={{ top: item.top, left: item.left }}
        >
          {item.label}
        </div>
      ))}

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl border border-slate-800/80 p-8 sm:p-10 shadow-2xl shadow-black/60"
          style={{
            background: 'linear-gradient(145deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" />
                <path d="M10 16C10 12.686 12.686 10 16 10C19.314 10 22 12.686 22 16C22 19.314 19.314 22 16 22C12.686 22 10 19.314 10 16Z" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">AWS Infrastructure Hub</h1>
            <p className="text-slate-400 text-sm mt-1">Internal DevOps Dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="admin or devops"
                  autoComplete="username"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 rounded-2xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-950 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-xl shadow-amber-500/20"
              style={{ background: loading ? '#92400e' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured • Internal Access Only</span>
          </div>
        </div>

        {/* Bottom label */}
        <p className="text-center text-slate-600 text-xs mt-4">
          AWS Infrastructure Hub © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
