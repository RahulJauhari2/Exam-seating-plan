import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserX, 
  UserCheck, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  LogOut,
  Smartphone,
  LayoutGrid,
  List,
  Columns3,
  CheckCheck,
  RotateCcw,
  Radio,
  Sparkles,
  User,
  GraduationCap,
  ClipboardList,
  Printer,
  Info
} from 'lucide-react';

export default function TeacherRoomPortal({
  examSession,
  activeDate,
  activeShift,
  liveAbsentees = {},
  onToggleAbsent,
  onLogout,
  onSwitchToAdminView,
}) {
  const { currentUser, canAccessAllRooms } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'bench' | 'absent-summary'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [filterOnlyAbsent, setFilterOnlyAbsent] = useState(false);
  const [togglingRoll, setTogglingRoll] = useState(null);

  // Available room objects from seatingResult
  const rooms = examSession?.rooms || [];

  // 1. Identify teacher's assigned room from dutyRoster
  const dutyRoster = examSession?.dutyRoster || {};
  
  const assignedRoomDefault = useMemo(() => {
    if (!currentUser || rooms.length === 0) return rooms[0]?.roomName || 'Room 01';

    // Search across duty roster for teacher's ID or name
    const teacherId = currentUser.assignedTeacherId || currentUser.id;
    for (const [key, alloc] of Object.entries(dutyRoster)) {
      if (alloc && alloc.rooms) {
        for (const [rId, dInfo] of Object.entries(alloc.rooms)) {
          if (
            (dInfo.invigilator1 && String(dInfo.invigilator1) === String(teacherId)) ||
            (dInfo.invigilator2 && String(dInfo.invigilator2) === String(teacherId))
          ) {
            const foundRoom = rooms.find((r) => r.roomId === rId || r.roomName === rId);
            if (foundRoom) return foundRoom.roomName;
          }
        }
      }
    }

    // Default to first room
    return rooms[0]?.roomName || 'Room 01';
  }, [currentUser, dutyRoster, rooms]);

  const [selectedRoomName, setSelectedRoomName] = useState(assignedRoomDefault);

  useEffect(() => {
    if (assignedRoomDefault) {
      setSelectedRoomName(assignedRoomDefault);
    }
  }, [assignedRoomDefault]);

  // Current active room object
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.roomName === selectedRoomName) || rooms[0] || null;
  }, [rooms, selectedRoomName]);

  // Flatten all students in this room
  const roomStudents = useMemo(() => {
    if (!currentRoom || !currentRoom.benches) return [];
    const list = [];
    currentRoom.benches.forEach((bench) => {
      if (bench.leftSeat && bench.leftSeat.rollNo) {
        list.push({ ...bench.leftSeat, benchNumber: bench.benchNumber, side: 'बायां (Left)' });
      }
      if (bench.rightSeat && bench.rightSeat.rollNo) {
        list.push({ ...bench.rightSeat, benchNumber: bench.benchNumber, side: 'दायां (Right)' });
      }
    });
    return list;
  }, [currentRoom]);

  // Distinct classes sitting in this room
  const roomClasses = useMemo(() => {
    const map = new Map();
    roomStudents.forEach((st) => {
      const classKey = `${st.className || ''}_${st.section || ''}`.trim();
      const displayName = `Class ${st.className}${st.section ? ` (${st.section})` : ''}`;
      if (!map.has(classKey)) {
        map.set(classKey, { key: classKey, displayName, className: st.className, section: st.section, count: 0 });
      }
      map.get(classKey).count++;
    });
    return Array.from(map.values());
  }, [roomStudents]);

  // Class-wise Grouped and Roll Number-wise Sorted Students
  const classGroupedStudents = useMemo(() => {
    // 1. Group by Class
    const groups = {};
    roomStudents.forEach((st) => {
      const classKey = `${st.className || ''}_${st.section || ''}`.trim() || 'Other';
      if (!groups[classKey]) {
        groups[classKey] = {
          classKey,
          className: st.className || 'कक्षा',
          section: st.section || '',
          displayName: `Class ${st.className || ''}${st.section ? ` - Sec ${st.section}` : ''}`,
          students: [],
        };
      }
      groups[classKey].students.push(st);
    });

    // 2. Sort students within each class strictly by Roll Number (Numeric ASC)
    Object.values(groups).forEach((grp) => {
      grp.students.sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
    });

    // 3. Sort class groups by class name
    return Object.values(groups).sort((a, b) =>
      String(a.displayName).localeCompare(String(b.displayName))
    );
  }, [roomStudents]);

  // Filtered Students for Flat or Grouped display
  const filteredClassGroups = useMemo(() => {
    return classGroupedStudents
      .filter((grp) => {
        if (selectedClassFilter === 'all') return true;
        return grp.classKey === selectedClassFilter;
      })
      .map((grp) => {
        let list = grp.students;
        if (filterOnlyAbsent) {
          list = list.filter((st) => !!liveAbsentees[st.rollNo]?.isAbsent);
        }
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          list = list.filter(
            (st) =>
              String(st.rollNo).includes(term) ||
              (st.name && st.name.toLowerCase().includes(term)) ||
              (st.subject && st.subject.toLowerCase().includes(term))
          );
        }
        return { ...grp, students: list };
      })
      .filter((grp) => grp.students.length > 0);
  }, [classGroupedStudents, selectedClassFilter, filterOnlyAbsent, searchTerm, liveAbsentees]);

  // Class-wise Absent Summary Breakdown
  const classWiseAbsentSummary = useMemo(() => {
    return classGroupedStudents.map((grp) => {
      const total = grp.students.length;
      const absentList = grp.students.filter((st) => !!liveAbsentees[st.rollNo]?.isAbsent);
      const absentCount = absentList.length;
      const presentCount = total - absentCount;

      return {
        classKey: grp.classKey,
        displayName: grp.displayName,
        className: grp.className,
        section: grp.section,
        total,
        presentCount,
        absentCount,
        absentStudents: absentList,
      };
    });
  }, [classGroupedStudents, liveAbsentees]);

  // Total Statistics
  const totalStudents = roomStudents.length;
  const absentCount = roomStudents.filter((st) => liveAbsentees[st.rollNo]?.isAbsent).length;
  const presentCount = totalStudents - absentCount;

  // 1-Click Absent Toggle Handler
  const handleToggle = async (student) => {
    const currentIsAbsent = !!liveAbsentees[student.rollNo]?.isAbsent;
    const newStatus = !currentIsAbsent;

    setTogglingRoll(student.rollNo);

    try {
      await onToggleAbsent({
        rollNo: student.rollNo,
        isAbsent: newStatus,
        roomName: selectedRoomName,
        sessionName: examSession?.sessionName || 'Half_Yearly_2026_27',
        date: activeDate,
        shift: activeShift,
        studentName: student.name || '',
        className: student.className || '',
        section: student.section || '',
      });
    } finally {
      setTogglingRoll(null);
    }
  };

  // Helper for physical columns
  const getRoomColumns = (room) => {
    if (!room || !room.benches) return { columns: [], maxRows: 0 };
    const split = room.columnSplit || [7, 6, 7];
    const columns = [];
    let startIndex = 0;

    split.forEach((count, colIdx) => {
      let colName = `कॉलम ${colIdx + 1}`;
      if (split.length === 3) {
        if (colIdx === 0) colName = 'बायां कॉलम (Left)';
        else if (colIdx === 1) colName = 'मध्य कॉलम (Middle)';
        else if (colIdx === 2) colName = 'दायां कॉलम (Right)';
      }

      const benchesInCol = room.benches.slice(startIndex, startIndex + count);
      columns.push({
        colIndex: colIdx,
        name: colName,
        rowCount: count,
        benches: benchesInCol,
      });
      startIndex += count;
    });

    const maxRows = Math.max(...split, 1);
    return { columns, maxRows };
  };

  const { columns, maxRows } = useMemo(() => getRoomColumns(currentRoom), [currentRoom]);

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-5 pb-28">
      {/* Top Header Card */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Teacher Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  कक्ष निरीक्षक उपस्थिति एवं सीटिंग पोर्टल
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  लाइव सिंक
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                कक्ष निरीक्षक: <span className="font-bold text-slate-800">{currentUser?.name || 'शिक्षक'}</span>
                {currentUser?.phone ? ` • फोन: ${currentUser.phone}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {canAccessAllRooms && (
              <button
                onClick={onSwitchToAdminView}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                कंट्रोल रूम
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition"
              title="लॉगआउट करें"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Room & Shift Selection Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Room Selector */}
          <div className={`rounded-xl p-2.5 border ${
            canAccessAllRooms 
              ? 'bg-blue-50/80 border-blue-200' 
              : 'bg-emerald-50/80 border-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                canAccessAllRooms ? 'text-blue-700' : 'text-emerald-800'
              }`}>
                {canAccessAllRooms ? 'कक्ष चयन (Admin Access):' : '🔒 आपका आवंटित परीक्षा कक्ष:'}
              </span>
              {!canAccessAllRooms && (
                <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">
                  ड्यूटी लॉक
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className={`w-4 h-4 shrink-0 ${canAccessAllRooms ? 'text-blue-600' : 'text-emerald-700'}`} />
              {canAccessAllRooms ? (
                <select
                  value={selectedRoomName}
                  onChange={(e) => {
                    setSelectedRoomName(e.target.value);
                    setSelectedClassFilter('all');
                  }}
                  className="w-full bg-white border border-blue-300 rounded-lg py-1 px-2 text-xs font-black text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                >
                  {rooms.map((rm) => (
                    <option key={rm.roomId || rm.roomName} value={rm.roomName}>
                      {rm.roomName} ({rm.benchesCount || 20} बेंच • {rm.seatedCount || 0} छात्र)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-white border border-emerald-300 rounded-lg py-1 px-2 text-xs font-black text-emerald-950 flex items-center justify-between">
                  <span>{currentRoom ? currentRoom.roomName : selectedRoomName}</span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    ({currentRoom?.benchesCount || 20} बेंच • {currentRoom?.seatedCount || 0} छात्र)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-2.5">
            <span className="text-purple-700 block text-[10px] font-bold uppercase tracking-wider">
              परीक्षा तिथि (Date)
            </span>
            <span className="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              {activeDate || 'आज'}
            </span>
          </div>

          {/* Shift */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
            <span className="text-amber-700 block text-[10px] font-bold uppercase tracking-wider">
              परीक्षा पाली (Shift)
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-amber-600" />
              {activeShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'}
            </span>
          </div>

          {/* Attendance Stats */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5">
            <span className="text-emerald-700 block text-[10px] font-bold uppercase tracking-wider">
              कक्ष उपस्थिति (Live Count)
            </span>
            <div className="text-xs font-black mt-1 flex items-center justify-between">
              <span className="text-emerald-800">
                उपस्थित: <strong className="text-sm">{presentCount}</strong>
              </span>
              <span className="text-rose-700">
                अनुपस्थित: <strong className="text-sm">{absentCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Why multiple classes note */}
        <div className="mt-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-2 text-xs text-indigo-900">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>नकल विहीन परीक्षा (Anti-Adjacent Pairing):</strong> इस कमरे में <strong>{roomClasses.map((c) => c.displayName).join(' एवं ')}</strong> के छात्र एक साथ अगल-बगल बेंच पर बैठे हैं। नीचे सूची को <strong>कक्षा-वार</strong> और <strong>रोल नंबर के बढ़ते क्रम</strong> में व्यवस्थित कर दिया गया है।
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* View Mode Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* 3 View Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>कक्षा-वार छात्र सूची (Class & Roll Sorted)</span>
            </button>

            <button
              onClick={() => setViewMode('absent-summary')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'absent-summary'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>कक्षा-वार अनुपस्थिति पत्रक ({absentCount})</span>
            </button>

            <button
              onClick={() => setViewMode('bench')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'bench'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>सीटिंग प्लान लेआउट (Bench View)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="रोल नंबर या नाम खोजें..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Class Filter Tabs (Pills) */}
        {viewMode !== 'absent-summary' && roomClasses.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-slate-500 text-[11px] shrink-0 mr-1">कक्षा फ़िल्टर:</span>
            <button
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                selectedClassFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              सभी कक्षाएं ({totalStudents})
            </button>
            {roomClasses.map((cls) => (
              <button
                key={cls.key}
                onClick={() => setSelectedClassFilter(cls.key)}
                className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedClassFilter === cls.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{cls.displayName}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">
                  {cls.count}
                </span>
              </button>
            ))}

            <button
              onClick={() => setFilterOnlyAbsent(!filterOnlyAbsent)}
              className={`ml-auto px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                filterOnlyAbsent
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>केवल अनुपस्थित ({absentCount})</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: CLASS-WISE & ROLL NO-WISE SORTED STUDENT LIST    */}
        {/* ======================================================== */}
        {viewMode === 'list' && (
          <div className="space-y-5">
            {filteredClassGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500 text-sm">
                कोई परीक्षार्थी नहीं मिला।
              </div>
            ) : (
              filteredClassGroups.map((grp) => {
                const classAbsentCount = grp.students.filter((st) => !!liveAbsentees[st.rollNo]?.isAbsent).length;
                const classPresentCount = grp.students.length - classAbsentCount;

                return (
                  <div key={grp.classKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Class Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-400" />
                        <div>
                          <h3 className="text-sm sm:text-base font-black tracking-tight">
                            {grp.displayName}
                          </h3>
                          <span className="text-[11px] text-blue-200">
                            रोल नंबर अनुसार व्यवस्थित ({grp.students[0]?.rollNo} से {grp.students[grp.students.length - 1]?.rollNo})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                          उपस्थित: {classPresentCount}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg font-bold ${
                          classAbsentCount > 0
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-white/10 text-slate-300'
                        }`}>
                          अनुपस्थित: {classAbsentCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/15 text-white font-bold">
                          कुल: {grp.students.length}
                        </span>
                      </div>
                    </div>

                    {/* Students Grid strictly sorted by Roll Number ASC */}
                    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {grp.students.map((st) => {
                        const isAbsent = !!liveAbsentees[st.rollNo]?.isAbsent;
                        const isToggling = togglingRoll === st.rollNo;

                        return (
                          <div
                            key={`${st.rollNo}-${st.benchNumber}`}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 shadow-2xs ${
                              isAbsent
                                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/50'
                                : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200'
                            }`}
                          >
                            {/* Student Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-black text-slate-900 font-mono tracking-tight">
                                  {st.rollNo}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                                  बेंच #{st.benchNumber} ({st.side.includes('Left') ? 'L' : 'R'})
                                </span>
                              </div>

                              <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                {st.name || 'परीक्षार्थी'}
                              </div>

                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {st.subject || 'सामान्य विषय'}
                              </div>

                              {isAbsent && (
                                <div className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                  <UserX className="w-3 h-3" />
                                  अनुपस्थित (ABSENT)
                                </div>
                              )}
                            </div>

                            {/* 1-Tap Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggle(st)}
                              disabled={isToggling}
                              className={`px-3 py-2 rounded-xl font-black text-[11px] shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0 ${
                                isAbsent
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                              }`}
                            >
                              {isToggling ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isAbsent ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>उपस्थित</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>अनुपस्थित</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CLASS-WISE ABSENTEE REGISTER / SUMMARY TABLE      */}
        {/* ======================================================== */}
        {viewMode === 'absent-summary' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-rose-600" />
                  कक्षा-वार अनुपस्थिति पत्रक (Class-wise Absentee Register)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  कमरा: <strong className="text-slate-800">{selectedRoomName}</strong> • परीक्षा तिथि: <strong>{activeDate}</strong> • पाली: <strong>{activeShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-black text-xs">
                  कुल अनुपस्थित: {absentCount} छात्र
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  प्रिंट करें
                </button>
              </div>
            </div>

            {/* Summary Cards per Class */}
            <div className="space-y-4">
              {classWiseAbsentSummary.map((clsSummary) => (
                <div
                  key={clsSummary.classKey}
                  className={`p-4 rounded-2xl border transition-all ${
                    clsSummary.absentCount > 0
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-700" />
                      <span className="font-black text-sm text-slate-900">
                        {clsSummary.displayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-600">
                        आवंटित छात्र: <strong>{clsSummary.total}</strong>
                      </span>
                      <span className="text-emerald-700 font-bold">
                        उपस्थित: <strong>{clsSummary.presentCount}</strong>
                      </span>
                      <span className={`font-black px-2 py-0.5 rounded-lg ${
                        clsSummary.absentCount > 0
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        अनुपस्थित: {clsSummary.absentCount}
                      </span>
                    </div>
                  </div>

                  {/* Absent Roll Numbers List */}
                  <div className="mt-3">
                    {clsSummary.absentCount === 0 ? (
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>इस कक्षा के सभी परीक्षार्थी उपस्थित हैं (No Absentees)।</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-rose-900 block">
                          अनुपस्थित परीक्षार्थियों के रोल नंबर (Roll Numbers):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {clsSummary.absentStudents.map((st) => (
                            <div
                              key={st.rollNo}
                              className="px-3 py-1.5 bg-white border-2 border-rose-400 rounded-xl shadow-xs flex items-center gap-2 text-xs"
                            >
                              <span className="font-mono font-black text-rose-900 text-sm">
                                #{st.rollNo}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {st.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                (बेंच #{st.benchNumber})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggle(st)}
                                className="ml-1 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold"
                                title="उपस्थित करें"
                              >
                                उपस्थित करें
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: EXACT PHYSICAL BENCH SEATING PLAN ARRANGEMENT     */}
        {/* ======================================================== */}
        {viewMode === 'bench' && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-sm">
            {/* Blackboard & Teacher Desk Indicator */}
            <div className="text-center mb-5">
              <div className="inline-block px-8 py-2 bg-slate-900 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-md border-2 border-slate-700">
                ⬛ आगे का पटल / ब्लैकबोर्ड व शिक्षक मेज (FRONT OF ROOM) ⬛
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                कमरा: <strong className="text-slate-800">{selectedRoomName}</strong> • किसी भी छात्र की सीट पर क्लिक करके 1-टैप में अनुपस्थित मार्क करें!
              </p>
            </div>

            {/* 3 Physical Columns Grid */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center items-start w-full">
              {columns.map((col, colIdx) => (
                <div
                  key={col.colIndex}
                  className="flex-1 w-full bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs"
                >
                  <div className="text-center pb-2 mb-3 border-b border-slate-200">
                    <span className="text-xs font-black uppercase text-slate-800 block">
                      {col.name}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700">
                      {col.rowCount} बेंच ({col.rowCount * 2} सीटें)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Teacher Table in Middle Column if 7-6-7 */}
                    {col.rowCount < maxRows && colIdx === 1 && (
                      <div className="border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-amber-50/50 to-indigo-50 rounded-xl p-2.5 text-center shadow-xs">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-indigo-200 text-[10px] font-bold text-indigo-900">
                          <span>👨‍🏫 पंक्ति 1</span>
                          <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded text-[9px]">शिक्षक</span>
                        </div>
                        <div className="font-black text-xs text-indigo-950">
                          कक्ष निरीक्षक / शिक्षक मेज (Teacher Desk)
                        </div>
                        <div className="text-[9px] text-slate-600">उपस्थिति व प्रश्न पत्र वितरण पटल</div>
                      </div>
                    )}

                    {col.benches.map((bench) => {
                      const left = bench.leftSeat;
                      const right = bench.rightSeat;
                      const leftIsAbsent = left ? !!liveAbsentees[left.rollNo]?.isAbsent : false;
                      const rightIsAbsent = right ? !!liveAbsentees[right.rollNo]?.isAbsent : false;

                      return (
                        <div
                          key={bench.benchNumber}
                          className="border-2 border-slate-200 rounded-xl p-2 bg-white shadow-2xs relative"
                        >
                          {/* Bench Header */}
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px] font-black text-slate-800">
                            <span className="flex items-center gap-1">
                              <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px]">
                                #{bench.benchNumber}
                              </span>
                              <span>बेंच संख्या {bench.benchNumber}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase">2 सीटर</span>
                          </div>

                          {/* 2 Seats */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Left Seat */}
                            {left ? (
                              <button
                                type="button"
                                onClick={() => handleToggle(left)}
                                disabled={togglingRoll === left.rollNo}
                                className={`p-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                                  leftIsAbsent
                                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50'
                                    : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">बायां (Left)</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                        leftIsAbsent
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                      }`}
                                    >
                                      {leftIsAbsent ? 'ABSENT' : 'PRESENT'}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-base font-black font-mono text-slate-900 leading-tight">
                                    {left.rollNo}
                                  </div>

                                  <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                                    {left.name || 'छात्र'}
                                  </div>

                                  <div className="text-[10px] text-slate-500 truncate">
                                    {left.className} {left.section ? `(${left.section})` : ''} • {left.subject}
                                  </div>
                                </div>

                                <div className="mt-2 pt-1 border-t border-slate-200/60 text-[10px] font-bold text-center">
                                  {leftIsAbsent ? (
                                    <span className="text-emerald-700 flex items-center justify-center gap-1">
                                      <UserCheck className="w-3 h-3" />
                                      उपस्थित करें
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 flex items-center justify-center gap-1">
                                      <UserX className="w-3 h-3" />
                                      अनुपस्थित करें
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div className="p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] text-slate-400 font-bold">
                                खाली सीट
                              </div>
                            )}

                            {/* Right Seat */}
                            {right ? (
                              <button
                                type="button"
                                onClick={() => handleToggle(right)}
                                disabled={togglingRoll === right.rollNo}
                                className={`p-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                                  rightIsAbsent
                                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50'
                                    : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">दायां (Right)</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                        rightIsAbsent
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                      }`}
                                    >
                                      {rightIsAbsent ? 'ABSENT' : 'PRESENT'}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-base font-black font-mono text-slate-900 leading-tight">
                                    {right.rollNo}
                                  </div>

                                  <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                                    {right.name || 'छात्र'}
                                  </div>

                                  <div className="text-[10px] text-slate-500 truncate">
                                    {right.className} {right.section ? `(${right.section})` : ''} • {right.subject}
                                  </div>
                                </div>

                                <div className="mt-2 pt-1 border-t border-slate-200/60 text-[10px] font-bold text-center">
                                  {rightIsAbsent ? (
                                    <span className="text-emerald-700 flex items-center justify-center gap-1">
                                      <UserCheck className="w-3 h-3" />
                                      उपस्थित करें
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 flex items-center justify-center gap-1">
                                      <UserX className="w-3 h-3" />
                                      अनुपस्थित करें
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div className="p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] text-slate-400 font-bold">
                                खाली सीट
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Status Bar */}
      <div className="fixed bottom-3 inset-x-3 max-w-xl mx-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between z-30 border border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-emerald-300">उपस्थित: {presentCount}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
            <span className="font-bold text-rose-300">अनुपस्थित: {absentCount}</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          कमरा: <strong className="text-white">{selectedRoomName}</strong>
        </div>
      </div>
    </div>
  );
}
