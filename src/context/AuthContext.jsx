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

    try {
      // 1. Check if user is in staff_users table
      const { data: staffData } = await supabase
        .from('staff_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (staffData && userEmail !== 'ansari74108@gmail.com') {
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

      // 2. Fetch profile from public.profiles
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profError) {
        console.warn('Could not fetch user profile:', profError.message);
      }

      // Check if this is the designated Head Admin
      const isPrimaryAdmin =
        userEmail === 'ansari74108@gmail.com' ||
        prof?.role === 'admin';

      const activeProfile = prof || {
        id: userId,
        role: isPrimaryAdmin ? 'admin' : 'attendance_staff',
        full_name: isPrimaryAdmin ? 'Head Admin' : 'User',
        email: userEmail
      };

      if (isPrimaryAdmin) {
        activeProfile.role = 'admin';
        if (!activeProfile.full_name || activeProfile.full_name === 'User') {
          activeProfile.full_name = 'Head Admin';
        }
      }

      setProfile(activeProfile);

      // 2. Fetch subject assignments if attendance staff
      if (activeProfile.role === 'attendance_staff') {
        const { data: assignments, error: aError } = await supabase
          .from('staff_subject_assignments')
          .select('subject_name')
          .eq('staff_id', userId);

        if (!aError && assignments) {
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
      const isPrimaryAdmin = userEmail === 'ansari74108@gmail.com';
      const fallback = {
        id: userId,
        role: isPrimaryAdmin ? 'admin' : 'attendance_staff',
        full_name: isPrimaryAdmin ? 'Head Admin' : 'User',
        email: userEmail
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

        if (initialSession) {
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
      async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await loadUserProfile(currentSession.user.id, currentSession.user.email);
        } else {
          setProfile(null);
          setAssignedSubjects([]);
        }
        setIsLoading(false);
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

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error) {
      throw error;
    }

    let loadedProfile = null;
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      loadedProfile = await loadUserProfile(data.user.id, data.user.email);
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
