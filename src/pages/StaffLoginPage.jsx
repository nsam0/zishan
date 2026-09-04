import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function StaffLoginPage({ onLoginSuccess }) {
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
      let userRole = result?.profile?.role || '';

      // Fallback: if profile not immediately ready in context, query directly
      if (!userRole && result?.user?.id && supabase) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', result.user.id)
            .maybeSingle();
          userRole = prof?.role || '';
        } catch {
          // ignore
        }
      }

      if (userRole && userRole !== 'attendance_staff') {
        await signOut();
        setError('Access Denied: Yeh Staff Portal hai. Admin login ke liye upar diye link par jaaiye.');
        setIsLoggingIn(false);
        return;
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_credentials')) {
        setError('Email ya Password galat hai. Pehle Admin se account banwayein ya check karein.');
      } else if (msg.toLowerCase().includes('database error') || msg.toLowerCase().includes('schema')) {
        setError('Database error: Account auth configuration incomplete hai. Niche diye SQL script se account fix karein.');
      } else {
        setError(msg || 'Login fail hua. Dobara koshish karein.');
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.svg" alt="GSE Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
        <div>
          <div className="text-white font-bold text-xl tracking-tight">Global Skill Education</div>
          <div className="text-purple-300 text-xs font-medium">Teacher / Staff Attendance Portal</div>
        </div>
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">Staff / Teacher Login</div>
              <div className="text-purple-100 text-xs mt-0.5">Admin dwara diye gaye credentials se login karein</div>
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
              <label htmlFor="staff-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="staff-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-md shadow-purple-500/25 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {isLoggingIn ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Logging in...</span></> : <><GraduationCap className="w-4 h-4" /><span>Staff Sign In</span></>}
            </button>
          </form>
          <div className="mt-2 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-xs text-purple-800 text-center">Email aur Password Admin ne set kiye hain. Admin se lein.</p>
          </div>
        </div>
        <div className="px-6 pb-5 text-center">
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Admin hain?</p>
            <a href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              <Shield className="w-3.5 h-3.5" />
              Admin Login Page par Jaaiye
            </a>
          </div>
        </div>
      </div>
      <p className="mt-6 text-slate-500 text-xs text-center">Global Skill Education &copy; {new Date().getFullYear()} &middot; Staff Attendance Portal</p>
    </div>
  );
}
