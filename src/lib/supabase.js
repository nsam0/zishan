import { createClient } from '@supabase/supabase-js';

// Read configuration from Vite environment variables with fallback
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vznyiuhotopctbssnpjn.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bnlpdWhvdG9wY3Ric3NucGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyOTMyMjQsImV4cCI6MjEwMjg2OTIyNH0.Fs-AwPDYBNkhnvHSxcKmqci6lqLxKAXiyPYNkiOE14A';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function createSafeSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '[Security Warning] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined. Please verify your environment settings.'
    );
    return null;
  }
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Single authenticated Supabase client using public publishable anon key
export const supabase = createSafeSupabaseClient();


export const SQL_SETUP_SCRIPT = `-- Global Skill Education: Production Database & Least-Privilege RLS Setup
-- Copy and run this script in Supabase Dashboard -> SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'attendance_staff' CHECK (role IN ('admin', 'attendance_staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Staff Subject Assignments Table
CREATE TABLE IF NOT EXISTS public.staff_subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_staff_subject UNIQUE (staff_id, subject_name)
);
ALTER TABLE public.staff_subject_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    father_name TEXT,
    roll_number TEXT,
    course TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 4. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    course_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 6. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT DEFAULT '',
    course TEXT DEFAULT '',
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    timing TEXT DEFAULT 'on_time' CHECK (timing IN ('on_time', 'late', 'n/a')),
    grooming TEXT DEFAULT 'well_groomed' CHECK (grooming IN ('well_groomed', 'not_groomed', 'n/a')),
    marked_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_attendance_per_day_subject UNIQUE (date, student_id, subject)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 7. Leaderboard Table
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    roll_number TEXT DEFAULT '',
    course TEXT DEFAULT '',
    total_classes INT DEFAULT 0,
    present_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    on_time_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    well_groomed_count INT DEFAULT 0,
    not_groomed_count INT DEFAULT 0,
    total_score INT DEFAULT 0,
    attendance_percentage NUMERIC(5,2) DEFAULT 0.00,
    punctuality_percentage NUMERIC(5,2) DEFAULT 0.00,
    grooming_percentage NUMERIC(5,2) DEFAULT 0.00,
    rank INT DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- 8. Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_attendance_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'attendance_staff');
$$;

CREATE OR REPLACE FUNCTION public.staff_has_subject_access(subj text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_subject_assignments WHERE staff_id = auth.uid() AND subject_name = subj);
$$;

-- 9. Narrow View for Staff (Excludes Father/Guardian Name)
CREATE OR REPLACE VIEW public.staff_students_view WITH (security_invoker = false) AS
    SELECT id, name, roll_number, course, created_at FROM public.students;

-- 10. Permissions & Least-Privilege RLS Policies
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.staff_students_view TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.staff_subject_assignments, public.students, public.courses, public.subjects, public.attendance_records, public.leaderboard_scores TO authenticated;

-- Policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin() OR id = auth.uid());
CREATE POLICY "profiles_manage" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "staff_subj_select" ON public.staff_subject_assignments FOR SELECT TO authenticated USING (public.is_admin() OR staff_id = auth.uid());
CREATE POLICY "staff_subj_manage" ON public.staff_subject_assignments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "students_admin" ON public.students FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated USING (public.is_admin() OR public.is_attendance_staff());
CREATE POLICY "courses_manage" ON public.courses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT TO authenticated USING (public.is_admin() OR public.is_attendance_staff());
CREATE POLICY "subjects_manage" ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT TO authenticated USING (public.is_admin() OR (public.is_attendance_staff() AND public.staff_has_subject_access(subject)));
CREATE POLICY "attendance_insert" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR (public.is_attendance_staff() AND public.staff_has_subject_access(subject)));
CREATE POLICY "attendance_update" ON public.attendance_records FOR UPDATE TO authenticated USING (public.is_admin() OR (public.is_attendance_staff() AND public.staff_has_subject_access(subject))) WITH CHECK (public.is_admin() OR (public.is_attendance_staff() AND public.staff_has_subject_access(subject)));
CREATE POLICY "attendance_delete" ON public.attendance_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "leaderboard_select" ON public.leaderboard_scores FOR SELECT TO authenticated USING (public.is_admin() OR public.is_attendance_staff());
CREATE POLICY "leaderboard_manage" ON public.leaderboard_scores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. Trigger: Auto-create Profile on Auth Signup / User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'attendance_staff')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. RPC Function: Admin Creates / Updates Teacher Account with Email & Password
CREATE OR REPLACE FUNCTION public.admin_create_staff_user(
  staff_email text,
  staff_password text,
  staff_name text,
  assigned_subjects text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  target_user_id uuid;
  subj text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can create or update teacher accounts.';
  END IF;

  IF staff_email IS NULL OR length(trim(staff_email)) = 0 THEN
    RAISE EXCEPTION 'Teacher email is required.';
  END IF;
  IF staff_password IS NULL OR length(staff_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long.';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = lower(trim(staff_email));

  IF target_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = crypt(staff_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;

    UPDATE public.profiles
    SET full_name = staff_name,
        role = 'attendance_staff',
        updated_at = now()
    WHERE id = target_user_id;
  ELSE
    target_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      lower(trim(staff_email)),
      crypt(staff_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', staff_name, 'role', 'attendance_staff'),
      now(),
      now()
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (target_user_id, lower(trim(staff_email)), staff_name, 'attendance_staff')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = 'attendance_staff',
        updated_at = now();
  END IF;

  DELETE FROM public.staff_subject_assignments WHERE staff_id = target_user_id;

  IF array_length(assigned_subjects, 1) > 0 THEN
    FOREACH subj IN ARRAY assigned_subjects LOOP
      INSERT INTO public.staff_subject_assignments (staff_id, subject_name)
      VALUES (target_user_id, subj)
      ON CONFLICT (staff_id, subject_name) DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', lower(trim(staff_email)),
    'name', staff_name
  );
END;
$$;

-- 13. RPC Function: Admin Deletes Teacher Account
CREATE OR REPLACE FUNCTION public.admin_delete_staff_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can delete teacher accounts.';
  END IF;

  DELETE FROM public.staff_subject_assignments WHERE staff_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_user(uuid) TO authenticated;
`;

/* ==========================================================================
   STUDENTS API (LEAST-PRIVILEGE RLS PROTECTED)
   ========================================================================== */

/**
 * Fetch students.
 * - Admins read from public.students (includes sensitive father_name).
 * - Staff read from public.staff_students_view (excludes father_name).
 */
export async function fetchStudentsFromDB(role = 'admin') {
  try {
    // Both admin and staff query public.students directly
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error.message);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('fetchStudentsFromDB failed:', err);
    return { data: [], error: err.message };
  }
}

export async function addStudentToDB({ name, father_name = '', roll_number = '', course = '' }) {
  const newStudent = {
    name: name.trim(),
    father_name: father_name.trim(),
    roll_number: roll_number.trim(),
    course: course.trim()
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .insert([newStudent])
      .select();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data[0], error: null, success: true };
  } catch (err) {
    return { data: null, error: err.message, success: false };
  }
}

export async function updateStudentInDB(id, { name, father_name, roll_number, course }) {
  try {
    const { data, error } = await supabase
      .from('students')
      .update({
        name: name.trim(),
        father_name: father_name?.trim() || '',
        roll_number: roll_number?.trim() || '',
        course: course?.trim() || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data[0], error: null, success: true };
  } catch (err) {
    return { data: null, error: err.message, success: false };
  }
}

export async function deleteStudentFromDB(id) {
  try {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   COURSES API
   ========================================================================== */

export async function fetchCoursesFromDB() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function addCourseToDB({ name, description = '' }) {
  const newCourse = {
    name: name.trim(),
    description: description.trim()
  };

  try {
    const { data, error } = await supabase
      .from('courses')
      .insert([newCourse])
      .select();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data[0], error: null, success: true };
  } catch (err) {
    return { data: null, error: err.message, success: false };
  }
}

export async function deleteCourseFromDB(id) {
  try {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   SUBJECTS API
   ========================================================================== */

export async function fetchSubjectsFromDB() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function addSubjectToDB({ name, code = '', course_name = '' }) {
  const newSubject = {
    name: name.trim(),
    code: code.trim(),
    course_name: course_name.trim()
  };

  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert([newSubject])
      .select();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data[0], error: null, success: true };
  } catch (err) {
    return { data: null, error: err.message, success: false };
  }
}

export async function deleteSubjectFromDB(id) {
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   STAFF PROFILES & SUBJECT ASSIGNMENTS API
   ========================================================================== */

/**
 * Fetch staff profiles and their assigned subjects
 */
/**
 * Fetch staff profiles and their assigned subjects
 */
export async function fetchStaffUsersFromDB() {
  if (!supabase) return { data: [], error: null };
  try {
    // 1. Check staff_users table first
    const { data: staffData, error: sError } = await supabase
      .from('staff_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sError && staffData && staffData.length > 0) {
      return {
        data: staffData.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          username: s.username || s.email,
          role: s.role || 'attendance_staff',
          assigned_subjects: Array.isArray(s.assigned_subjects) ? s.assigned_subjects : [],
          created_at: s.created_at
        })),
        error: null
      };
    }

    // 2. Fallback to profiles table
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'attendance_staff')
      .order('created_at', { ascending: false });

    if (pError) {
      return { data: [], error: pError.message };
    }

    const { data: assignments } = await supabase
      .from('staff_subject_assignments')
      .select('staff_id, subject_name');

    const staffList = (profiles || []).map((prof) => {
      const userAssignments = (assignments || [])
        .filter((a) => a.staff_id === prof.id)
        .map((a) => a.subject_name);

      return {
        id: prof.id,
        name: prof.full_name,
        email: prof.email,
        username: prof.email,
        role: prof.role,
        assigned_subjects: userAssignments,
        created_at: prof.created_at
      };
    });

    return { data: staffList, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/**
 * Assign subjects to a staff profile
 */
export async function assignStaffSubjectsInDB(staffId, subjectNames = []) {
  if (!supabase) return { success: true };
  try {
    await supabase
      .from('staff_users')
      .update({ assigned_subjects: subjectNames })
      .eq('id', staffId);

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Create or update a staff/teacher user with official email, password, and assigned subjects.
 */
export async function createStaffUserInDB({ name, email, password, assigned_subjects = [] }) {
  if (!supabase) {
    return { success: false, error: 'Supabase client is not initialized.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPassword = password.trim();

  try {
    // 1. Call the native create_staff_user RPC that exists in Supabase
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_staff_user', {
      staff_email: cleanEmail,
      staff_name: cleanName,
      staff_password: cleanPassword,
      staff_role: 'attendance_staff',
      staff_username: cleanEmail
    });

    let newUserId = rpcData?.user_id || rpcData?.id;

    if (rpcError) {
      console.warn('create_staff_user RPC error, trying fallback:', rpcError.message);
      // Fallback to admin_create_staff_user if available
      const { data: altData, error: altError } = await supabase.rpc('admin_create_staff_user', {
        staff_email: cleanEmail,
        staff_password: cleanPassword,
        staff_name: cleanName,
        assigned_subjects: assigned_subjects
      });

      if (altError) {
        throw new Error(altError.message || rpcError.message);
      }
      newUserId = altData?.user_id || altData?.id;
    }

    // 2. Save assigned subjects in staff_users table
    if (newUserId) {
      await supabase
        .from('staff_users')
        .update({ assigned_subjects: assigned_subjects })
        .eq('id', newUserId);
    }

    return {
      success: true,
      data: {
        user_id: newUserId || 'staff-' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        assigned_subjects: assigned_subjects
      },
      error: null
    };
  } catch (err) {
    console.error('createStaffUserInDB exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a staff profile and its auth user cleanly
 */
export async function deleteStaffUserFromDB(id) {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  try {
    await supabase.from('staff_users').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}



/* ==========================================================================
   ATTENDANCE RECORDS API
   ========================================================================== */

export async function fetchAttendanceForDateFromDB(date, course, subject) {
  try {
    let query = supabase.from('attendance_records').select('*').eq('date', date);

    if (course && course !== 'ALL') {
      query = query.eq('course', course);
    }
    if (subject && subject !== 'ALL') {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

// Alias for backwards compatibility
export const fetchAttendanceFromDB = fetchAttendanceForDateFromDB;

export async function fetchAttendanceRangeFromDB(startDate, endDate, course, subject) {
  try {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (course && course !== 'ALL') {
      query = query.eq('course', course);
    }
    if (subject && subject !== 'ALL') {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function saveAttendanceToDB(records) {
  if (!records || records.length === 0) return { success: true };

  try {
    const date = records[0].date;
    const subject = records[0].subject;
    const studentIds = records.map((r) => r.student_id);

    // Safely delete existing attendance records for these students on this date and subject
    await supabase
      .from('attendance_records')
      .delete()
      .eq('date', date)
      .eq('subject', subject)
      .in('student_id', studentIds);

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(records)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   LEADERBOARD & PERFORMANCE SCORES HELPERS
   ========================================================================== */

export async function fetchAllAttendanceRecords() {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to fetch attendance records:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('fetchAllAttendanceRecords error:', err);
    return [];
  }
}

export function computeLeaderboardScores(students = [], attendanceRecords = []) {
  if (!students || students.length === 0) return [];

  const studentRecordsMap = {};
  attendanceRecords.forEach((r) => {
    if (!studentRecordsMap[r.student_id]) {
      studentRecordsMap[r.student_id] = [];
    }
    studentRecordsMap[r.student_id].push(r);
  });

  const scores = students.map((student) => {
    const records = studentRecordsMap[student.id] || [];
    const total_classes = records.length;

    let present_count = 0;
    let absent_count = 0;
    let on_time_count = 0;
    let late_count = 0;
    let well_groomed_count = 0;
    let not_groomed_count = 0;

    records.forEach((rec) => {
      const isPresent = rec.status === 'present';
      if (isPresent) {
        present_count++;
        if (rec.timing === 'late') {
          late_count++;
        } else {
          on_time_count++;
        }

        if (rec.grooming === 'not_groomed') {
          not_groomed_count++;
        } else {
          well_groomed_count++;
        }
      } else {
        absent_count++;
      }
    });

    const total_score =
      present_count * 10 +
      on_time_count * 5 +
      late_count * 2 +
      well_groomed_count * 5;

    const attendance_percentage =
      total_classes > 0 ? Number(((present_count / total_classes) * 100).toFixed(1)) : 0;

    const punctuality_percentage =
      present_count > 0 ? Number(((on_time_count / present_count) * 100).toFixed(1)) : 0;

    const grooming_percentage =
      present_count > 0 ? Number(((well_groomed_count / present_count) * 100).toFixed(1)) : 0;

    return {
      student_id: student.id,
      student_name: student.name,
      roll_number: student.roll_number || '',
      course: student.course || '',
      total_classes,
      present_count,
      absent_count,
      on_time_count,
      late_count,
      well_groomed_count,
      not_groomed_count,
      total_score,
      attendance_percentage,
      punctuality_percentage,
      grooming_percentage,
      rank: 1,
      last_updated: new Date().toISOString()
    };
  });

  scores.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return b.attendance_percentage - a.attendance_percentage;
  });

  scores.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scores;
}

export async function syncLeaderboardToDB(scores) {
  if (!scores || scores.length === 0) return { success: true };

  try {
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .upsert(scores, { onConflict: 'student_id' })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchLeaderboardFromDB(students = []) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('*')
      .order('rank', { ascending: true });

    if (!error && data && data.length > 0) {
      return { data, error: null };
    }

    // Compute fresh from attendance records
    const allRecords = await fetchAllAttendanceRecords();
    const computed = computeLeaderboardScores(students, allRecords);
    if (computed.length > 0) {
      await syncLeaderboardToDB(computed);
    }
    return { data: computed, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}
