# Global Skill Education - Admin Panel (PWA)

A Progressive Web App (PWA) Admin Portal for managing student admissions and records with Supabase.

---

## ⚡ Quick Start

### 1. Run in Development Mode:
```bash
npm run dev
```

### 2. Build for Production:
```bash
npm run build
```

---

## 🗄️ Supabase Database Setup

To sync data with Supabase Cloud, run the following SQL query in your **[Supabase SQL Editor](https://supabase.com/dashboard/project/vznyiuhotopctbssnpjn/sql/new)**:

```sql
-- 1. Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    father_name TEXT,
    roll_number TEXT,
    course TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 3. Secure Least-Privilege RLS Policies
-- Revoke all unauthenticated public access
REVOKE ALL ON public.students FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;

-- Allow authenticated users (Admin and verified Staff) to view students
DROP POLICY IF EXISTS "Allow authenticated read students" ON public.students;
CREATE POLICY "Allow authenticated read students" ON public.students
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow only authorized Administrators to insert, update, or delete students
DROP POLICY IF EXISTS "Allow admin to manage students" ON public.students;
CREATE POLICY "Allow admin to manage students" ON public.students
    FOR ALL
    TO authenticated
    USING (
      auth.jwt() ->> 'email' = 'ansari74108@gmail.com'
      OR EXISTS (
        SELECT 1 FROM public.staff_users
        WHERE staff_users.id = auth.uid() AND staff_users.role = 'admin'
      )
    )
    WITH CHECK (
      auth.jwt() ->> 'email' = 'ansari74108@gmail.com'
      OR EXISTS (
        SELECT 1 FROM public.staff_users
        WHERE staff_users.id = auth.uid() AND staff_users.role = 'admin'
      )
    );
```

> **Note:** The app features automatic offline & local storage fallback. Even if the Supabase table has not been created yet, you can add, edit, search, and delete students locally without any error! Once you run the SQL script in Supabase, click "Test Connection" inside the app to sync.

---

## 📱 PWA Features
- **Installable**: Can be installed on Windows, macOS, Android, and iOS as a standalone app.
- **Offline Ready**: Powered by Service Worker caching.
- **App Icons & Manifest**: Full PWA manifest support with custom theme colors.
