-- Global Skill Education: Production Database & Least-Privilege RLS Setup
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
