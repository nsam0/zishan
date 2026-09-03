import React, { useState } from 'react';
import { X, Lock, Mail, Shield, GraduationCap, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ isOpen, onClose, isGateMode = false }) {
  const { signIn, signOut } = useAuth();
  
  // Portal Tab: 'admin' or 'staff'
  const [portalType, setPortalType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handlePortalSwitch = (type) => {
    setPortalType(type);
    setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    try {
      const result = await signIn(cleanEmail, cleanPass);

      const userRole = result?.profile?.role || '';
      const userEmail = result?.user?.email || cleanEmail;
      const isAdminUser = userEmail === 'ansari74108@gmail.com' || userRole === 'admin';

      // Strict portal role validation
      if (portalType === 'admin' && !isAdminUser) {
        // Staff attempted to sign in through Admin portal
        await signOut();
        setIsLoggingIn(false);
        setError('Access Denied: This account is registered as Teacher/Staff and cannot access the Admin Panel. Please switch to the "Teacher / Staff" login tab.');
        return;
      }

      setIsLoggingIn(false);
      if (onClose) onClose();
    } catch (err) {
      setIsLoggingIn(false);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Email confirmation required. Please confirm your email address.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    }
  };

  const isAdminPortal = portalType === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Portal Switcher Tabs */}
        <div className="p-3 bg-slate-100/90 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => handlePortalSwitch('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isAdminPortal
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('staff')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isAdminPortal
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teacher / Staff</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5 border ${
                isAdminPortal
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {isAdminPortal ? 'Admin Access Only' : 'Teacher Attendance Portal'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {isAdminPortal ? 'Sign In to GSE Admin' : 'Teacher Portal Sign In'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdminPortal
                ? 'Manage students, courses, staff accounts, and institute analytics.'
                : 'Sign in with your teacher credentials to mark student attendance.'}
            </p>
          </div>

          {!isGateMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer self-start"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {isAdminPortal ? 'Admin Official Email' : 'Teacher Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdminPortal ? 'admin@example.com' : 'teacher@example.com'}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-2.5 px-4 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 ${
                isAdminPortal
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/20'
                  : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 shadow-purple-500/20'
              }`}
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isLoggingIn
                  ? 'Verifying Credentials...'
                  : isAdminPortal
                  ? 'Sign In to Admin Panel'
                  : 'Sign In to Teacher Portal'}
              </span>
            </button>
          </form>

          {isGateMode && (
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-400">
                {isAdminPortal
                  ? 'Authorized Administrators only. Least-privilege access enforced.'
                  : 'Authorized Teaching Faculty only. Login to mark class attendance.'}
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
