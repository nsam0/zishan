import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AddStudentForm from './components/AddStudentForm';
import StudentDirectory from './components/StudentDirectory';
import CoursesAndSubjects from './components/CoursesAndSubjects';
import AttendanceModule from './components/AttendanceModule';
import StaffRolesManagement from './components/StaffRolesManagement';
import LeaderboardModule from './components/LeaderboardModule';
import SqlSetupModal from './components/SqlSetupModal';
import AdminLoginPage from './pages/AdminLoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import { useAuth } from './context/AuthContext';
import {
  isSupabaseConfigured,
  fetchStudentsFromDB,
  fetchCoursesFromDB,
  fetchSubjectsFromDB,
  fetchStaffUsersFromDB
} from './lib/supabase';
import { Lock, Loader2 } from 'lucide-react';

// ─── URL-based portal detector ─────────────────────────────────
function getPortal() {
  if (typeof window === 'undefined') return 'admin';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/staff')) return 'staff';
  return 'admin';
}

export default function App() {
  const {
    session, user, profile,
    isAdmin, isStaff, assignedSubjects,
    isLoading: authLoading, signOut
  } = useAuth();

  const [portal, setPortal] = useState(getPortal);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const onPop = () => setPortal(getPortal());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── 1. Fail closed — env vars missing ──────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-rose-200 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Database Setup Required</h2>
          <p className="text-xs text-slate-600 mt-2">
            Missing <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono">VITE_SUPABASE_URL</code> or{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono">VITE_SUPABASE_ANON_KEY</code>.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Please configure your <code className="font-mono">.env</code> file or Vercel environment settings.
          </p>
        </div>
      </div>
    );
  }

  // ── 2. Auth loading ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Verifying session...</p>
        <p className="text-xs text-slate-400 mt-1">Global Skill Education Portal</p>
      </div>
    );
  }

  // ── 3. Not logged in → show correct login page ─────────────────
  if (!session) {
    if (portal === 'staff') {
      return <StaffLoginPage onLoginSuccess={() => setPortal('staff')} />;
    }
    return <AdminLoginPage onLoginSuccess={() => setPortal('admin')} />;
  }

  // ── 4. Session exists but profile not yet loaded → wait ────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading profile...</p>
        <p className="text-xs text-slate-400 mt-1">Global Skill Education Portal</p>
      </div>
    );
  }

  // ── 5. Logged in — wrong portal? Sign out ──────────────────────
  if (profile.role === 'attendance_staff' && portal === 'admin') {
    signOut();
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }
  if (profile.role === 'admin' && portal === 'staff') {
    signOut();
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ── 6. Render correct dashboard ────────────────────────────────
  if (isAdmin) return <AdminApp />;
  if (isStaff) return <StaffApp assignedSubjects={assignedSubjects} />;

  // Fallback loading
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN APP — Full access to all features
// ═══════════════════════════════════════════════════════════════
function AdminApp() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState('students');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const dbStatus = { isConnected: true, isTableMissing: false, isOffline: false, isUsingLocal: false };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsRes, coursesRes, subjectsRes, staffRes] = await Promise.all([
        fetchStudentsFromDB('admin'),
        fetchCoursesFromDB(),
        fetchSubjectsFromDB(),
        fetchStaffUsersFromDB()
      ]);
      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setStaffUsers(staffRes.data || []);
    } catch (err) {
      console.error('AdminApp loadData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const currentUser = {
    id: user?.id,
    email: user?.email,
    name: profile?.full_name || user?.email,
    role: 'admin',
    assigned_subjects: [],
    assigned_subject: ''
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        onOpenLoginModal={() => {}}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-6">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          dbStatus={dbStatus}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
          currentUser={currentUser}
        />

        <main className="flex-1 min-w-0">

          {/* ATTENDANCE */}
          {activeTab === 'attendance' && (
            <AttendanceModule
              students={students}
              courses={courses}
              subjects={subjects}
              currentUser={currentUser}
            />
          )}

          {/* STUDENTS */}
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <AddStudentForm
                  courses={courses}
                  onStudentAdded={(s) => setStudents((prev) => [s, ...prev])}
                  onNavigateToCourses={() => setActiveTab('courses_subjects')}
                />
              </div>
              <div className="lg:col-span-7">
                <StudentDirectory
                  students={students}
                  courses={courses}
                  isLoading={isLoading}
                  onRefresh={loadData}
                  onStudentUpdated={(s) =>
                    setStudents((prev) => prev.map((x) => (x.id === s.id ? s : x)))
                  }
                  onStudentDeleted={(id) =>
                    setStudents((prev) => prev.filter((x) => x.id !== id))
                  }
                  dbStatus={dbStatus}
                  onOpenSqlModal={() => setIsSqlModalOpen(true)}
                />
              </div>
            </div>
          )}

          {/* COURSES & SUBJECTS */}
          {activeTab === 'courses_subjects' && (
            <CoursesAndSubjects
              courses={courses}
              subjects={subjects}
              students={students}
              onCourseAdded={(c) =>
                setCourses((prev) => [c, ...prev.filter((x) => x.name !== c.name)])
              }
              onCourseDeleted={(id) =>
                setCourses((prev) => prev.filter((x) => x.id !== id))
              }
              onSubjectAdded={(s) =>
                setSubjects((prev) => [s, ...prev.filter((x) => x.id !== s.id)])
              }
              onSubjectDeleted={(id) =>
                setSubjects((prev) => prev.filter((x) => x.id !== id))
              }
              onSwitchToStudents={() => setActiveTab('students')}
            />
          )}

          {/* STAFF & ROLES */}
          {activeTab === 'staff_roles' && (
            <StaffRolesManagement
              staffUsers={staffUsers}
              subjects={subjects}
              onStaffAdded={(s) =>
                setStaffUsers((prev) => [s, ...prev.filter((x) => x.id !== s.id)])
              }
              onStaffDeleted={(id) =>
                setStaffUsers((prev) => prev.filter((x) => x.id !== id))
              }
            />
          )}

          {/* LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <LeaderboardModule
              students={students}
              courses={courses}
              currentUser={currentUser}
            />
          )}

        </main>
      </div>

      {isSqlModalOpen && (
        <SqlSetupModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
          onVerified={loadData}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STAFF APP — Sirf Attendance + Leaderboard
// ═══════════════════════════════════════════════════════════════
function StaffApp({ assignedSubjects = [] }) {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsRes, coursesRes, subjectsRes] = await Promise.all([
        fetchStudentsFromDB('attendance_staff'),
        fetchCoursesFromDB(),
        fetchSubjectsFromDB()
      ]);
      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);

      // Staff sirf apne assigned subjects ki attendance de sakta hai
      const allSubjects = subjectsRes.data || [];
      const filteredSubjects =
        assignedSubjects.length > 0
          ? allSubjects.filter((s) => assignedSubjects.includes(s.name))
          : [];
      setSubjects(filteredSubjects);
    } catch (err) {
      console.error('StaffApp loadData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [assignedSubjects]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentUser = {
    id: user?.id,
    email: user?.email,
    name: profile?.full_name || user?.email,
    role: 'attendance_staff',
    assigned_subjects: assignedSubjects,
    assigned_subject: assignedSubjects[0] || ''
  };

  const dbStatus = { isConnected: true, isTableMissing: false, isOffline: false, isUsingLocal: false };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        onOpenLoginModal={() => {}}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-6">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          dbStatus={dbStatus}
          onOpenSqlModal={null}
          currentUser={currentUser}
        />

        <main className="flex-1 min-w-0">

          {/* ATTENDANCE — staff sirf apne assigned subjects */}
          {activeTab === 'attendance' && (
            <AttendanceModule
              students={students}
              courses={courses}
              subjects={subjects}
              currentUser={currentUser}
            />
          )}

          {/* LEADERBOARD / RANK PAGE */}
          {activeTab === 'leaderboard' && (
            <LeaderboardModule
              students={students}
              courses={courses}
              currentUser={currentUser}
            />
          )}

        </main>
      </div>
    </div>
  );
}
