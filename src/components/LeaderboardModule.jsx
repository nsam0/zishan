import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Download,
  RotateCw,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  Shirt,
  Sparkles,
  TrendingUp,
  Loader2,
  Flame,
  Star
} from 'lucide-react';
import {
  fetchLeaderboardFromDB,
  fetchAllAttendanceRecords,
  computeLeaderboardScores,
  syncLeaderboardToDB
} from '../lib/supabase';
import { sanitizeCsvCell } from '../lib/security';

export default function LeaderboardModule({ students = [], courses = [], currentUser }) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [syncMessage, setSyncMessage] = useState(null);

  // Load Leaderboard Scores
  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetchLeaderboardFromDB(students);
      setLeaderboardData(res.data || []);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [students]);

  // Recalculate and sync with Supabase
  const handleSyncScores = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const allRecords = await fetchAllAttendanceRecords();
      const freshScores = computeLeaderboardScores(students, allRecords);
      setLeaderboardData(freshScores);
      await syncLeaderboardToDB(freshScores);

      setSyncMessage({
        type: 'success',
        text: `Leaderboard successfully recalculated and synced for ${freshScores.length} students!`
      });
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: 'Failed to sync leaderboard: ' + err.message
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncMessage(null);
      }, 5000);
    }
  };

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return leaderboardData.filter((item) => {
      const matchesCourse =
        selectedCourse === 'ALL' ||
        (selectedCourse === 'UNASSIGNED' && !item.course) ||
        item.course === selectedCourse;

      const matchesSearch =
        (item.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCourse && matchesSearch;
    });
  }, [leaderboardData, selectedCourse, searchTerm]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return filteredLeaderboard.slice(0, 3);
  }, [filteredLeaderboard]);

  // Download CSV Leaderboard Report
  const handleDownloadCSV = () => {
    if (filteredLeaderboard.length === 0) {
      alert('No leaderboard data to download.');
      return;
    }

    const headers = [
      'Rank',
      'Student Name',
      'Roll Number',
      'Course',
      'Total Score',
      'Attendance Rate (%)',
      'Punctuality Rate (%)',
      'Grooming Rate (%)',
      'Total Classes',
      'Present Count',
      'Absent Count',
      'On Time Count',
      'Late Count',
      'Well Groomed Count',
      'Not Groomed Count'
    ];

    const rows = filteredLeaderboard.map((item) => [
      sanitizeCsvCell(item.rank),
      sanitizeCsvCell(item.student_name || ''),
      sanitizeCsvCell(item.roll_number || ''),
      sanitizeCsvCell(item.course || ''),
      sanitizeCsvCell(item.total_score || 0),
      sanitizeCsvCell(`${item.attendance_percentage || 0}%`),
      sanitizeCsvCell(`${item.punctuality_percentage || 0}%`),
      sanitizeCsvCell(`${item.grooming_percentage || 0}%`),
      sanitizeCsvCell(item.total_classes || 0),
      sanitizeCsvCell(item.present_count || 0),
      sanitizeCsvCell(item.absent_count || 0),
      sanitizeCsvCell(item.on_time_count || 0),
      sanitizeCsvCell(item.late_count || 0),
      sanitizeCsvCell(item.well_groomed_count || 0),
      sanitizeCsvCell(item.not_groomed_count || 0)
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_leaderboard_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
              <Trophy className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Student Performance Leaderboard
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Live
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Rankings calculated from <strong>Attendance</strong>, <strong>Punctuality (On Time)</strong>, & <strong>Professional Grooming</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sync / Recalculate Button */}
          <button
            type="button"
            onClick={handleSyncScores}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-60"
            title="Recalculate and update scores from latest attendance records"
          >
            <RotateCw className={`w-4 h-4 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Scores'}</span>
          </button>

          {/* Download CSV Button */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Alert Message */}
      {syncMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-medium flex-1">{syncMessage.text}</span>
        </div>
      )}

      {/* Scoring Points Legend / Rule Box */}
      <div className="p-4 bg-gradient-to-r from-amber-50/70 via-slate-50 to-blue-50/70 rounded-2xl border border-amber-200/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Scoring Matrix:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-semibold shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present: +10 Pts
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            On Time: +5 Pts <span className="text-[10px] text-slate-400 font-normal">(Late: +2)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-semibold shadow-2xs">
            <Shirt className="w-3.5 h-3.5 text-indigo-600" />
            Well Groomed: +5 Pts
          </span>
          <span className="text-slate-500 text-[11px]">
            Max 20 Pts / Session
          </span>
        </div>
      </div>

      {/* TOP 3 PODIUM (Visual Cards) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          
          {/* #2 Silver (Left) */}
          {topThree[1] && (
            <div className="order-2 md:order-1 bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-5 text-center relative overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center mx-auto mb-2 border border-slate-300">
                🥈 2
              </div>
              <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                {topThree[1].student_name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Roll: {topThree[1].roll_number || '—'}
              </p>
              <div className="mt-3 py-2 px-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-black text-slate-800">
                  {topThree[1].total_score} <span className="text-xs font-semibold text-slate-400">pts</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {topThree[1].attendance_percentage}% Attendance
                </div>
              </div>
            </div>
          )}

          {/* #1 Gold (Center - Highlighted) */}
          {topThree[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-white rounded-2xl border-2 border-amber-400 shadow-md p-6 text-center relative overflow-hidden md:-mt-2">
              <div className="absolute top-2 right-2 text-amber-500">
                <Crown className="w-5 h-5 fill-amber-400" />
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-400 text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-md shadow-amber-400/30">
                🥇 1
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase tracking-wider mb-1">
                Top Performer
              </div>
              <h3 className="font-bold text-slate-900 text-lg line-clamp-1">
                {topThree[0].student_name}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Roll: {topThree[0].roll_number || '—'} • {topThree[0].course || 'GSE'}
              </p>
              <div className="mt-3 py-2.5 px-4 bg-amber-100/60 rounded-xl border border-amber-200">
                <div className="text-3xl font-black text-amber-900">
                  {topThree[0].total_score} <span className="text-xs font-semibold text-amber-700">pts</span>
                </div>
                <div className="text-xs font-medium text-amber-800 mt-0.5">
                  {topThree[0].attendance_percentage}% Attendance • {topThree[0].punctuality_percentage}% On-Time
                </div>
              </div>
            </div>
          )}

          {/* #3 Bronze (Right) */}
          {topThree[2] && (
            <div className="order-3 bg-white rounded-2xl border-2 border-amber-700/20 shadow-sm p-5 text-center relative overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center mx-auto mb-2 border border-amber-300">
                🥉 3
              </div>
              <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                {topThree[2].student_name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Roll: {topThree[2].roll_number || '—'}
              </p>
              <div className="mt-3 py-2 px-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-black text-slate-800">
                  {topThree[2].total_score} <span className="text-xs font-semibold text-slate-400">pts</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {topThree[2].attendance_percentage}% Attendance
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-2 max-w-xl">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student by name or roll..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Course filter */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:border-amber-500 cursor-pointer"
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

        <div className="text-xs font-semibold text-slate-500">
          Showing {filteredLeaderboard.length} of {leaderboardData.length} students
        </div>
      </div>

      {/* Complete Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-sm">Calculating student performance rankings...</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No student records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Mark attendance in the Attendance tab to start accumulating scores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center w-14">Rank</th>
                  <th scope="col" className="px-4 py-3">Student Details</th>
                  <th scope="col" className="px-4 py-3">Course</th>
                  <th scope="col" className="px-4 py-3 text-center">Score</th>
                  <th scope="col" className="px-4 py-3 text-center">Attendance</th>
                  <th scope="col" className="px-4 py-3 text-center">Punctuality (On Time)</th>
                  <th scope="col" className="px-4 py-3 text-center">Grooming</th>
                  <th scope="col" className="px-4 py-3 text-right">Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaderboard.map((item, index) => {
                  const rank = index + 1;
                  const isTopOne = rank === 1;
                  const isTopTwo = rank === 2;
                  const isTopThree = rank === 3;

                  return (
                    <tr
                      key={item.student_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTopOne
                          ? 'bg-amber-50/20'
                          : isTopTwo
                          ? 'bg-slate-50/50'
                          : isTopThree
                          ? 'bg-amber-900/5'
                          : ''
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="px-4 py-3.5 text-center">
                        {isTopOne ? (
                          <span className="w-7 h-7 rounded-full bg-amber-400 text-white font-bold text-xs inline-flex items-center justify-center shadow-xs">
                            🥇
                          </span>
                        ) : isTopTwo ? (
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center justify-center">
                            🥈
                          </span>
                        ) : isTopThree ? (
                          <span className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-bold text-xs inline-flex items-center justify-center">
                            🥉
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-slate-400">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                          {item.student_name}
                          {isTopOne && (
                            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Roll: {item.roll_number || '—'}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-600 font-medium">
                          {item.course || 'Unassigned'}
                        </span>
                      </td>

                      {/* Total Score */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                          {item.total_score} pts
                        </span>
                      </td>

                      {/* Attendance % */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-semibold text-slate-800 text-xs">
                          {item.attendance_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.present_count}/{item.total_classes} Present
                        </div>
                      </td>

                      {/* Punctuality (On Time) % */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-semibold text-blue-700 text-xs">
                          {item.punctuality_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.on_time_count} On Time • {item.late_count} Late
                        </div>
                      </td>

                      {/* Grooming % */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-semibold text-indigo-700 text-xs">
                          {item.grooming_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.well_groomed_count} Groomed
                        </div>
                      </td>

                      {/* Performance Badge */}
                      <td className="px-4 py-3.5 text-right">
                        {isTopOne ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Crown className="w-3 h-3 fill-amber-500 text-amber-500" /> Champion
                          </span>
                        ) : isTopTwo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            🥈 Silver Star
                          </span>
                        ) : isTopThree ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            🥉 Bronze Star
                          </span>
                        ) : item.attendance_percentage >= 90 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Star className="w-3 h-3 text-emerald-600" /> High Achiever
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Consistent
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
