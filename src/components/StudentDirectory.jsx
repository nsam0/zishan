import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Filter,
  Users,
  AlertTriangle,
  X
} from 'lucide-react';
import { updateStudentInDB, deleteStudentFromDB } from '../lib/supabase';

export default function StudentDirectory({
  students,
  courses = [],
  isLoading,
  onRefresh,
  onStudentUpdated,
  onStudentDeleted,
  dbStatus,
  onOpenSqlModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    father_name: '',
    roll_number: '',
    course: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation State
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Merge courses from DB and any courses that might already be in student records
  const allCourseNames = Array.from(
    new Set([
      ...courses.map((c) => c.name),
      ...students.map((s) => s.course).filter(Boolean)
    ])
  );

  // Filter students based on search term and course
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.father_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.course || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse =
      courseFilter === 'ALL' ||
      (courseFilter === 'UNASSIGNED' && !student.course) ||
      student.course === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Open Edit Modal
  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      father_name: student.father_name || '',
      roll_number: student.roll_number || '',
      course: student.course || ''
    });
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) return;

    setIsUpdating(true);
    try {
      const res = await updateStudentInDB(editingStudent.id, editFormData);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update student in database.');
      }
      if (onStudentUpdated) {
        onStudentUpdated({ ...editingStudent, ...editFormData });
      }
      setEditingStudent(null);
    } catch (err) {
      alert('Error updating student: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    try {
      const res = await deleteStudentFromDB(deletingStudent.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete student from database.');
      }
      if (onStudentDeleted) {
        onStudentDeleted(deletingStudent.id);
      }
      setDeletingStudent(null);
    } catch (err) {
      alert('Error deleting student: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 flex flex-col h-full">
      
      {/* Header with Title, Badge, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Directory</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              {students.length} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Edit or delete registered student records
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center self-start sm:self-auto gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Database Warning Banner if Supabase table is missing */}
      {dbStatus.isTableMissing && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Notice:</strong> Supabase table <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">students</code> is pending setup. Using local offline storage.
            </span>
          </div>
          <button
            onClick={onOpenSqlModal}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            Setup Supabase SQL
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-7 lg:col-span-8 relative rounded-xl shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students by name, roll no..."
            className="block w-full pl-10 pr-3.5 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Course Filter Dropdown */}
        <div className="sm:col-span-5 lg:col-span-4 relative rounded-xl shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="block w-full pl-9 pr-8 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
          >
            <option value="ALL">All Courses</option>
            <option value="UNASSIGNED">No Course (Blank)</option>
            {allCourseNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        </div>
      </div>

      {/* Directory Content List/Table */}
      <div className="mt-5 flex-1 overflow-hidden flex flex-col">
        {isLoading && students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading student directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl my-auto">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {students.length === 0 ? 'No students registered yet' : 'No students match your search'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {students.length === 0
                ? 'Fill the form on the left to add your first student record.'
                : 'Try adjusting your search query or course filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3">Student</th>
                  <th scope="col" className="px-4 py-3">Parent / Guardian</th>
                  <th scope="col" className="px-4 py-3">Roll No</th>
                  <th scope="col" className="px-4 py-3">Course</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {student.name}
                          </div>
                          {student.created_at && (
                            <div className="text-[11px] text-slate-400">
                              Added {new Date(student.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Parent Name */}
                    <td className="px-4 py-3.5">
                      {student.father_name ? (
                        <span className="text-slate-700 font-medium">{student.father_name}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not specified</span>
                      )}
                    </td>

                    {/* Roll Number */}
                    <td className="px-4 py-3.5">
                      {student.roll_number ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {student.roll_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3.5">
                      {student.course ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {student.course}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Blank (TBD)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Student Record</h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Parent / Guardian Name
                </label>
                <input
                  type="text"
                  value={editFormData.father_name}
                  onChange={(e) => setEditFormData({ ...editFormData, father_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={editFormData.roll_number}
                  onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Course
                </label>
                <select
                  value={editFormData.course}
                  onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer bg-white"
                >
                  <option value="">Select course (or leave blank)</option>
                  {allCourseNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Student?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingStudent.name}"</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
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
