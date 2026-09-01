import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AddStudentForm from './components/AddStudentForm';
import StudentDirectory from './components/StudentDirectory';
import CoursesAndSubjects from './components/CoursesAndSubjects';
import AttendanceModule from './components/AttendanceModule';
import StaffRolesManagement from './components/StaffRolesManagement';
import LeaderboardModule from './components/LeaderboardModule';
import LoginModal from './components/LoginModal';
import SqlSetupModal from './components/SqlSetupModal';
import { useAuth } from './context/AuthContext';
import {
  fetchStudentsFromDB,
  fetchCoursesFromDB,
  fetchSubjectsFromDB,
  fetchStaffUsersFromDB
} from './lib/supabase';
import { Lock, Loader2 } from 'lucide-react';

export default function App() {
  const { session, user, profile, isAdmin, isStaff, assignedSubjects, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({
    isConnected: true,
    isTableMissing: false,
    isOffline: false,
    isUsingLocal: false
  });

  // Keep staff locked onto attendance or leaderboard
  useEffect(() => {
    if (session) {
      if (isAdmin) {
        // Admin default to students if first time
        setActiveTab((prev) => (prev === 'attendance' ? 'students' : prev));
      } else {
        // Staff locked to attendance or leaderboard
        if (activeTab !== 'attendance' && activeTab !== 'leaderboard') {
          setActiveTab('attendance');
        }
      }
    }
  }, [isAdmin, session]);

  // Load verified data from Supabase
  const loadData = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const userRole = isAdmin ? 'admin' : 'attendance_staff';

      // Staff queries staff_students_view, Admin queries students
      const [studentsRes, coursesRes, subjectsRes, staffRes] = await Promise.all([
        fetchStudentsFromDB(userRole),
        fetchCoursesFromDB(),
        fetchSubjectsFromDB(),
        isAdmin ? fetchStaffUsersFromDB() : Promise.resolve({ data: [], error: null })
      ]);

      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setStaffUsers(staffRes.data || []);

      setDbStatus({
        isConnected: !studentsRes.error,
        isTableMissing: false,
        isOffline: !navigator.onLine,
        isUsingLocal: false
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  // Student Actions
  const handleStudentAdded = (newStudent) => {
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleStudentUpdated = (updatedStudent) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleStudentDeleted = (deletedId) => {
    setStudents((prev) => prev.filter((s) => s.id !== deletedId));
  };

  // Course Actions
  const handleCourseAdded = (newCourse) => {
    setCourses((prev) => [newCourse, ...prev.filter((c) => c.name !== newCourse.name)]);
  };

  const handleCourseDeleted = (deletedId) => {
    setCourses((prev) => prev.filter((c) => c.id !== deletedId));
  };

  // Subject Actions
  const handleSubjectAdded = (newSubject) => {
    setSubjects((prev) => [newSubject, ...prev.filter((s) => s.id !== newSubject.id)]);
  };

  const handleSubjectDeleted = (deletedId) => {
    setSubjects((prev) => prev.filter((s) => s.id !== deletedId));
  };

  // Staff Actions
  const handleStaffAdded = (newStaff) => {
    setStaffUsers((prev) => [newStaff, ...prev.filter((s) => s.id !== newStaff.id)]);
  };

  const handleStaffDeleted = (deletedId) => {
    setStaffUsers((prev) => prev.filter((s) => s.id !== deletedId));
  };

  // 1. Loading screen while checking auth session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Verifying secure session...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to Global Skill Education Portal</p>
      </div>
    );
  }

  // 2. Unauthenticated Gate: User must sign in
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900/10 flex items-center justify-center p-4">
        <LoginModal isOpen={true} isGateMode={true} />
      </div>
    );
  }

  const currentUser = {
    id: user?.id,
    email: user?.email,
    name: profile?.full_name || user?.email,
    username: user?.email,
    role: profile?.role || 'attendance_staff',
    assigned_subjects: assignedSubjects,
    assigned_subject: assignedSubjects[0] || ''
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        onOpenLoginModal={() => setIsSwitchUserModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          dbStatus={dbStatus}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
          currentUser={currentUser}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          
          {/* 1. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <AttendanceModule
              students={students}
              courses={courses}
              subjects={subjects}
              currentUser={currentUser}
            />
          )}

          {/* 2. STUDENTS TAB (Admin Only) */}
          {activeTab === 'students' && (
            isAdmin ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Add Student Form */}
                <div className="lg:col-span-5">
                  <AddStudentForm
                    courses={courses}
                    onStudentAdded={handleStudentAdded}
                    onNavigateToCourses={() => setActiveTab('courses_subjects')}
                  />
                </div>

                {/* Right Column: Student Directory */}
                <div className="lg:col-span-7">
                  <StudentDirectory
                    students={students}
                    courses={courses}
                    isLoading={isLoading}
                    onRefresh={loadData}
                    onStudentUpdated={handleStudentUpdated}
                    onStudentDeleted={handleStudentDeleted}
                    dbStatus={dbStatus}
                    onOpenSqlModal={() => setIsSqlModalOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <AccessRestrictedCard onGoToAttendance={() => setActiveTab('attendance')} />
            )
          )}

          {/* 3. COURSES & SUBJECTS TAB (Admin Only) */}
          {activeTab === 'courses_subjects' && (
            isAdmin ? (
              <CoursesAndSubjects
                courses={courses}
                subjects={subjects}
                students={students}
                onCourseAdded={handleCourseAdded}
                onCourseDeleted={handleCourseDeleted}
                onSubjectAdded={handleSubjectAdded}
                onSubjectDeleted={handleSubjectDeleted}
                onSwitchToStudents={() => setActiveTab('students')}
              />
            ) : (
              <AccessRestrictedCard onGoToAttendance={() => setActiveTab('attendance')} />
            )
          )}

          {/* 4. STAFF & ROLES TAB (Admin Only) */}
          {activeTab === 'staff_roles' && (
            isAdmin ? (
              <StaffRolesManagement
                staffUsers={staffUsers}
                subjects={subjects}
                onStaffAdded={handleStaffAdded}
                onStaffDeleted={handleStaffDeleted}
              />
            ) : (
              <AccessRestrictedCard onGoToAttendance={() => setActiveTab('attendance')} />
            )
          )}

          {/* 5. LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <LeaderboardModule
              students={students}
              courses={courses}
              currentUser={currentUser}
            />
          )}

        </main>

      </div>

      {/* Supabase SQL Setup Modal (Admin Only) */}
      {isAdmin && (
        <SqlSetupModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
          onVerified={() => {
            loadData();
          }}
        />
      )}

      {/* Switch User Modal */}
      <LoginModal
        isOpen={isSwitchUserModalOpen}
        onClose={() => setIsSwitchUserModalOpen(false)}
        isGateMode={false}
      />
    </div>
  );
}

// Fallback card for unauthorized routes
function AccessRestrictedCard({ onGoToAttendance }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto my-12 shadow-xs">
      <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-5">
        Your account role only permits marking student attendance. Please sign in with an Admin account to manage students, courses, or staff roles.
      </p>
      <button
        type="button"
        onClick={onGoToAttendance}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
      >
        Go to Attendance
      </button>
    </div>
  );
}
