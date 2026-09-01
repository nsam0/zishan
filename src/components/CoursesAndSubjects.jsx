import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Trash2,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  Sparkles,
  FileText,
  Tag
} from 'lucide-react';
import {
  addCourseToDB,
  deleteCourseFromDB,
  addSubjectToDB,
  deleteSubjectFromDB
} from '../lib/supabase';

export default function CoursesAndSubjects({
  courses,
  subjects,
  students,
  onCourseAdded,
  onCourseDeleted,
  onSubjectAdded,
  onSubjectDeleted,
  onSwitchToStudents
}) {
  // Course form state
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  // Subject form state
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectCourse, setSubjectCourse] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [subjectMsg, setSubjectMsg] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  // Filter courses
  const filteredCourses = courses.filter((c) =>
    (c.name || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Filter subjects
  const filteredSubjects = subjects.filter((s) =>
    (s.name || '').toLowerCase().includes(subjectSearch.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(subjectSearch.toLowerCase()) ||
    (s.course_name || '').toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // Count enrolled students per course
  const getEnrollmentCount = (courseTitle) => {
    return students.filter(
      (s) => (s.course || '').trim().toLowerCase() === (courseTitle || '').trim().toLowerCase()
    ).length;
  };

  // Add Course Handler
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setCourseMsg({ type: 'error', text: 'Course name is required!' });
      return;
    }

    setIsSubmittingCourse(true);
    setCourseMsg(null);

    try {
      const result = await addCourseToDB({
        name: courseName.trim(),
        description: courseDesc.trim()
      });

      if (result.error || !result.success) {
        setCourseMsg({ type: 'error', text: result.error || 'Failed to add course.' });
        return;
      }

      setCourseMsg({
        type: 'success',
        text: `Course "${courseName}" added successfully!`
      });

      setCourseName('');
      setCourseDesc('');

      if (onCourseAdded) {
        onCourseAdded(result.data);
      }
    } catch (err) {
      setCourseMsg({ type: 'error', text: err.message || 'Failed to add course' });
    } finally {
      setIsSubmittingCourse(false);
      setTimeout(() => {
        setCourseMsg((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    }
  };

  // Delete Course Handler
  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    setIsDeletingCourse(true);
    try {
      const res = await deleteCourseFromDB(deletingCourse.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete course.');
      }
      if (onCourseDeleted) {
        onCourseDeleted(deletingCourse.id);
      }
      setDeletingCourse(null);
    } catch (err) {
      alert('Error deleting course: ' + err.message);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  // Add Subject Handler
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setSubjectMsg({ type: 'error', text: 'Subject name is required!' });
      return;
    }

    setIsSubmittingSubject(true);
    setSubjectMsg(null);

    try {
      const result = await addSubjectToDB({
        name: subjectName.trim(),
        code: subjectCode.trim(),
        course_name: subjectCourse.trim()
      });

      if (result.error || !result.success) {
        setSubjectMsg({ type: 'error', text: result.error || 'Failed to add subject.' });
        return;
      }

      setSubjectMsg({
        type: 'success',
        text: `Subject "${subjectName}" added successfully!`
      });

      setSubjectName('');
      setSubjectCode('');
      setSubjectCourse('');

      if (onSubjectAdded) {
        onSubjectAdded(result.data);
      }
    } catch (err) {
      setSubjectMsg({ type: 'error', text: err.message || 'Failed to add subject' });
    } finally {
      setIsSubmittingSubject(false);
      setTimeout(() => {
        setSubjectMsg((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    }
  };

  // Delete Subject Handler
  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    setIsDeletingSubject(true);
    try {
      const res = await deleteSubjectFromDB(deletingSubject.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete subject.');
      }
      if (onSubjectDeleted) {
        onSubjectDeleted(deletingSubject.id);
      }
      setDeletingSubject(null);
    } catch (err) {
      alert('Error deleting subject: ' + err.message);
    } finally {
      setIsDeletingSubject(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Stats & Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Courses & Subjects
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your academic courses and subject curriculum in one place
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {courses.length} Courses
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {subjects.length} Subjects
          </span>
          <button
            type="button"
            onClick={onSwitchToStudents}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Students</span>
          </button>
        </div>
      </div>

      {/* Two Main Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* CARD 1: COURSES CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col">
          
          {/* Card Header */}
          <div className="pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Courses</h2>
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Shows in Student Form
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Courses added here appear in student registration dropdown
            </p>
          </div>

          {/* Add Course Form */}
          <form onSubmit={handleAddCourse} className="space-y-3 pb-5 border-b border-slate-100">
            {courseMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  courseMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {courseMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium flex-1">{courseMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Course Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Diploma in Hotel Management"
                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Description / Duration <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="e.g. 1 Year Certification"
                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingCourse}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmittingCourse ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              <span>Add Course</span>
            </button>
          </form>

          {/* Courses Search & List */}
          <div className="pt-4">
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredCourses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  No courses found. Add one above.
                </div>
              ) : (
                filteredCourses.map((c) => {
                  const enrolled = getEnrollmentCount(c.name);
                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                          {c.name}
                        </div>
                        {c.description && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {c.description}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {enrolled} {enrolled === 1 ? 'student' : 'students'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeletingCourse(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* CARD 2: SUBJECTS CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col">
          
          {/* Card Header */}
          <div className="pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Subjects</h2>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                Curriculum Setup
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add subjects for syllabus and grading (details can be configured anytime)
            </p>
          </div>

          {/* Add Subject Form */}
          <form onSubmit={handleAddSubject} className="space-y-3 pb-5 border-b border-slate-100">
            {subjectMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  subjectMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {subjectMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium flex-1">{subjectMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Subject Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Food & Beverage Service"
                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Subject Code <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. FBS-101"
                  className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Related Course <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={subjectCourse}
                  onChange={(e) => setSubjectCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="">None / General</option>
                  {courses.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingSubject}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmittingSubject ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              <span>Add Subject</span>
            </button>
          </form>

          {/* Subjects Search & List */}
          <div className="pt-4">
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredSubjects.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  No subjects found. Add one above.
                </div>
              ) : (
                filteredSubjects.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                          {s.name}
                        </span>
                        {s.code && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {s.code}
                          </span>
                        )}
                      </div>
                      {s.course_name && (
                        <div className="text-[11px] text-emerald-700 font-medium truncate mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-500" />
                          <span>{s.course_name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeletingSubject(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Delete Course Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Course?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingCourse.name}"</span>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={handleDeleteCourse}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeletingCourse ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Subject?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deletingSubject.name}"</span>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSubject}
                onClick={handleDeleteSubject}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeletingSubject ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
