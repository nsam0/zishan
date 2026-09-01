import React, { useState } from 'react';
import { X, Lock, User, KeyRound, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, DEFAULT_ADMIN_USER } from '../lib/supabase';

export default function LoginModal({ isOpen, onClose, staffUsers = [], onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check if Admin
    if (
      cleanUser === 'zishan@gmail.com' ||
      cleanUser === 'admin' ||
      cleanUser === 'zishan'
    ) {
      onLoginSuccess(DEFAULT_ADMIN_USER);
      setIsLoggingIn(false);
      onClose();
      return;
    }

    // 2. Check staff list (Local & Database synced)
    const matchedStaff = staffUsers.find(
      (s) =>
        (s.username?.toLowerCase() === cleanUser || s.email?.toLowerCase() === cleanUser) &&
        s.password === cleanPass
    );

    if (matchedStaff) {
      const normalizedStaff = {
        ...matchedStaff,
        assigned_subjects:
          Array.isArray(matchedStaff.assigned_subjects) && matchedStaff.assigned_subjects.length > 0
            ? matchedStaff.assigned_subjects
            : matchedStaff.assigned_subject
            ? [matchedStaff.assigned_subject]
            : []
      };
      onLoginSuccess(normalizedStaff);
      setIsLoggingIn(false);
      onClose();
      return;
    }

    // 3. Check Supabase Auth (auth.users)
    try {
      const emailToTry = cleanUser.includes('@') ? cleanUser : `${cleanUser}@gmail.com`;
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToTry,
        password: cleanPass
      });

      if (!authErr && authData?.user) {
        const meta = authData.user.user_metadata || {};
        const staffObj = {
          id: authData.user.id,
          name: meta.name || cleanUser,
          username: cleanUser,
          email: authData.user.email,
          role: meta.role || 'attendance_staff',
          assigned_subjects: meta.assigned_subjects || (meta.assigned_subject ? [meta.assigned_subject] : []),
          assigned_subject: meta.assigned_subject || (meta.assigned_subjects?.[0] || '')
        };
        onLoginSuccess(staffObj);
        setIsLoggingIn(false);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Supabase Auth sign in attempt:', err.message);
    }

    setIsLoggingIn(false);
    setError('Invalid Username/ID or Password. Please check your credentials and try again.');
  };

  const handleQuickLoginAdmin = () => {
    onLoginSuccess(DEFAULT_ADMIN_USER);
    onClose();
  };

  const handleQuickLoginStaff = (staff) => {
    const normalized = {
      ...staff,
      assigned_subjects:
        Array.isArray(staff.assigned_subjects) && staff.assigned_subjects.length > 0
          ? staff.assigned_subjects
          : staff.assigned_subject
          ? [staff.assigned_subject]
          : []
    };
    onLoginSuccess(normalized);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">User Sign In / Switch Role</h3>
              <p className="text-xs text-slate-500">Sign in with Admin or Staff credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Username / Staff ID / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. zishan@gmail.com or staff1"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoggingIn ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Role Switch:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleQuickLoginAdmin}
                className="w-full text-left p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-blue-900">Admin Account</div>
                  <div className="text-[11px] text-blue-700">Full Access (All Modules & Reports)</div>
                </div>
                <span className="text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                  Login
                </span>
              </button>

              {staffUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickLoginStaff(staffUsers[0])}
                  className="w-full text-left p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-purple-900">
                      Staff: {staffUsers[0].name} ({staffUsers[0].username})
                    </div>
                    <div className="text-[11px] text-purple-700">
                      Access: {Array.isArray(staffUsers[0].assigned_subjects) && staffUsers[0].assigned_subjects.length > 0 ? staffUsers[0].assigned_subjects.join(', ') : (staffUsers[0].assigned_subject || 'Assigned Subjects')}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-purple-600 text-white px-2 py-0.5 rounded-md">
                    Login
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
