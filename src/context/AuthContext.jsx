import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch verified profile and staff subject assignments
  const loadUserProfile = useCallback(async (userId, userEmail = '') => {
    if (!userId || !supabase) {
      setProfile(null);
      setAssignedSubjects([]);
      return null;
    }

    const normalizedEmail = (userEmail || '').trim().toLowerCase();
    const isPrimaryAdmin = normalizedEmail === 'ansari74108@gmail.com';

    // 1. Instant resolution for Head Admin
    if (isPrimaryAdmin) {
      const adminProfile = {
        id: userId,
        role: 'admin',
        full_name: 'Head Admin',
        email: 'ansari74108@gmail.com'
      };
      setProfile(adminProfile);
      setAssignedSubjects([]);
      return adminProfile;
    }

    // 2. Resolution for Teacher / Staff from public.staff_users
    try {
      const { data: staffData } = await supabase
        .from('staff_users')
        .select('id, name, email, role, assigned_subjects')
        .eq('id', userId)
        .maybeSingle();

      if (staffData) {
        const staffProfile = {
          id: staffData.id,
          role: staffData.role || 'attendance_staff',
          full_name: staffData.name || staffData.email,
          email: staffData.email
        };
        setProfile(staffProfile);
        setAssignedSubjects(Array.isArray(staffData.assigned_subjects) ? staffData.assigned_subjects : []);
        return staffProfile;
      }

      // Fallback staff profile
      const fallback = {
        id: userId,
        role: 'attendance_staff',
        full_name: normalizedEmail ? normalizedEmail.split('@')[0] : 'Teacher',
        email: normalizedEmail
      };
      setProfile(fallback);
      setAssignedSubjects([]);
      return fallback;
    } catch (err) {
      console.error('loadUserProfile error:', err);
      const fallback = {
        id: userId,
        role: 'attendance_staff',
        full_name: 'Teacher',
        email: normalizedEmail
      };
      setProfile(fallback);
      setAssignedSubjects([]);
      return fallback;
    }
  }, []);

  // Initialize session and subscribe to auth state changes
  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadUserProfile(initialSession.user.id, initialSession.user.email);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setAssignedSubjects([]);
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Subscribe to auth state changes (strictly non-blocking to prevent navigator.locks deadlocks)
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if (currentSession?.user) {
          // Defer loadUserProfile to next tick so auth storage lock is released
          setTimeout(() => {
            if (mounted) {
              loadUserProfile(currentSession.user.id, currentSession.user.email);
            }
          }, 0);
        } else {
          setProfile(null);
          setAssignedSubjects([]);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // Sign In using Supabase Auth
  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please verify your environment configuration.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error) {
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
    }

    // Immediate profile shape
    const isPrimaryAdmin = cleanEmail === 'ansari74108@gmail.com';
    const initialProf = {
      id: data?.user?.id,
      role: isPrimaryAdmin ? 'admin' : 'attendance_staff',
      full_name: isPrimaryAdmin ? 'Head Admin' : cleanEmail.split('@')[0],
      email: cleanEmail
    };

    // Trigger full profile load asynchronously
    if (data?.user) {
      setTimeout(() => {
        loadUserProfile(data.user.id, data.user.email);
      }, 0);
    }

    return { ...data, profile: initialProf };
  };

  // Sign Out cleanly
  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error signing out from Supabase:', err.message);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setAssignedSubjects([]);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'attendance_staff';

  const value = {
    session,
    user,
    profile,
    assignedSubjects,
    isAdmin,
    isStaff,
    isLoading,
    signIn,
    signOut,
    reloadProfile: () => (user ? loadUserProfile(user.id) : null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
