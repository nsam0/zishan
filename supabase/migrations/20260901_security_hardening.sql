-- =============================================================================
-- MIGRATION: 20260901_security_hardening.sql
-- DESCRIPTION: P0/P1 Security Remediation & Least-Privilege RLS Hardening
-- AUTHOR: Global Skill Education Engineering Team
-- COMPATIBILITY: PostgreSQL 14+ / Supabase
--
-- BEFORE RUNNING:
-- 1. Backup your existing database via Supabase Dashboard -> Database -> Backups.
-- 2. Run this migration in Supabase Dashboard -> SQL Editor.
-- 3. Complete the ONE-TIME ADMIN BOOTSTRAP STEP at the bottom with your Auth User UUID.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: REVOKE PUBLIC / ANONYMOUS ACCESS (FAIL CLOSED)
-- -----------------------------------------------------------------------------

-- Revoke all table, sequence, and routine privileges from anonymous users
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Explicitly allow authenticated users only schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- -----------------------------------------------------------------------------
-- SECTION 2: REMOVE DANGEROUS PUBLIC RPC (CRITICAL P0)
-- -----------------------------------------------------------------------------

-- Drop public create_staff_user RPC that allowed arbitrary auth.users creation
DROP FUNCTION IF EXISTS public.create_staff_user(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_staff_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.create_staff_user;

-- -----------------------------------------------------------------------------
-- SECTION 3: PROFILES & RBAC TABLES
-- -----------------------------------------------------------------------------

-- Profiles table strictly linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'attendance_staff' CHECK (role IN ('admin', 'attendance_staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Subject Assignments (Many-to-Many: Staff Member -> Subject Access)
CREATE TABLE IF NOT EXISTS public.staff_subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_staff_subject UNIQUE (staff_id, subject_name)
);

-- -----------------------------------------------------------------------------
-- SECTION 4: REMOVE PLAINTEXT PASSWORDS & MIGRATE LEGACY STAFF
-- -----------------------------------------------------------------------------

-- Remove plaintext password column from legacy staff_users table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_users' 
          AND column_name = 'password'
    ) THEN
        ALTER TABLE public.staff_users DROP COLUMN password;
    END IF;
END $$;

-- Migrate legacy staff_users into profiles if corresponding auth.users exist
INSERT INTO public.profiles (id, email, full_name, role)
SELECT su.id, su.email, su.name, su.role
FROM public.staff_users su
INNER JOIN auth.users au ON au.id = su.id
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- SECTION 5: SECURITY DEFINER RBAC HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Check if current authenticated user is attendance staff
CREATE OR REPLACE FUNCTION public.is_attendance_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'attendance_staff'
  );
$$;

-- Check if current authenticated staff has access to a specific subject
CREATE OR REPLACE FUNCTION public.staff_has_subject_access(subj text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_subject_assignments
    WHERE staff_id = auth.uid() AND subject_name = subj
  );
$$;

-- Restrict function execution strictly to authenticated users
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_attendance_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_attendance_staff() TO authenticated;

REVOKE ALL ON FUNCTION public.staff_has_subject_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_has_subject_access(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- SECTION 6: DATA ISOLATION - NARROW SECURE VIEW FOR STAFF
-- -----------------------------------------------------------------------------

-- Expose only non-sensitive student fields (excludes father_name / guardian data)
CREATE OR REPLACE VIEW public.staff_students_view WITH (security_invoker = false) AS
    SELECT 
        id, 
        name, 
        roll_number, 
        course, 
        created_at 
    FROM public.students;

REVOKE ALL ON public.staff_students_view FROM anon;
GRANT SELECT ON public.staff_students_view TO authenticated;

-- -----------------------------------------------------------------------------
-- SECTION 7: INPUT CONSTRAINTS & INTEGRITY CHECKS
-- -----------------------------------------------------------------------------

-- Attendance constraints
DO $$
BEGIN
    ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_status;
    ALTER TABLE public.attendance_records ADD CONSTRAINT check_attendance_status 
        CHECK (status IN ('present', 'absent'));

    ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_timing;
    ALTER TABLE public.attendance_records ADD CONSTRAINT check_attendance_timing 
        CHECK (timing IN ('on_time', 'late', 'n/a'));

    ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_grooming;
    ALTER TABLE public.attendance_records ADD CONSTRAINT check_attendance_grooming 
        CHECK (grooming IN ('well_groomed', 'not_groomed', 'n/a'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- SECTION 8: LEAST-PRIVILEGE ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Grant required table operations to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_subject_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_scores TO authenticated;

-- Drop all previous insecure wildcard policies
DROP POLICY IF EXISTS "Allow public all access" ON public.students;
DROP POLICY IF EXISTS "Allow public all access on courses" ON public.courses;
DROP POLICY IF EXISTS "Allow public all access on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow public all access on staff_users" ON public.staff_users;
DROP POLICY IF EXISTS "Allow public all access on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public all access on leaderboard_scores" ON public.leaderboard_scores;

-- 8.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())))
    WITH CHECK (public.is_admin() OR (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())));

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.2 STAFF SUBJECT ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "staff_subj_select_policy" ON public.staff_subject_assignments;
CREATE POLICY "staff_subj_select_policy" ON public.staff_subject_assignments
    FOR SELECT TO authenticated
    USING (public.is_admin() OR staff_id = auth.uid());

DROP POLICY IF EXISTS "staff_subj_insert_policy" ON public.staff_subject_assignments;
CREATE POLICY "staff_subj_insert_policy" ON public.staff_subject_assignments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "staff_subj_update_policy" ON public.staff_subject_assignments;
CREATE POLICY "staff_subj_update_policy" ON public.staff_subject_assignments
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "staff_subj_delete_policy" ON public.staff_subject_assignments;
CREATE POLICY "staff_subj_delete_policy" ON public.staff_subject_assignments
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.3 STUDENTS TABLE POLICIES (Admin Only - Staff uses staff_students_view)
DROP POLICY IF EXISTS "students_admin_select" ON public.students;
CREATE POLICY "students_admin_select" ON public.students
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "students_admin_insert" ON public.students;
CREATE POLICY "students_admin_insert" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "students_admin_update" ON public.students;
CREATE POLICY "students_admin_update" ON public.students
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "students_admin_delete" ON public.students;
CREATE POLICY "students_admin_delete" ON public.students
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.4 COURSES POLICIES
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy" ON public.courses
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_attendance_staff());

DROP POLICY IF EXISTS "courses_insert_policy" ON public.courses;
CREATE POLICY "courses_insert_policy" ON public.courses
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses_update_policy" ON public.courses;
CREATE POLICY "courses_update_policy" ON public.courses
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses_delete_policy" ON public.courses;
CREATE POLICY "courses_delete_policy" ON public.courses
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.5 SUBJECTS POLICIES
DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
CREATE POLICY "subjects_select_policy" ON public.subjects
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_attendance_staff());

DROP POLICY IF EXISTS "subjects_insert_policy" ON public.subjects;
CREATE POLICY "subjects_insert_policy" ON public.subjects
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_update_policy" ON public.subjects;
CREATE POLICY "subjects_update_policy" ON public.subjects
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_delete_policy" ON public.subjects;
CREATE POLICY "subjects_delete_policy" ON public.subjects
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.6 ATTENDANCE RECORDS POLICIES (Subject-Locked per Staff)
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance_records;
CREATE POLICY "attendance_select_policy" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR 
        (public.is_attendance_staff() AND public.staff_has_subject_access(subject))
    );

DROP POLICY IF EXISTS "attendance_insert_policy" ON public.attendance_records;
CREATE POLICY "attendance_insert_policy" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin() OR 
        (public.is_attendance_staff() AND public.staff_has_subject_access(subject))
    );

DROP POLICY IF EXISTS "attendance_update_policy" ON public.attendance_records;
CREATE POLICY "attendance_update_policy" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (
        public.is_admin() OR 
        (public.is_attendance_staff() AND public.staff_has_subject_access(subject))
    )
    WITH CHECK (
        public.is_admin() OR 
        (public.is_attendance_staff() AND public.staff_has_subject_access(subject))
    );

DROP POLICY IF EXISTS "attendance_delete_policy" ON public.attendance_records;
CREATE POLICY "attendance_delete_policy" ON public.attendance_records
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.7 LEADERBOARD POLICIES
DROP POLICY IF EXISTS "leaderboard_select_policy" ON public.leaderboard_scores;
CREATE POLICY "leaderboard_select_policy" ON public.leaderboard_scores
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_attendance_staff());

DROP POLICY IF EXISTS "leaderboard_insert_policy" ON public.leaderboard_scores;
CREATE POLICY "leaderboard_insert_policy" ON public.leaderboard_scores
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "leaderboard_update_policy" ON public.leaderboard_scores;
CREATE POLICY "leaderboard_update_policy" ON public.leaderboard_scores
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "leaderboard_delete_policy" ON public.leaderboard_scores;
CREATE POLICY "leaderboard_delete_policy" ON public.leaderboard_scores
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- SECTION 9: ONE-TIME ADMIN BOOTSTRAP STEP
-- =============================================================================
-- INSTRUCTIONS:
-- 1. Create your Admin user in Supabase Dashboard -> Authentication -> Users.
-- 2. Copy the newly created user's UUID.
-- 3. Replace '00000000-0000-0000-0000-000000000000' below with your UUID.
-- 4. Uncomment and run the query below in SQL Editor:

/*
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'zishan@gmail.com',
    'Admin Zishan',
    'admin'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
*/

-- =============================================================================
-- ROLLBACK NOTES (DISASTER RECOVERY):
-- To revert least-privilege RLS back to development mode:
-- 1. DROP POLICY IF EXISTS "students_admin_select" ON public.students;
--    CREATE POLICY "Allow public all access" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
-- 2. Repeat for courses, subjects, attendance_records, leaderboard_scores.
-- 3. GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
-- =============================================================================
