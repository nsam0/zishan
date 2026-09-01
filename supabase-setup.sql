-- Global Skill Education: Complete Database & Auth Setup
-- Copy and run this script in Supabase Dashboard -> SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================
-- 1. Students Table
-- ===================================================
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

-- ===================================================
-- 2. Courses Table
-- ===================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on courses" ON public.courses;
CREATE POLICY "Allow public all access on courses" ON public.courses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===================================================
-- 3. Subjects Table
-- ===================================================
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

-- ===================================================
-- 4. Staff Users Table (With Assigned Subjects Array)
-- ===================================================
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

-- ===================================================
-- 5. Attendance Records Table (Subject-Wise, Timing & Grooming)
-- ===================================================
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

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS roll_number TEXT DEFAULT '';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS timing TEXT DEFAULT 'on_time';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS grooming TEXT DEFAULT 'well_groomed';

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow public all access on attendance_records" ON public.attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ===================================================
-- 6. Leaderboard & Student Performance Scores Table
-- ===================================================
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
