import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch verified profile and staff subject assignments strictly from profiles table
  const loadUserProfile = useCallback(async (userId, userEmail = '') => {
    if (!userId || !supabase) {
      setProfile(null);
      setAssignedSubjects([]);
      return null;
    }

    const normalizedEmail = (userEmail || '').trim().toLowerCase();

    try {
      // 1. Fetch user's protected profile from public.profiles
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .maybeSingle();

      if (profErr) {
        console.warn('Error loading user profile:', profErr.message);
      }

      const activeProfile = prof || {
        id: userId,
        role: 'attendance_staff',
        full_name: normalizedEmail ? normalizedEmail.split('@')[0] : 'User',
        email: normalizedEmail
      };

      setProfile(activeProfile);

      // 2. If staff role, load subject assignments from public.staff_subject_assignments
      if (activeProfile.role === 'attendance_staff') {
        const { data: assignments, error: aErr } = await supabase
          .from('staff_subject_assignments')
          .select('subject_name')
          .eq('staff_id', userId);

        if (!aErr && assignments) {
          setAssignedSubjects(assignments.map((a) => a.subject_name));
        } else {
          setAssignedSubjects([]);
        }
      } else {
        setAssignedSubjects([]);
      }

      return activeProfile;
    } catch (err) {
      console.error('loadUserProfile error:', err);
      const fallback = {
        id: userId,
        role: 'attendance_staff',
        full_name: normalizedEmail ? normalizedEmail.split('@')[0] : 'User',
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

    // Subscribe to auth state changes
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if (currentSession?.user) {
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

  // Sign In using Supabase Auth (Never trims passwords)
  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Please check your environment configuration.');
    }

    const cleanEmail = email.trim().toLowerCase();
    // NEVER trim passwords - passwords may intentionally include leading or trailing spaces
    const exactPassword = password;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: exactPassword
    });

    if (error) {
      throw error;
    }

    let loadedProfile = null;
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      try {
        loadedProfile = await loadUserProfile(data.user.id, data.user.email);
      } catch (profileErr) {
        console.warn('Profile loading failed after login, will retry:', profileErr?.message);
        // Profile load failed but auth succeeded — don't block login
        // The onAuthStateChange handler will retry profile loading
      }
    }

    return { ...data, profile: loadedProfile };
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
