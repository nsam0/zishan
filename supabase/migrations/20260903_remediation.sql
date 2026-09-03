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

-- Idempotent view privileges for staff_students_view (preserves postgres/service_role)
REVOKE ALL ON TABLE public.staff_students_view FROM anon;
REVOKE ALL ON TABLE public.staff_students_view FROM authenticated;
GRANT SELECT ON TABLE public.staff_students_view TO authenticated;

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
    'attendance_staff' -- Strict least-privilege: user metadata can NEVER assign admin role
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
