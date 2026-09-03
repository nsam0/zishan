import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Search,
  Filter,
  CheckCheck,
  RotateCcw,
  Loader2,
  Users,
  AlertCircle,
  BookOpen,
  Lock,
  Download,
  FileSpreadsheet,
  Shirt,
  Sparkles,
  X
} from 'lucide-react';
import {
  fetchAttendanceForDateFromDB,
  fetchAttendanceRangeFromDB,
  saveAttendanceToDB
} from '../lib/supabase';
import { sanitizeCsvCell, getLocalDateString } from '../lib/security';

export default function AttendanceModule({
  students,
  courses,
  subjects = [],
  currentUser
}) {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Determine allowed subjects for the current user
  const allowedSubjects = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin') {
      return null; // Admin has full access to all subjects
    }
    if (Array.isArray(currentUser.assigned_subjects) && currentUser.assigned_subjects.length > 0) {
      return currentUser.assigned_subjects;
    }
    if (currentUser.assigned_subject && currentUser.assigned_subject !== 'ALL') {
      return [currentUser.assigned_subject];
    }
    return []; // Return empty array so unassigned staff cannot access all subjects
  }, [currentUser]);

  // List of subjects available to this user
  const userSubjectsList = useMemo(() => {
    if (!allowedSubjects) {
      return subjects;
    }
    return allowedSubjects.map((subName) => {
      const match = subjects.find((s) => s.name === subName);
      return match || { name: subName, id: subName };
    });
  }, [allowedSubjects, subjects]);

  // Default selected subject (Strictly subject-wise)
  const [selectedSubject, setSelectedSubject] = useState(() => {
    if (allowedSubjects && allowedSubjects.length > 0) {
      return allowedSubjects[0];
    }
    return subjects.length > 0 ? subjects[0].name : 'General';
  });

  const isAdmin = currentUser?.role === 'admin';

  // Keep selectedSubject updated if user or subjects change
  useEffect(() => {
    if (allowedSubjects && allowedSubjects.length > 0) {
      if (!allowedSubjects.includes(selectedSubject)) {
        setSelectedSubject(allowedSubjects[0]);
      }
    } else if (subjects.length > 0 && selectedSubject === 'General') {
      setSelectedSubject(subjects[0].name);
    }
  }, [allowedSubjects, subjects]);

  // Auto-sync class/course to the selected subject's course for teachers
  useEffect(() => {
    if (!isAdmin && selectedSubject) {
      const match = subjects.find((s) => s.name === selectedSubject);
      if (match?.course_name) {
        setSelectedCourse(match.course_name);
      }
    }
  }, [isAdmin, selectedSubject, subjects]);


  // Attendance state: { [student_id]: { status: 'present'|'absent', timing: 'on_time'|'late', grooming: 'well_groomed'|'not_groomed' } }
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Admin Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [exportEndDate, setExportEndDate] = useState(todayStr);
  const [exportSubject, setExportSubject] = useState('ALL');
  const [exportCourse, setExportCourse] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Load attendance records for selected Date and Subject
  useEffect(() => {
    let isMounted = true;
    async function loadDateAttendance() {
      setIsLoading(true);
      try {
        const res = await fetchAttendanceForDateFromDB(selectedDate, selectedCourse, selectedSubject);
        if (res.error && isMounted) {
          setMessage({ type: 'error', text: `Database Error: ${res.error}` });
        }
        if (isMounted) {
          const map = {};
          (res.data || []).forEach((rec) => {
            let parsedRemark = rec.remark || '';
            if (!parsedRemark && rec.marked_by && rec.marked_by.includes('[Remark:')) {
              const match = rec.marked_by.match(/\[Remark:\s*(.*?)\]/);
              if (match) parsedRemark = match[1];
            }
            map[rec.student_id] = {
              status: rec.status === 'late' ? 'present' : rec.status,
              timing: rec.timing || (rec.status === 'late' ? 'late' : 'on_time'),
              grooming: rec.grooming || 'well_groomed',
              remark: parsedRemark
            };
          });
          setAttendanceMap(map);
        }
      } catch (err) {
        console.error('Error loading attendance', err);
        if (isMounted) {
          setMessage({ type: 'error', text: `Failed to load attendance: ${err.message}` });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDateAttendance();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedCourse, selectedSubject]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesCourse =
        selectedCourse === 'ALL' ||
        (selectedCourse === 'UNASSIGNED' && !student.course) ||
        student.course === selectedCourse;

      const matchesSearch =
        (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCourse && matchesSearch;
    });
  }, [students, selectedCourse, searchTerm]);

  // Attendance Stats
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let onTime = 0;
    let late = 0;
    let wellGroomed = 0;
    let notGroomed = 0;
    let unmarked = 0;

    filteredStudents.forEach((s) => {
      const item = attendanceMap[s.id];
      if (!item || !item.status) {
        unmarked++;
      } else if (item.status === 'present') {
        present++;
        if (item.timing === 'late') late++;
        else onTime++;

        if (item.grooming === 'not_groomed') notGroomed++;
        else wellGroomed++;
      } else if (item.status === 'absent') {
        absent++;
      }
    });

    return {
      present,
      absent,
      onTime,
      late,
      wellGroomed,
      notGroomed,
      unmarked,
      total: filteredStudents.length
    };
  }, [filteredStudents, attendanceMap]);

  // Handlers for marking
  const handleToggleStatus = (studentId, status) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId];
      if (current?.status === status) {
        // Unmark
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      }
      return {
        ...prev,
        [studentId]: {
          status,
          timing: status === 'present' ? (current?.timing || 'on_time') : 'n/a',
          grooming: status === 'present' ? (current?.grooming || 'well_groomed') : 'n/a',
          remark: current?.remark || ''
        }
      };
    });
  };

  const handleToggleTiming = (studentId, timing) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId] || { status: 'present', grooming: 'well_groomed', remark: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: 'present',
          timing
        }
      };
    });
  };

  const handleToggleGrooming = (studentId, grooming) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId] || { status: 'present', timing: 'on_time', remark: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: 'present',
          grooming
        }
      };
    });
  };

  const handleRemarkChange = (studentId, remark) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId] || { status: 'present', timing: 'on_time', grooming: 'well_groomed' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          remark
        }
      };
    });
  };

  // Bulk: Mark all filtered students Present, On Time, Well Groomed
  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((s) => {
        updated[s.id] = {
          status: 'present',
          timing: 'on_time',
          grooming: 'well_groomed',
          remark: prev[s.id]?.remark || ''
        };
      });
      return updated;
    });
  };

  // Bulk Reset
  const handleClearAll = () => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((s) => {
        delete updated[s.id];
      });
      return updated;
    });
  };

  // Save Attendance to DB
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setMessage(null);

    const recordsToSave = filteredStudents
      .filter((s) => attendanceMap[s.id]?.status)
      .map((s) => {
        const item = attendanceMap[s.id];
        const remarkClean = (item.remark || '').trim();
        const baseMarkedBy = currentUser?.name || currentUser?.username || 'Staff';
        return {
          date: selectedDate,
          student_id: s.id,
          student_name: s.name,
          roll_number: s.roll_number || '',
          course: s.course || '',
          subject: selectedSubject,
          status: item.status,
          timing: item.status === 'present' ? item.timing : 'n/a',
          grooming: item.status === 'present' ? item.grooming : 'n/a',
          marked_by: remarkClean ? `${baseMarkedBy} [Remark: ${remarkClean}]` : baseMarkedBy,
          created_at: new Date().toISOString()
        };
      });

    if (recordsToSave.length === 0) {
      setMessage({ type: 'error', text: 'Please mark at least one student before saving.' });
      setIsSaving(false);
      return;
    }

    try {
      const res = await saveAttendanceToDB(recordsToSave);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Attendance saved for ${recordsToSave.length} students on ${selectedDate} for [${selectedSubject}]!`
        });
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save attendance to database.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error saving attendance.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setMessage((prev) => (prev?.type === 'success' ? null : prev));
      }, 5000);
    }
  };

  // Admin Export CSV Download
  const handleExportCSV = async () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both Start Date and End Date.');
      return;
    }
    if (exportStartDate > exportEndDate) {
      alert('Start Date cannot be greater than End Date.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetchAttendanceRangeFromDB(
        exportStartDate,
        exportEndDate,
        exportCourse,
        exportSubject
      );

      const records = res.data || [];
      if (records.length === 0) {
        alert(`No attendance records found between ${exportStartDate} and ${exportEndDate}.`);
        setIsExporting(false);
        return;
      }

      // Format CSV
      const headers = [
        'Date',
        'Student Name',
        'Roll Number',
        'Course',
        'Subject',
        'Attendance Status',
        'On Time (Yes/No)',
        'Well Groomed (Yes/No)',
        'Remark',
        'Marked By',
        'Recorded At'
      ];

      const rows = records.map((r) => {
        let remark = r.remark || '';
        let staffName = r.marked_by || '';
        if (!remark && staffName.includes('[Remark:')) {
          const match = staffName.match(/\[Remark:\s*(.*?)\]/);
          if (match) {
            remark = match[1];
            staffName = staffName.replace(/\[Remark:.*?\]/, '').trim();
          }
        }

        return [
          sanitizeCsvCell(r.date || ''),
          sanitizeCsvCell(r.student_name || ''),
          sanitizeCsvCell(r.roll_number || ''),
          sanitizeCsvCell(r.course || ''),
          sanitizeCsvCell(r.subject || ''),
          sanitizeCsvCell((r.status || '').toUpperCase()),
          sanitizeCsvCell(r.timing === 'late' ? 'No (Late)' : r.timing === 'on_time' ? 'Yes (On Time)' : 'N/A'),
          sanitizeCsvCell(r.grooming === 'not_groomed' ? 'No (Not Groomed)' : r.grooming === 'well_groomed' ? 'Yes (Well Groomed)' : 'N/A'),
          sanitizeCsvCell(remark),
          sanitizeCsvCell(staffName),
          sanitizeCsvCell(r.created_at || '')
        ];
      });

      const csvString =
        '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `attendance_report_${exportStartDate}_to_${exportEndDate}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
    } catch (err) {
      alert('Error downloading report: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Subject Attendance & Grooming
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Subject-wise attendance tracking: <strong>Present/Absent</strong>, <strong>On Time/Late</strong>, & <strong>Well Groomed</strong>.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Admin Export Report Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Download Report</span>
            </button>
          )}

          {/* Date Picker */}
          <div className="relative">
            <input
              id="attendance-date"
              aria-label="Select Attendance Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            />
          </div>

          {/* Save Attendance Button */}
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Attendance</span>
          </button>
        </div>
      </div>

      {/* Staff Subject Permission Notice */}
      {allowedSubjects && allowedSubjects.length > 0 && (
        <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between gap-2 animate-fade-in flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Lock className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Assigned Subject Access:</strong> You can only take attendance for your authorized subjects:
            </span>
            <div className="inline-flex flex-wrap gap-1">
              {allowedSubjects.map((sub, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-purple-200/80 font-bold text-purple-900 text-[11px]"
                >
                  {sub}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff with No Assigned Subjects Notice */}
      {!isAdmin && allowedSubjects && allowedSubjects.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>No Assigned Class / Subject:</strong>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Your teacher account has not been assigned to any class or subject yet. Please ask the administrator to assign your subjects in Staff Roles.
            </p>
          </div>
        </div>
      )}

      {/* Alert Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium flex-1">{message.text}</span>
        </div>
      )}

      {/* Stats Summary: Present, Absent, On Time, Late, Well Groomed */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <div className="text-xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-[11px] font-medium text-slate-500 uppercase">Total Students</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-center">
          <div className="text-xl font-bold text-emerald-700">{stats.present}</div>
          <div className="text-[11px] font-medium text-emerald-600 uppercase">Present</div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/70 text-center">
          <div className="text-xl font-bold text-rose-700">{stats.absent}</div>
          <div className="text-[11px] font-medium text-rose-600 uppercase">Absent</div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-center">
          <div className="text-xl font-bold text-blue-700">{stats.onTime}</div>
          <div className="text-[11px] font-medium text-blue-600 uppercase">⏰ On Time</div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-center">
          <div className="text-xl font-bold text-amber-700">{stats.late}</div>
          <div className="text-[11px] font-medium text-amber-600 uppercase">⚠️ Late</div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/70 text-center">
          <div className="text-xl font-bold text-indigo-700">{stats.wellGroomed}</div>
          <div className="text-[11px] font-medium text-indigo-600 uppercase">👔 Well Groomed</div>
        </div>
      </div>

      {/* Filter and Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap flex-1 items-center gap-2 max-w-2xl">
          
          {/* SUBJECT INDICATOR / DROPDOWN (Subject-wise attendance) */}
          <div className="relative min-w-[200px]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl">
              <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="flex-1">
                <div className="text-[9px] uppercase font-bold text-purple-700 leading-none">
                  {allowedSubjects ? 'Assigned Subject' : 'Subject Attendance'}
                </div>
                {userSubjectsList.length === 1 ? (
                  <div className="text-xs sm:text-sm font-bold text-slate-800 py-0.5">
                    {userSubjectsList[0].name} {userSubjectsList[0].code ? `(${userSubjectsList[0].code})` : ''}
                  </div>
                ) : (
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    {userSubjectsList.map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              id="attendance-search"
              aria-label="Search student by name or roll number"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Course filter */}
          <div className="relative">
            <select
              id="attendance-course-filter"
              aria-label="Filter students by course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
            title="Mark all as Present, On Time, and Well Groomed"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All (Present + On Time + Groomed)</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Student List with Subject Attendance, Timing & Grooming toggles */}
      <div className="pt-2">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-xs sm:text-sm">
              Loading attendance for {selectedDate} ({selectedSubject})...
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No students found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add students in the Students tab to take attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3">Student Details</th>
                  <th scope="col" className="px-4 py-3">Roll & Course</th>
                  <th scope="col" className="px-4 py-3 text-center">Attendance</th>
                  <th scope="col" className="px-4 py-3 text-center">On Time (Yes / No)</th>
                  <th scope="col" className="px-4 py-3 text-center">Well Groomed (Yes / No)</th>
                  <th scope="col" className="px-4 py-3">Remark / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const mark = attendanceMap[student.id];
                  const isPresent = mark?.status === 'present';
                  const isAbsent = mark?.status === 'absent';
                  const isLate = mark?.timing === 'late';
                  const isNotGroomed = mark?.grooming === 'not_groomed';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPresent
                          ? 'bg-emerald-50/20'
                          : isAbsent
                          ? 'bg-rose-50/20'
                          : ''
                      }`}
                    >
                      {/* Student Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {student.name}
                            </div>
                            {isAdmin && student.father_name && (
                              <div className="text-[11px] text-slate-400">
                                Father/Guardian: {student.father_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roll Number & Course */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {student.roll_number || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {student.course || 'Unassigned'}
                        </div>
                      </td>

                      {/* 1. Status Toggle (Present / Absent) */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.id, 'present')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            P (Present)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.id, 'absent')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            A (Absent)
                          </button>
                        </div>
                      </td>

                      {/* 2. On Time (Yes / No) */}
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 ${isAbsent ? 'opacity-40 pointer-events-none' : ''}`}>
                          <button
                            type="button"
                            onClick={() => handleToggleTiming(student.id, 'on_time')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isPresent && mark?.timing === 'on_time'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            ✓ Yes
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleTiming(student.id, 'late')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isPresent && mark?.timing === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            ✗ No (Late)
                          </button>
                        </div>
                      </td>

                      {/* 3. Well Groomed (Yes / No) */}
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 ${isAbsent ? 'opacity-40 pointer-events-none' : ''}`}>
                          <button
                            type="button"
                            onClick={() => handleToggleGrooming(student.id, 'well_groomed')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isPresent && mark?.grooming === 'well_groomed'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            ✓ Yes
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleGrooming(student.id, 'not_groomed')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isPresent && mark?.grooming === 'not_groomed'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            ✗ No
                          </button>
                        </div>
                      </td>

                      {/* 4. Remark / Reason */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={mark?.remark || ''}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          placeholder="e.g. Late 10m, No tie, Unshaved..."
                          className="w-full min-w-[150px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-700 transition-all"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADMIN DATE RANGE EXPORT MODAL */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold">Download Attendance Report</h3>
                  <p className="text-xs text-emerald-100">
                    Export subject-wise attendance, timing & grooming data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              
              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    From Date (Start) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    To Date (End) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Filter by Subject
                </label>
                <select
                  value={exportSubject}
                  onChange={(e) => setExportSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="ALL">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Filter by Course
                </label>
                <select
                  value={exportCourse}
                  onChange={(e) => setExportCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="ALL">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Info Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  Included in CSV File:
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Date, Student Name, Roll No, Course, Subject, Present/Absent status, On Time/Late timing, Well Groomed status, and staff member who marked it.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isExporting ? 'Generating CSV...' : 'Download CSV Report'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
