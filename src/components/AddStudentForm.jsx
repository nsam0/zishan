import React, { useState } from 'react';
import { User, Users, Hash, BookOpen, PlusCircle, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { addStudentToDB } from '../lib/supabase';

export default function AddStudentForm({ courses = [], onStudentAdded, onNavigateToCourses }) {
  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    roll_number: '',
    course: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Student name is required!' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await addStudentToDB(formData);
      
      if (result.error || !result.success) {
        setMessage({
          type: 'error',
          text: `Error adding student: ${result.error || 'Database operation failed.'}`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Student "${formData.name}" added to Supabase directory successfully!`
        });

        // Reset form
        setFormData({
          name: '',
          father_name: '',
          roll_number: '',
          course: ''
        });

        if (onStudentAdded) {
          onStudentAdded(result.data);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setMessage((prev) => (prev?.type === 'success' ? null : prev));
      }, 5000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
      
      {/* Card Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add New Student</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter details to add student to the directory
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${
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
          <div className="flex-1 font-medium">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        
        {/* Student Name (Required) */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Student Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Full name"
              className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Parent / Guardian Name (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="father_name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Parent / Guardian Name
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Optional (max 100)</span>
          </div>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <input
              id="father_name"
              name="father_name"
              type="text"
              maxLength={100}
              value={formData.father_name}
              onChange={handleChange}
              placeholder="Parent name"
              className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Roll Number (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="roll_number" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Roll Number
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Optional</span>
          </div>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Hash className="w-4 h-4" />
            </div>
            <input
              id="roll_number"
              name="roll_number"
              type="text"
              value={formData.roll_number}
              onChange={handleChange}
              placeholder="e.g. ROLL-2024-001"
              className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Course (Dynamic Dropdown from Courses Menu) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="course" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Course
            </label>
            {onNavigateToCourses && (
              <button
                type="button"
                onClick={onNavigateToCourses}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Manage Courses
              </button>
            )}
          </div>
          <div className="relative rounded-xl shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <select
              id="course"
              name="course"
              value={formData.course}
              onChange={handleChange}
              className="block w-full pl-10 pr-9 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="">Select course (or leave blank)</option>
              {courses.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Courses can be added or deleted from the <strong>Courses</strong> menu.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding Student...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Add Student</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
