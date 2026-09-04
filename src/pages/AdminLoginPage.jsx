import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminLoginPage({ onLoginSuccess }) {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    const cleanEmail = email.trim().toLowerCase();
    const exactPassword = password; // Never trim password
    try {
      const result = await signIn(cleanEmail, exactPassword);

      // Profile might be null if database tables aren't set up yet
      let userRole = result?.profile?.role || '';

      // If profile didn't load, try one more time directly
      if (!userRole && result?.user?.id) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', result.user.id)
            .maybeSingle();
          userRole = prof?.role || '';
        } catch {
          // Database tables likely not created
        }
      }

      if (!userRole) {
        await signOut();
        setError('Database tables abhi setup nahi hue hain. Supabase Dashboard → SQL Editor mein jaake setup SQL script run karein.');
        setIsLoggingIn(false);
        return;
      }

      if (userRole !== 'admin') {
        await signOut();
        setError('Access Denied: Yeh Admin Portal hai. Staff login ke liye neeche diye link par jaaiye.');
        setIsLoggingIn(false);
        return;
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Email ya Password galat hai. Dobara check karein.');
      } else if (msg.toLowerCase().includes('database error') || msg.toLowerCase().includes('schema')) {
        setError('Database setup incomplete hai. Supabase Dashboard → SQL Editor mein jaake setup SQL script run karein. Details: ' + msg);
      } else {
        setError(msg || 'Login fail hua. Dobara koshish karein.');
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.svg" alt="GSE Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
        <div>
          <div className="text-white font-bold text-xl tracking-tight">Global Skill Education</div>
          <div className="text-blue-300 text-xs font-medium">Admin Control Panel</div>
        </div>
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">Admin Login</div>
              <div className="text-blue-100 text-xs mt-0.5">Sirf Admin yahan login kar sakta hai</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">{error}</div>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/25 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {isLoggingIn ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Logging in...</span></> : <><Shield className="w-4 h-4" /><span>Admin Sign In</span></>}
            </button>
          </form>
        </div>
        <div className="px-6 pb-5 text-center">
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Staff / Teacher hain?</p>
            <a href="/staff" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              <GraduationCap className="w-3.5 h-3.5" />
              Staff Login Page par Jaaiye
            </a>
          </div>
        </div>
      </div>
      <p className="mt-6 text-slate-500 text-xs text-center">Global Skill Education &copy; {new Date().getFullYear()} &middot; Secure Admin Portal</p>
    </div>
  );
}
