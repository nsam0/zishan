import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vznyiuhotopctbssnpjn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bnlpdWhvdG9wY3Ric3NucGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyOTMyMjQsImV4cCI6MjEwMjg2OTIyNH0.Fs-AwPDYBNkhnvHSxcKmqci6lqLxKAXiyPYNkiOE14A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_STUDENTS_KEY = 'gse_students_records_v1';
const LOCAL_COURSES_KEY = 'gse_courses_records_v1';
const LOCAL_SUBJECTS_KEY = 'gse_subjects_records_v1';
const LOCAL_STAFF_KEY = 'gse_staff_users_v1';
const LOCAL_ATTENDANCE_KEY = 'gse_attendance_records_v1';
const LOCAL_CURRENT_USER_KEY = 'gse_current_auth_user_v1';

// Default initial courses
const DEFAULT_COURSES = [
  { id: 'c-1', name: 'Diploma in Hotel Management', description: 'Comprehensive hospitality & hotel operations' },
  { id: 'c-2', name: 'Diploma in International Hotel Management', description: 'Global hospitality standards & management' },
  { id: 'c-3', name: 'Degree in Hotel Management', description: '3-Year undergraduate program in hospitality' },
  { id: 'c-4', name: 'Degree in International Hotel Management', description: 'International bachelor curriculum' },
  { id: 'c-5', name: 'Culinary Arts', description: 'Professional kitchen training, gastronomy & bakery' },
];

// Default initial subjects
const DEFAULT_SUBJECTS = [
  { id: 's-1', name: 'Food & Beverage Service', code: 'FBS-101', course_name: 'Diploma in Hotel Management' },
  { id: 's-2', name: 'Front Office Operations', code: 'FO-102', course_name: 'Diploma in Hotel Management' },
  { id: 's-3', name: 'Housekeeping Management', code: 'HK-103', course_name: 'Diploma in Hotel Management' },
  { id: 's-4', name: 'Culinary Fundamentals & Bakery', code: 'CUL-104', course_name: 'Culinary Arts' },
];

// Default admin user
export const DEFAULT_ADMIN_USER = {
  id: 'admin-1',
  name: 'Zishan (Admin)',
  username: 'zishan@gmail.com',
  email: 'zishan@gmail.com',
  role: 'admin',
};

// Default initial staff demo account
const DEFAULT_STAFF_USERS = [
  {
    id: 'staff-demo-1',
    name: 'Rahul Sharma',
    username: 'staff1',
    email: 'staff1@gmail.com',
    password: '123',
    role: 'attendance_staff',
    assigned_subjects: ['Food & Beverage Service', 'Front Office Operations'],
    assigned_subject: 'Food & Beverage Service',
    created_at: new Date().toISOString()
  }
];

export const SQL_SETUP_SCRIPT = `-- Global Skill Education: Complete Database Tables Setup
-- Run this in Supabase Dashboard -> SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Students Table
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
DROP POLICY IF EXISTS "Allow public all access" ON public.students;
CREATE POLICY "Allow public all access" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on courses" ON public.courses;
CREATE POLICY "Allow public all access on courses" ON public.courses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    course_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on subjects" ON public.subjects;
CREATE POLICY "Allow public all access on subjects" ON public.subjects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Staff Users Table
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT DEFAULT '',
    password TEXT NOT NULL,
    role TEXT DEFAULT 'attendance_staff',
    assigned_subjects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on staff_users" ON public.staff_users;
CREATE POLICY "Allow public all access on staff_users" ON public.staff_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Function to automatically create user in Supabase Authentication (auth.users)
CREATE OR REPLACE FUNCTION public.create_staff_user(
    staff_name text,
    staff_username text,
    staff_email text,
    staff_password text,
    staff_role text DEFAULT 'attendance_staff'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    hashed_pass text;
BEGIN
    hashed_pass := crypt(staff_password, gen_salt('bf'));

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(staff_email)) THEN
        UPDATE auth.users 
        SET encrypted_password = hashed_pass,
            raw_user_meta_data = jsonb_build_object('name', staff_name, 'role', staff_role),
            updated_at = NOW()
        WHERE email = lower(staff_email);
        
        SELECT id INTO new_user_id FROM auth.users WHERE email = lower(staff_email);
    ELSE
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
            updated_at,
            confirmation_token,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            lower(staff_email),
            hashed_pass,
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('name', staff_name, 'role', staff_role),
            NOW(),
            NOW(),
            '',
            ''
        );
    END IF;

    INSERT INTO public.staff_users (
        id,
        name,
        username,
        email,
        password,
        role,
        created_at
    ) VALUES (
        new_user_id,
        staff_name,
        lower(staff_username),
        lower(staff_email),
        staff_password,
        staff_role,
        NOW()
    )
    ON CONFLICT (username) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        role = EXCLUDED.role;

    RETURN json_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', lower(staff_email),
        'username', lower(staff_username),
        'role', staff_role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_user TO anon, authenticated;

-- 6. Attendance Records Table (Subject-Wise, Timing & Grooming)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT DEFAULT '',
    course TEXT DEFAULT '',
    subject TEXT NOT NULL,
    status TEXT NOT NULL,                 -- 'present' or 'absent'
    timing TEXT DEFAULT 'on_time',        -- 'on_time' or 'late'
    grooming TEXT DEFAULT 'well_groomed', -- 'well_groomed' or 'not_groomed'
    marked_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_attendance_per_day_subject UNIQUE (date, student_id, subject)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow public all access on attendance_records" ON public.attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. Leaderboard & Student Performance Scores Table
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
DROP POLICY IF EXISTS "Allow public all access on leaderboard_scores" ON public.leaderboard_scores;
CREATE POLICY "Allow public all access on leaderboard_scores" ON public.leaderboard_scores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;

/* ==========================================================================
   AUTH / CURRENT USER HELPERS
   ========================================================================== */

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(LOCAL_CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ADMIN_USER;
  } catch (err) {
    return DEFAULT_ADMIN_USER;
  }
}

export function saveCurrentUser(user) {
  try {
    localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save current user', err);
  }
}

/* ==========================================================================
   STUDENTS HELPERS
   ========================================================================== */

export function getLocalStudents() {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveLocalStudents(students) {
  try {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export async function fetchStudentsFromDB() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const isMissing = error.code === 'PGRST205' || error.message?.toLowerCase().includes('schema cache');
      const local = getLocalStudents();
      return {
        data: local,
        error: error.message,
        isTableMissing: isMissing,
        isOffline: !navigator.onLine,
        isUsingLocal: true
      };
    }

    saveLocalStudents(data || []);
    return {
      data: data || [],
      error: null,
      isTableMissing: false,
      isOffline: false,
      isUsingLocal: false
    };
  } catch (err) {
    return {
      data: getLocalStudents(),
      error: err.message,
      isTableMissing: false,
      isOffline: true,
      isUsingLocal: true
    };
  }
}

export async function addStudentToDB(student) {
  const newStudent = {
    name: student.name.trim(),
    father_name: student.father_name ? student.father_name.trim() : null,
    roll_number: student.roll_number ? student.roll_number.trim() : null,
    course: student.course ? student.course.trim() : '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .insert([newStudent])
      .select();

    if (error) {
      const localId = 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const record = { ...newStudent, id: localId, _isLocalOnly: true };
      const current = getLocalStudents();
      saveLocalStudents([record, ...current]);
      return { data: record, error: error.message, isTableMissing: error.code === 'PGRST205', savedLocally: true };
    }

    const inserted = data[0];
    const current = getLocalStudents();
    saveLocalStudents([inserted, ...current]);
    return { data: inserted, error: null, savedLocally: false };
  } catch (err) {
    const localId = 'local-' + Date.now();
    const record = { ...newStudent, id: localId, _isLocalOnly: true };
    const current = getLocalStudents();
    saveLocalStudents([record, ...current]);
    return { data: record, error: err.message, savedLocally: true };
  }
}

export async function updateStudentInDB(id, updates) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from('students').update(payload).eq('id', id).select();
    if (error) {
      const current = getLocalStudents();
      const updatedList = current.map((s) => (s.id === id ? { ...s, ...payload } : s));
      saveLocalStudents(updatedList);
      return { success: true, savedLocally: true };
    }
    const current = getLocalStudents();
    const updatedList = current.map((s) => (s.id === id ? (data[0] || { ...s, ...payload }) : s));
    saveLocalStudents(updatedList);
    return { success: true, savedLocally: false };
  } catch (err) {
    const current = getLocalStudents();
    const updatedList = current.map((s) => (s.id === id ? { ...s, ...payload } : s));
    saveLocalStudents(updatedList);
    return { success: true, savedLocally: true };
  }
}

export async function deleteStudentFromDB(id) {
  try {
    await supabase.from('students').delete().eq('id', id);
    const current = getLocalStudents();
    saveLocalStudents(current.filter((s) => s.id !== id));
    return { success: true };
  } catch (err) {
    const current = getLocalStudents();
    saveLocalStudents(current.filter((s) => s.id !== id));
    return { success: true };
  }
}

/* ==========================================================================
   COURSES HELPERS
   ========================================================================== */

export function getLocalCourses() {
  try {
    const raw = localStorage.getItem(LOCAL_COURSES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(DEFAULT_COURSES));
      return DEFAULT_COURSES;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_COURSES;
  }
}

export function saveLocalCourses(courses) {
  try {
    localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(courses));
  } catch (err) {
    console.error('Failed to save courses', err);
  }
}

export async function fetchCoursesFromDB() {
  try {
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (error) {
      return { data: getLocalCourses(), error: error.message, isUsingLocal: true };
    }
    if (data && data.length > 0) {
      saveLocalCourses(data);
      return { data, error: null, isUsingLocal: false };
    }
    return { data: getLocalCourses(), error: null, isUsingLocal: true };
  } catch (err) {
    return { data: getLocalCourses(), error: err.message, isUsingLocal: true };
  }
}

export async function addCourseToDB({ name, description = '' }) {
  const cleanName = name.trim();
  const cleanDesc = description ? description.trim() : '';
  const newCourse = { name: cleanName, description: cleanDesc, created_at: new Date().toISOString() };

  try {
    const { data, error } = await supabase.from('courses').insert([newCourse]).select();
    if (error) {
      const localId = 'course-' + Date.now();
      const record = { ...newCourse, id: localId, _isLocalOnly: true };
      const current = getLocalCourses();
      saveLocalCourses([record, ...current]);
      return { data: record, error: null, savedLocally: true };
    }
    const current = getLocalCourses();
    saveLocalCourses([data[0], ...current.filter(c => c.name !== cleanName)]);
    return { data: data[0], error: null, savedLocally: false };
  } catch (err) {
    const localId = 'course-' + Date.now();
    const record = { ...newCourse, id: localId, _isLocalOnly: true };
    const current = getLocalCourses();
    saveLocalCourses([record, ...current]);
    return { data: record, error: null, savedLocally: true };
  }
}

export async function deleteCourseFromDB(id) {
  try {
    await supabase.from('courses').delete().eq('id', id);
    const current = getLocalCourses();
    saveLocalCourses(current.filter((c) => c.id !== id));
    return { success: true };
  } catch (err) {
    const current = getLocalCourses();
    saveLocalCourses(current.filter((c) => c.id !== id));
    return { success: true };
  }
}

/* ==========================================================================
   SUBJECTS HELPERS
   ========================================================================== */

export function getLocalSubjects() {
  try {
    const raw = localStorage.getItem(LOCAL_SUBJECTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_SUBJECTS;
  }
}

export function saveLocalSubjects(subjects) {
  try {
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (err) {
    console.error('Failed to save subjects', err);
  }
}

export async function fetchSubjectsFromDB() {
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: false });
    if (error) {
      return { data: getLocalSubjects(), error: error.message, isUsingLocal: true };
    }
    if (data && data.length > 0) {
      saveLocalSubjects(data);
      return { data, error: null, isUsingLocal: false };
    }
    return { data: getLocalSubjects(), error: null, isUsingLocal: true };
  } catch (err) {
    return { data: getLocalSubjects(), error: err.message, isUsingLocal: true };
  }
}

export async function addSubjectToDB({ name, code = '', course_name = '' }) {
  const newSubject = { name: name.trim(), code: code.trim(), course_name: course_name.trim(), created_at: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from('subjects').insert([newSubject]).select();
    if (error) {
      const localId = 'subject-' + Date.now();
      const record = { ...newSubject, id: localId, _isLocalOnly: true };
      const current = getLocalSubjects();
      saveLocalSubjects([record, ...current]);
      return { data: record, error: null, savedLocally: true };
    }
    const current = getLocalSubjects();
    saveLocalSubjects([data[0], ...current]);
    return { data: data[0], error: null, savedLocally: false };
  } catch (err) {
    const localId = 'subject-' + Date.now();
    const record = { ...newSubject, id: localId, _isLocalOnly: true };
    const current = getLocalSubjects();
    saveLocalSubjects([record, ...current]);
    return { data: record, error: null, savedLocally: true };
  }
}

export async function deleteSubjectFromDB(id) {
  try {
    await supabase.from('subjects').delete().eq('id', id);
    const current = getLocalSubjects();
    saveLocalSubjects(current.filter((s) => s.id !== id));
    return { success: true };
  } catch (err) {
    const current = getLocalSubjects();
    saveLocalSubjects(current.filter((s) => s.id !== id));
    return { success: true };
  }
}

/* ==========================================================================
   STAFF USERS & ROLES HELPERS (SUPABASE AUTH INTEGRATION)
   ========================================================================== */

export function getLocalStaffUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(DEFAULT_STAFF_USERS));
      return DEFAULT_STAFF_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_STAFF_USERS;
  }
}

export function saveLocalStaffUsers(staff) {
  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staff));
  } catch (err) {
    console.error('Failed to save staff users', err);
  }
}

export async function fetchStaffUsersFromDB() {
  try {
    const { data, error } = await supabase.from('staff_users').select('*').order('created_at', { ascending: false });
    if (error) {
      return { data: getLocalStaffUsers(), error: error.message, isUsingLocal: true };
    }
    if (data && data.length > 0) {
      saveLocalStaffUsers(data);
      return { data, error: null, isUsingLocal: false };
    }
    return { data: getLocalStaffUsers(), error: null, isUsingLocal: true };
  } catch (err) {
    return { data: getLocalStaffUsers(), error: err.message, isUsingLocal: true };
  }
}

export async function addStaffUserToDB({
  name,
  username,
  password,
  role = 'attendance_staff',
  assigned_subjects = [],
  assigned_subject = ''
}) {
  const cleanName = name.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Normalize assigned_subjects array
  let subjectsList = Array.isArray(assigned_subjects) ? assigned_subjects : [];
  if (subjectsList.length === 0 && assigned_subject) {
    subjectsList = [assigned_subject];
  }

  // Ensure valid email format for Supabase Auth
  const cleanEmail = cleanUsername.includes('@')
    ? cleanUsername
    : `${cleanUsername}@gmail.com`;

  const newStaff = {
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password: cleanPassword,
    role,
    assigned_subjects: subjectsList,
    assigned_subject: subjectsList[0] || '',
    created_at: new Date().toISOString()
  };

  let savedInSupabaseAuth = false;
  let authErrorMsg = null;

  // 1. Try regular Supabase Auth signup first
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          name: cleanName,
          username: cleanUsername,
          role: role,
          assigned_subjects: subjectsList
        }
      }
    });

    if (!authError && authData?.user) {
      savedInSupabaseAuth = true;
      console.log('Supabase Auth signUp succeeded! User ID:', authData.user.id);
    } else if (authError) {
      console.warn('Supabase Auth signUp error:', authError);
      if (authError.message.includes('rate limit')) {
        authErrorMsg = 'Supabase email rate limit reached. In Supabase Dashboard -> Auth Providers, turn OFF "Confirm email" so emails do not get sent.';
      } else if (authError.message.includes('invalid')) {
        authErrorMsg = 'Invalid email domain. Please enter a valid email like staff@gmail.com.';
      } else {
        authErrorMsg = authError.message;
      }
    }
  } catch (signUpErr) {
    authErrorMsg = signUpErr.message;
    console.warn('Supabase Auth client signup failed:', signUpErr.message);
  }

  // 2. Try PostgreSQL RPC create_staff_user as backup
  if (!savedInSupabaseAuth) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_staff_user', {
        staff_name: cleanName,
        staff_username: cleanUsername,
        staff_email: cleanEmail,
        staff_password: cleanPassword,
        staff_role: role
      });

      if (!rpcError && rpcData?.success) {
        savedInSupabaseAuth = true;
        authErrorMsg = null;
      }
    } catch (rpcErr) {
      console.warn('RPC create_staff_user catch:', rpcErr.message);
    }
  }

  // 3. Insert into public.staff_users table
  try {
    const { data, error } = await supabase.from('staff_users').insert([newStaff]).select();
    if (!error && data && data.length > 0) {
      const record = { ...data[0], savedInSupabaseAuth };
      const current = getLocalStaffUsers();
      saveLocalStaffUsers([record, ...current.filter(s => s.username !== cleanUsername)]);
      return {
        data: record,
        error: authErrorMsg ? `Note for Auth: ${authErrorMsg}` : null,
        savedInSupabaseAuth
      };
    }
  } catch (tblErr) {
    console.warn('Insert to public.staff_users failed:', tblErr.message);
  }

  // 4. Local storage fallback
  const localId = 'staff-' + Date.now();
  const record = { ...newStaff, id: localId, _isLocalOnly: true, savedInSupabaseAuth };
  const current = getLocalStaffUsers();
  if (current.some(s => s.username === cleanUsername)) {
    throw new Error('Staff ID/Username already exists!');
  }
  saveLocalStaffUsers([record, ...current]);
  return {
    data: record,
    error: authErrorMsg ? `Note for Supabase Auth: ${authErrorMsg}` : null,
    savedInSupabaseAuth
  };
}

export async function deleteStaffUserFromDB(id) {
  try {
    await supabase.from('staff_users').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete from staff_users error:', err.message);
  }
  const current = getLocalStaffUsers();
  saveLocalStaffUsers(current.filter((s) => s.id !== id));
  return { success: true };
}

/* ==========================================================================
   ATTENDANCE HELPERS
   ========================================================================== */

export function getLocalAttendance(date, subject = '') {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    if (date) {
      all = all.filter((r) => r.date === date);
    }
    if (subject && subject !== 'ALL') {
      all = all.filter((r) => r.subject === subject);
    }
    return all;
  } catch (err) {
    return [];
  }
}

export function saveLocalAttendance(newRecords) {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    const newKeys = new Set(newRecords.map((r) => `${r.date}_${r.student_id}_${r.subject || ''}`));
    all = all.filter((r) => !newKeys.has(`${r.date}_${r.student_id}_${r.subject || ''}`));
    all.push(...newRecords);
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save attendance locally', err);
  }
}

export async function fetchAttendanceFromDB(date, course = '', subject = '') {
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
      return { data: getLocalAttendance(date, subject), error: error.message, isUsingLocal: true };
    }
    return { data: data || [], error: null, isUsingLocal: false };
  } catch (err) {
    return { data: getLocalAttendance(date, subject), error: err.message, isUsingLocal: true };
  }
}

/**
 * Fetch attendance across a date range for Admin Reports & Export
 */
export async function fetchAttendanceRangeFromDB(startDate, endDate, course = 'ALL', subject = 'ALL') {
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
      const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
      let all = raw ? JSON.parse(raw) : [];
      let filtered = all.filter((r) => r.date >= startDate && r.date <= endDate);
      if (course && course !== 'ALL') filtered = filtered.filter((r) => r.course === course);
      if (subject && subject !== 'ALL') filtered = filtered.filter((r) => r.subject === subject);
      return { data: filtered, error: error.message, isUsingLocal: true };
    }
    return { data: data || [], error: null, isUsingLocal: false };
  } catch (err) {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    let filtered = all.filter((r) => r.date >= startDate && r.date <= endDate);
    if (course && course !== 'ALL') filtered = filtered.filter((r) => r.course === course);
    if (subject && subject !== 'ALL') filtered = filtered.filter((r) => r.subject === subject);
    return { data: filtered, error: err.message, isUsingLocal: true };
  }
}

export async function saveAttendanceToDB(records) {
  if (!records || records.length === 0) return { success: true };

  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(records, { onConflict: 'date,student_id,subject' })
      .select();

    if (error) {
      saveLocalAttendance(records);
      return { success: true, savedLocally: true };
    }

    saveLocalAttendance(records);
    return { success: true, savedLocally: false };
  } catch (err) {
    saveLocalAttendance(records);
    return { success: true, savedLocally: true };
  }
}

/* ==========================================================================
   LEADERBOARD & PERFORMANCE SCORES HELPERS
   ========================================================================== */

export const LOCAL_LEADERBOARD_KEY = 'gse_leaderboard_scores_v1';

/**
 * Fetch all attendance records across all dates to compute live scores
 */
export async function fetchAllAttendanceRecords() {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      return data;
    }
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

/**
 * Calculate scores based on:
 * - Attendance (Present = +10 pts)
 * - Timing (On Time = +5 pts, Late = +2 pts)
 * - Grooming (Well Groomed = +5 pts, Not Groomed = 0 pts)
 */
export function computeLeaderboardScores(students = [], attendanceRecords = []) {
  if (!students || students.length === 0) return [];

  // Group attendance records by student_id
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
      const isPresent = rec.status === 'present' || rec.status === 'late';
      if (isPresent) {
        present_count++;
        if (rec.timing === 'late' || rec.status === 'late') {
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

    // Score Formula:
    // Present = 10 pts, On Time = 5 pts, Late = 2 pts, Well Groomed = 5 pts
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

  // Sort by total_score desc, then attendance_percentage desc
  scores.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return b.attendance_percentage - a.attendance_percentage;
  });

  // Assign ranks
  scores.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scores;
}

/**
 * Sync computed scores into Supabase leaderboard_scores table and localStorage
 */
export async function syncLeaderboardToDB(scores) {
  if (!scores || scores.length === 0) return { success: true };

  try {
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(scores));
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .upsert(scores, { onConflict: 'student_id' })
      .select();

    if (error) {
      console.warn('Leaderboard DB sync warning:', error.message);
      return { success: true, savedLocally: true };
    }
    return { success: true, savedLocally: false };
  } catch (err) {
    console.warn('Leaderboard DB sync error:', err.message);
    return { success: true, savedLocally: true };
  }
}

/**
 * Fetch leaderboard from DB or compute from all records
 */
export async function fetchLeaderboardFromDB(students = []) {
  try {
    // 1. Try fetching from leaderboard_scores table
    const { data, error } = await supabase
      .from('leaderboard_scores')
      .select('*')
      .order('rank', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(data));
      return { data, isUsingLocal: false };
    }

    // 2. If table empty or error, compute fresh from attendance_records
    const allRecords = await fetchAllAttendanceRecords();
    const computed = computeLeaderboardScores(students, allRecords);
    await syncLeaderboardToDB(computed);
    return { data: computed, isUsingLocal: true };
  } catch (err) {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    const cached = raw ? JSON.parse(raw) : [];
    if (cached.length > 0) return { data: cached, isUsingLocal: true };

    const allRecords = await fetchAllAttendanceRecords();
    const computed = computeLeaderboardScores(students, allRecords);
    return { data: computed, isUsingLocal: true };
  }
}
