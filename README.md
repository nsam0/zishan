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

-- 3. Allow Public/Anon access
DROP POLICY IF EXISTS "Allow public all access" ON public.students;
CREATE POLICY "Allow public all access" ON public.students
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

> **Note:** The app features automatic offline & local storage fallback. Even if the Supabase table has not been created yet, you can add, edit, search, and delete students locally without any error! Once you run the SQL script in Supabase, click "Test Connection" inside the app to sync.

---

## 📱 PWA Features
- **Installable**: Can be installed on Windows, macOS, Android, and iOS as a standalone app.
- **Offline Ready**: Powered by Service Worker caching.
- **App Icons & Manifest**: Full PWA manifest support with custom theme colors.
