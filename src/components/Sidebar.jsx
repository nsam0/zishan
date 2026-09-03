import React from 'react';
import {
  CalendarCheck,
  Trophy,
  Users,
  BookOpen,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  dbStatus,
  onOpenSqlModal,
  currentUser
}) {
  const isAdmin = currentUser?.role === 'admin';

  // Role-based menu items
  const menuItems = isAdmin
    ? [
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'courses_subjects', label: 'Courses & Subjects', icon: BookOpen },
        { id: 'staff_roles', label: 'Staff & Roles', icon: Shield },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      ]
    : [
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck, isRestrictedStaffHome: true },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 z-20 w-64 h-[calc(100vh-4rem)] bg-white md:bg-transparent border-r md:border-r-0 border-slate-200 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } p-4 sm:p-5 flex flex-col justify-between shrink-0`}
      >
        <div>
          {/* Menu Title */}
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              MENU
            </span>
            {isAdmin && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                ADMIN
              </span>
            )}
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
