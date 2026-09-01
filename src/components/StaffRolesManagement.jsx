import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Trash2,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Pencil,
  Check
} from 'lucide-react';
import { addStaffUserToDB, deleteStaffUserFromDB } from '../lib/supabase';

export default function StaffRolesManagement({
  staffUsers,
  subjects = [],
  onStaffAdded,
  onStaffDeleted
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isSubjectSelectionDone, setIsSubjectSelectionDone] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSubject = (subName) => {
    setSelectedSubjects((prev) =>
      prev.includes(subName)
        ? prev.filter((s) => s !== subName)
        : [...prev, subName]
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(subjects.map((s) => s.name));
  };

  const handleClearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      setMessage({ type: 'error', text: 'All fields (Full Name, ID/Email, Password) are required!' });
      return;
    }

    if (selectedSubjects.length === 0) {
      setMessage({
        type: 'error',
        text: 'Please select and confirm at least 1 subject to grant attendance access!'
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await addStaffUserToDB({
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        role: 'attendance_staff',
        assigned_subjects: selectedSubjects,
        assigned_subject: selectedSubjects[0]
      });

      if (result.savedInSupabaseAuth) {
        setMessage({
          type: 'success',
          text: `Staff "${name}" registered in Supabase Auth with access to ${selectedSubjects.length} subject(s)!`
        });
      } else if (result.error) {
        setMessage({
          type: 'warning',
          text: `${result.error}. (Staff was saved locally). In Supabase Auth, turn OFF "Confirm email" for immediate login!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Staff account "${name}" created with ${selectedSubjects.length} subject(s) assigned!`
        });
      }

      setName('');
      setUsername('');
      setPassword('');
      setSelectedSubjects([]);
      setIsSubjectSelectionDone(false);

      if (onStaffAdded) {
        onStaffAdded(result.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create staff account' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setMessage((prev) => (prev?.type === 'success' ? null : prev));
      }, 7000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await deleteStaffUserFromDB(deletingUser.id);
      if (onStaffDeleted) {
        onStaffDeleted(deletingUser.id);
      }
      setDeletingUser(null);
    } catch (err) {
      alert('Error deleting staff: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Staff & Attendance Roles
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assign credentials to staff members and grant attendance access for <strong>one or more specific subjects</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {staffUsers.length} Staff Accounts
          </span>
        </div>
      </div>

      {/* 2 Column Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Card: Create Staff Account */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Assign Staff Credentials</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <strong className="text-purple-700">Attendance Staff</strong>
            </p>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium flex-1">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-4">
            {/* Staff Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Staff Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            {/* Username / Staff ID */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Staff ID / Login Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rahul@gmail.com or staff1"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPasswords['new_user'] ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. Pass@123"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new_user')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasswords['new_user'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* MULTI-SELECT SUBJECT ACCESS WITH DONE / EDIT WORKFLOW */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Assign Subject Permissions <span className="text-rose-500">*</span>
                </label>
                
                {/* Select All / Clear (Visible only when editing) */}
                {!isSubjectSelectionDone && subjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSubjects}
                      className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllSubjects}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {subjects.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  No subjects created yet. Please create subjects in <strong>Courses & Subjects</strong> tab first!
                </div>
              ) : isSubjectSelectionDone ? (
                /* CONFIRMED STATE: Shows review badges and an EDIT button */
                <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>{selectedSubjects.length} Subject(s) Selected & Locked</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSubjectSelectionDone(false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Selection</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-900 text-xs font-medium shadow-2xs"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                /* EDITING STATE: Checkbox list with a DONE button */
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/80">
                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
                    {subjects.map((s) => {
                      const isChecked = selectedSubjects.includes(s.name);
                      return (
                        <label
                          key={s.id || s.name}
                          onClick={() => handleToggleSubject(s.name)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors pt-2 ${
                            isChecked
                              ? 'bg-purple-50 text-purple-950 font-medium'
                              : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by label onClick
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-800">
                                {s.name}
                              </div>
                              {s.course_name && (
                                <div className="text-[10px] text-slate-400">
                                  Course: {s.course_name}
                                </div>
                              )}
                            </div>
                          </div>

                          {s.code && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {s.code}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* DONE BUTTON BAR */}
                  <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Selected: <strong className="text-purple-700">{selectedSubjects.length}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={selectedSubjects.length === 0}
                      onClick={() => setIsSubjectSelectionDone(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-1">
                Tick the subjects then click <strong>"Done"</strong>. You can click <strong>"Edit Selection"</strong> anytime to make adjustments.
              </p>
            </div>

            {/* Assigned Role Display */}
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Role: Attendance Staff</strong>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  When logging in, this staff will ONLY see and mark attendance for their authorized subject(s).
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>Create Staff Account</span>
            </button>
          </form>
        </div>

        {/* Right Card: Staff Accounts Directory */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <div className="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Staff Accounts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members and their assigned subject permissions
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              {staffUsers.length} Total
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Staff Details</th>
                  <th className="px-4 py-3">Assigned Subjects</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No staff accounts created yet.
                    </td>
                  </tr>
                ) : (
                  staffUsers.map((user) => {
                    const userSubjects = Array.isArray(user.assigned_subjects) && user.assigned_subjects.length > 0
                      ? user.assigned_subjects
                      : (user.assigned_subject && user.assigned_subject !== 'ALL' ? [user.assigned_subject] : []);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {user.username}
                          </div>
                        </td>

                        {/* Assigned Subjects Badges */}
                        <td className="px-4 py-3.5">
                          {userSubjects.length === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              All Subjects
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {userSubjects.map((sub, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                            <span>
                              {showPasswords[user.id] ? user.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              title="Toggle password view"
                            >
                              {showPasswords[user.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Role Access Security:</strong> When a staff member signs in, their user interface will restrict attendance marking strictly to their assigned subjects.
            </div>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Staff Member?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingUser.name}"</span>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
