import React, { useState, useMemo } from 'react';
import { 
  UserX, 
  CheckCircle2, 
  Printer, 
  FileSpreadsheet, 
  Filter, 
  RotateCcw, 
  Search, 
  AlertCircle, 
  Users, 
  Check,
  GraduationCap,
  DoorOpen,
  Copy,
  Smartphone,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { exportAbsenteeListToExcel } from '../utils/excelExport';

export default function AbsenteeManager({ 
  seatingResult = {}, 
  activeShift = 'shift_1',
  examDetails = {}, 
  absentStudents = {}, 
  setAbsentStudents,
  onToggleAbsent,
  teachers = []
}) {
  const { rooms = [] } = seatingResult;
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId || 'all');
  const [quickRollInput, setQuickRollInput] = useState('');
  const [searchFeedback, setSearchFeedback] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('class-wise'); // 'class-wise' | 'room-wise'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [filterOnlyAbsentClasses, setFilterOnlyAbsentClasses] = useState(false);
  const [copiedClassKey, setCopiedClassKey] = useState(null);
  const [printOption, setPrintOption] = useState('both'); // 'both' | 'class-wise' | 'room-wise'

  // Toggle single student absent status (Synchronized to Backend & MongoDB)
  const toggleAbsent = async (rollNo) => {
    const rollStr = rollNo.toString();
    const currentlyAbsent = Boolean(absentStudents[rollStr] || absentStudents[Number(rollNo)]);
    const newStatus = !currentlyAbsent;

    // Optimistic local state update
    const updated = { ...absentStudents };
    if (newStatus) {
      updated[rollStr] = true;
      updated[Number(rollNo)] = true;
    } else {
      delete updated[rollStr];
      delete updated[Number(rollNo)];
    }
    setAbsentStudents(updated);

    // Find student details from rooms
    let studentObj = null;
    let roomName = '';
    rooms.forEach((r) => {
      r.students?.forEach((s) => {
        if (s.rollNo?.toString() === rollStr) {
          studentObj = s;
          roomName = r.roomName;
        }
      });
    });

    if (onToggleAbsent) {
      await onToggleAbsent({
        rollNo: Number(rollNo),
        isAbsent: newStatus,
        roomName: roomName || 'General',
        sessionName: examDetails?.examName || 'Half Yearly  Examination 2026',
        date: examDetails?.date || new Date().toISOString().split('T')[0],
        shift: activeShift,
        studentName: studentObj?.name || '',
        className: studentObj?.className || '',
        section: studentObj?.section || '',
      });
    }
  };

  // Quick mark by roll number input
  const handleQuickMark = (e) => {
    e.preventDefault();
    const roll = quickRollInput.trim();
    if (!roll) return;

    let found = false;
    let foundRoom = '';
    rooms.forEach((r) => {
      r.students?.forEach((s) => {
        if (s.rollNo?.toString() === roll) {
          found = true;
          foundRoom = r.roomName;
        }
      });
    });

    if (found) {
      toggleAbsent(roll);
      setSearchFeedback(`रोल नंबर #${roll} (${foundRoom}) का स्टेटस बदला गया!`);
      setQuickRollInput('');
      setTimeout(() => setSearchFeedback(''), 4000);
    } else {
      setSearchFeedback(`त्रुटि: रोल नंबर #${roll} किसी भी कमरे में नहीं मिला!`);
      setTimeout(() => setSearchFeedback(''), 4000);
    }
  };

  // Clear all absentees
  const handleClearAll = async () => {
    if (window.confirm('क्या आप सभी अनुपस्थित (Absent) छात्रों की सूची रीसेट करना चाहते हैं?')) {
      setAbsentStudents({});
      try {
        await resetAbsenteesAPI({
          sessionName: examDetails?.examName || 'Half Yearly  Examination 2026',
          shift: activeShift,
          date: examDetails?.date || new Date().toISOString().split('T')[0],
        });
      } catch (e) {
        console.error('Reset absentees error:', e);
      }
    }
  };

  // 1. Generate Room-wise Absentee Summary Data
  const absenteeSummary = useMemo(() => {
    return rooms.map((room) => {
      const totalSeated = room.seatedCount || (room.students ? room.students.length : 0);
      const roomAbsentRolls = [];

      (room.students || []).forEach((s) => {
        if (absentStudents[s.rollNo?.toString()] || absentStudents[s.rollNo]) {
          roomAbsentRolls.push({
            rollNo: s.rollNo,
            name: s.name,
            className: s.className,
            section: s.section,
            subject: s.subject,
            benchNumber: s.benchNumber,
            roomName: room.roomName,
          });
        }
      });

      const absentCount = roomAbsentRolls.length;
      const presentCount = totalSeated - absentCount;
      const absentRollsText = roomAbsentRolls.map((a) => `#${a.rollNo}`).join(', ');

      return {
        roomId: room.roomId || room.id,
        roomName: room.roomName || room.name,
        totalSeated,
        presentCount,
        absentCount,
        absentRolls: roomAbsentRolls,
        absentRollsText,
        students: room.students || [],
      };
    });
  }, [rooms, absentStudents]);

  // 2. Flatten all Seated Students across the entire center
  const allSeatedStudents = useMemo(() => {
    const list = [];
    rooms.forEach((r) => {
      (r.students || []).forEach((st) => {
        list.push({
          ...st,
          roomName: r.roomName || r.name,
          roomId: r.roomId || r.id,
        });
      });
    });
    return list;
  }, [rooms]);

  // 3. Generate Class-Wise Absentee Summary Data (For Class Teachers)
  const classWiseSummary = useMemo(() => {
    const map = {};
    allSeatedStudents.forEach((st) => {
      const classKey = `${st.className || ''}_${st.section || ''}`.trim() || 'Other';
      if (!map[classKey]) {
        // Find assigned Class Teacher from teachers directory
        const teacherRec = (teachers || []).find((t) => {
          const matchClass = String(t.assignedClass || '').trim() === String(st.className || '').trim();
          const matchSec = !t.assignedSection || String(t.assignedSection || '').trim().toUpperCase() === String(st.section || '').trim().toUpperCase();
          return matchClass && matchSec;
        });

        map[classKey] = {
          classKey,
          className: st.className || 'कक्षा',
          section: st.section || '',
          displayName: `कक्षा ${st.className || ''}${st.section ? ` - सेक्शन ${st.section}` : ''}`,
          classTeacherName: teacherRec ? teacherRec.name : '',
          classTeacherMobile: teacherRec ? teacherRec.mobile : '',
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          students: [],
          absentStudents: [],
        };
      }

      map[classKey].totalStudents++;
      map[classKey].students.push(st);

      const isAbsent = Boolean(absentStudents[st.rollNo?.toString()] || absentStudents[st.rollNo]);
      if (isAbsent) {
        map[classKey].absentCount++;
        map[classKey].absentStudents.push(st);
      } else {
        map[classKey].presentCount++;
      }
    });

    // Sort numerically by class, then section
    return Object.values(map).sort((a, b) => {
      const numA = parseInt(a.className, 10) || 0;
      const numB = parseInt(b.className, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.section || '').localeCompare(b.section || '');
    });
  }, [allSeatedStudents, absentStudents, teachers]);

  // 4. Flat list of all absent students
  const flatAbsentStudents = useMemo(() => {
    return allSeatedStudents
      .filter((st) => Boolean(absentStudents[st.rollNo?.toString()] || absentStudents[st.rollNo]))
      .sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
  }, [allSeatedStudents, absentStudents]);

  // Center Totals
  const totalAllocated = absenteeSummary.reduce((sum, r) => sum + r.totalSeated, 0);
  const totalAbsent = absenteeSummary.reduce((sum, r) => sum + r.absentCount, 0);
  const totalPresent = totalAllocated - totalAbsent;
  const classesWithAbsenteesCount = classWiseSummary.filter((c) => c.absentCount > 0).length;

  // Active room data for Room-Wise View
  const currentRoomData = absenteeSummary.find((r) => r.roomId === selectedRoomId) || absenteeSummary[0];

  // Filtered Class Groups for UI
  const displayedClasses = useMemo(() => {
    return classWiseSummary.filter((cls) => {
      if (selectedClassFilter !== 'all' && cls.classKey !== selectedClassFilter) {
        return false;
      }
      if (filterOnlyAbsentClasses && cls.absentCount === 0) {
        return false;
      }
      return true;
    });
  }, [classWiseSummary, selectedClassFilter, filterOnlyAbsentClasses]);

  const handlePrint = (mode = 'both') => {
    setPrintOption(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportExcel = () => {
    exportAbsenteeListToExcel({
      absentStudentsList: flatAbsentStudents,
      classSummary: classWiseSummary,
      roomSummary: absenteeSummary,
    }, examDetails);
  };

  // WhatsApp absentee message copy handler for Class Teachers
  const handleCopyClassAbsent = (cls) => {
    const absentListText = cls.absentStudents.length > 0
      ? cls.absentStudents.map((st, i) => `${i + 1}. रोल #${st.rollNo} - ${st.name || 'परीक्षार्थी'} (${st.roomName}, बेंच #${st.benchNumber || '—'})`).join('\n')
      : '✅ सभी परीक्षार्थी उपस्थित हैं (निरंक)';

    const text = `*${examDetails.schoolName || 'ए.बी.वी.आई.सी. मीरांपुर कटरा'}*\n*कक्षा-वार अनुपस्थिति रिपोर्ट (Class Absentee List)*\n📅 दिनांक: ${examDetails.date || ''} | समय: ${examDetails.timeRange || ''}\n🎓 कक्षा: ${cls.displayName}${cls.classTeacherName ? `\n👨‍🏫 कक्षाध्यापक: ${cls.classTeacherName}` : ''}\n----------------------------------\n👥 कुल छात्र: ${cls.totalStudents}\n✅ उपस्थित: ${cls.presentCount}\n❌ अनुपस्थित: ${cls.absentCount}\n----------------------------------\n*अनुपस्थित छात्र सूची:*\n${absentListText}\n----------------------------------\n_रिपोर्ट समय: ${new Date().toLocaleTimeString('hi-IN')}_`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedClassKey(cls.classKey);
      setTimeout(() => setCopiedClassKey(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (No Print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-600 text-white rounded-lg">
              <UserX className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-800">
              कक्षा एवं कमरा-वार अनुपस्थित छात्र प्रबंधन (Exam Absentee System)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            कक्षाध्यापक (Class Teacher) अपनी कक्षा की रिपोर्ट देखें एवं परीक्षा प्रभारी कमरा अनुसार पत्रक प्रिंट करें
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>एक्सेल (.xlsx)</span>
          </button>

          {/* Print Dropdown Buttons */}
          <div className="inline-flex rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
            <button
              type="button"
              onClick={() => handlePrint('class-wise')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-all border-r border-indigo-200 cursor-pointer"
              title="केवल कक्षा-वार पत्रक प्रिंट करें"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>कक्षा-वार प्रिंट</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint('both')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="दोनों (कक्षा व कमरा) पत्रक प्रिंट करें"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट पत्रक</span>
            </button>
          </div>

          {totalAbsent > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all marked absentees"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Scoreboard (No Print) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">कुल आबंटित छात्र</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalAllocated}</p>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">कुल उपस्थित छात्र</span>
          <p className="text-xl font-black text-emerald-800 mt-1">{totalPresent}</p>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-rose-700 uppercase">कुल अनुपस्थित छात्र</span>
          <p className="text-xl font-black text-rose-800 mt-1">{totalAbsent}</p>
        </div>

        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-indigo-700 uppercase">अनुपस्थित कक्षाएं</span>
          <p className="text-xl font-black text-indigo-800 mt-1">
            {classesWithAbsenteesCount} <span className="text-xs font-normal text-slate-500">/ {classWiseSummary.length} कक्षाएं</span>
          </p>
        </div>
      </div>

      {/* Quick Mark Input Bar (No Print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
        <form onSubmit={handleQuickMark} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 relative w-full">
            <input
              type="number"
              inputMode="numeric"
              placeholder="रोल नंबर टाइप करें और Enter दबाएं (उदा. 9105, 10102)..."
              value={quickRollInput}
              onChange={(e) => setQuickRollInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            + अनुपस्थित मार्क करें (Toggle Absent)
          </button>
        </form>

        {searchFeedback && (
          <p className="text-xs font-bold text-indigo-600 mt-2 animate-pulse">
            {searchFeedback}
          </p>
        )}
      </div>

      {/* View Switcher: Class-Wise vs Room-Wise (No Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveViewMode('class-wise')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'class-wise'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>कक्षा-वार अनुपस्थिति (Class Teacher View)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              totalAbsent > 0 ? 'bg-rose-500 text-white font-black' : 'bg-black/10'
            }`}>
              {totalAbsent}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('room-wise')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'room-wise'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>कमरा-वार सीटिंग व उपस्थिति (Room View)</span>
          </button>
        </div>

        {/* Info Hint */}
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {activeViewMode === 'class-wise'
              ? 'प्रत्येक कक्षा के अनुपस्थित छात्र उनके आवंटित कमरे सहित'
              : 'कमरे अनुसार सीटिंग कार्ड्स पर 1-क्लिक अनुपस्थिति मार्क करें'}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW A: CLASS-WISE ABSENTEE REGISTER (FOR CLASS TEACHERS)*/}
      {/* ======================================================== */}
      {activeViewMode === 'class-wise' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 no-print space-y-5">
          {/* Class Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">कक्षा चुनें:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500"
              >
                <option value="all">सभी कक्षाएं (All Classes)</option>
                {classWiseSummary.map((cls) => (
                  <option key={cls.classKey} value={cls.classKey}>
                    {cls.displayName} {cls.absentCount > 0 ? `(${cls.absentCount} अनुपस्थित)` : '(पूर्ण उपस्थित)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOnlyAbsentClasses(!filterOnlyAbsentClasses)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterOnlyAbsentClasses
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>केवल अनुपस्थित वाली कक्षाएं ({classesWithAbsenteesCount})</span>
              </button>
            </div>
          </div>

          {/* Class Cards Grid */}
          <div className="space-y-4">
            {displayedClasses.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-sm">
                कोई कक्षा नहीं मिली।
              </div>
            ) : (
              displayedClasses.map((cls) => (
                <div
                  key={cls.classKey}
                  className={`rounded-2xl border-2 transition-all overflow-hidden ${
                    cls.absentCount > 0
                      ? 'bg-white border-rose-300 shadow-sm ring-1 ring-rose-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header Banner */}
                  <div className={`p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 ${
                    cls.absentCount > 0
                      ? 'bg-gradient-to-r from-rose-900 via-slate-900 to-indigo-950 text-white'
                      : 'bg-slate-900 text-white'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <h3 className="text-sm sm:text-base font-black tracking-tight">
                          {cls.displayName}
                        </h3>
                        {cls.classTeacherName && (
                          <span className="text-[11px] text-amber-200 font-medium block">
                            👨‍🏫 कक्षाध्यापक: {cls.classTeacherName} {cls.classTeacherMobile ? `(मो. ${cls.classTeacherMobile})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-slate-200 text-xs font-bold">
                        कुल: {cls.totalStudents}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                        उपस्थित: {cls.presentCount}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        cls.absentCount > 0
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        अनुपस्थित: {cls.absentCount}
                      </span>

                      {/* WhatsApp Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyClassAbsent(cls)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer ml-1"
                        title="व्हाट्सएप पर शेयर करने के लिए कॉपी करें"
                      >
                        {copiedClassKey === cls.classKey ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>कॉपी हो गया!</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>व्हाट्सएप कॉपी</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 sm:p-4">
                    {cls.absentCount === 0 ? (
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>इस कक्षा के सभी छात्र परीक्षा में उपस्थित हैं (No Absentees)।</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                          <UserX className="w-4 h-4 text-rose-600" />
                          <span>अनुपस्थित छात्र सूची ({cls.absentCount} छात्र):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {cls.absentStudents.map((st) => (
                            <div
                              key={`${st.rollNo}-${st.roomId}`}
                              className="p-3 bg-rose-50/80 border-2 border-rose-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-base text-rose-900">
                                    #{st.rollNo}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                                    {st.roomName}
                                  </span>
                                  {st.benchNumber && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600">
                                      बेंच #{st.benchNumber}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs font-bold text-slate-900 truncate mt-1">
                                  {st.name || 'परीक्षार्थी'}
                                </div>

                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  विषय: {st.subject || 'सामान्य विषय'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleAbsent(st.rollNo)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
                                title="उपस्थित करें"
                              >
                                <Check className="w-3 h-3" />
                                <span>उपस्थित करें</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW B: ROOM-WISE STUDENT CARDS & BENCH MARKING GRID     */}
      {/* ======================================================== */}
      {activeViewMode === 'room-wise' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 no-print space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">कमरा चुनें:</span>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500"
              >
                <option value="all">सभी कमरों का समग्र विवरण (Consolidated Table)</option>
                {rooms.map((r) => (
                  <option key={r.roomId || r.id} value={r.roomId || r.id}>
                    {r.roomName || r.name} ({r.seatedCount || (r.students ? r.students.length : 0)} छात्र)
                  </option>
                ))}
              </select>
            </div>

            {currentRoomData && selectedRoomId !== 'all' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">
                  आबंटित: {currentRoomData.totalSeated}
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                  उपस्थित: {currentRoomData.presentCount}
                </span>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-black">
                  अनुपस्थित: {currentRoomData.absentCount}
                </span>
              </div>
            )}
          </div>

          {/* Student Cards for Selected Room */}
          {selectedRoomId !== 'all' && currentRoomData && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-2">
                छात्र के कार्ड पर क्लिक करके उसे अनुपस्थित (Absent) या उपस्थित (Present) करें:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {currentRoomData.students.map((st) => {
                  const isAbsent = Boolean(absentStudents[st.rollNo?.toString()] || absentStudents[st.rollNo]);
                  return (
                    <button
                      key={st.id || st.rollNo}
                      type="button"
                      onClick={() => toggleAbsent(st.rollNo)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all relative cursor-pointer active:scale-95 ${
                        isAbsent
                          ? 'border-rose-500 bg-rose-50 shadow-sm ring-1 ring-rose-400'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
                        <span className="text-[10px] font-black text-slate-600">
                          {st.className}-{st.section}
                        </span>
                        {isAbsent ? (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9px] font-black">
                            ABSENT
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                            Present
                          </span>
                        )}
                      </div>

                      <div className="font-mono font-black text-sm text-slate-900">
                        #{st.rollNo}
                      </div>

                      <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                        {st.name || 'परीक्षार्थी'}
                      </div>

                      <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                        {st.subject || 'All'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PRINTABLE SHEETS (Always Visible on Print)               */}
      {/* ======================================================== */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* ===================================================== */}
        {/* PRINT SECTION 1: CLASS-WISE STATEMENT FOR CLASS TEACHERS */}
        {/* ===================================================== */}
        {(printOption === 'both' || printOption === 'class-wise') && (
          <div className="mb-10 print:mb-12 print:page-break-after">
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h1>
              <p className="text-sm sm:text-base font-bold text-indigo-900 mt-1">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="inline-flex items-center gap-4 mt-2 px-4 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 border border-slate-300">
                <span>📅 दिनांक: {examDetails.date}</span>
                <span>•</span>
                <span>⏰ समय / शिफ्ट: {examDetails.timeRange}</span>
              </div>
              <div className="mt-3">
                <span className="px-3 py-1 bg-indigo-900 text-white text-xs font-black tracking-widest uppercase rounded">
                  CLASS-WISE ABSENTEE STATEMENT (कक्षावार अनुपस्थित छात्र विवरण पत्रक - कक्षाध्यापक पटल)
                </span>
              </div>
            </div>

            {/* Class-Wise Master Table */}
            <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                    <tr>
                      <th className="px-2.5 py-2.5 border-r border-slate-700 w-10 text-center">क्र.</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-28">कक्षा व वर्ग</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-44">कक्षाध्यापक का नाम</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-16">नामांकित</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-16">उपस्थित</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-16 font-black text-amber-300">
                        अनुपस्थित
                      </th>
                      <th className="px-3 py-2.5 border-r border-slate-700">
                        अनुपस्थित परीक्षार्थियों के रोल नंबर व नाम (कमरा सहित)
                      </th>
                      <th className="px-3 py-2.5 w-28 text-center">कक्षाध्यापक हस्ताक्षर</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {classWiseSummary.map((row, idx) => (
                      <tr key={row.classKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-2.5 py-2 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {row.displayName}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200 text-[11px]">
                          {row.classTeacherName || '—'}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200">
                          {row.totalStudents}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-emerald-700 border-r border-slate-200">
                          {row.presentCount}
                        </td>
                        <td className="px-2 py-2 text-center font-black text-rose-700 border-r border-slate-200 text-sm">
                          {row.absentCount > 0 ? row.absentCount : '0'}
                        </td>
                        <td className="px-3 py-2 font-mono border-r border-slate-200">
                          {row.absentCount > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.absentStudents.map((ab, abIdx) => (
                                <span
                                  key={abIdx}
                                  className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded text-[11px] font-bold"
                                >
                                  #{ab.rollNo} {ab.name ? `(${ab.name})` : ''} - {ab.roomName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal italic">निरंक (Nil)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-300">
                          _________________
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-200 border-t-2 border-slate-900 font-extrabold text-slate-900">
                    <tr>
                      <td colSpan="3" className="px-4 py-2.5 text-right border-r border-slate-300">
                        संपूर्ण विद्यालय योग (School Grand Total):
                      </td>
                      <td className="px-2 py-2.5 text-center border-r border-slate-300 text-sm">
                        {totalAllocated}
                      </td>
                      <td className="px-2 py-2.5 text-center border-r border-slate-300 text-sm text-emerald-800">
                        {totalPresent}
                      </td>
                      <td className="px-2 py-2.5 text-center border-r border-slate-300 text-sm text-rose-800 font-black">
                        {totalAbsent}
                      </td>
                      <td colSpan="2" className="px-3 py-2.5 text-slate-700 font-bold text-[11px]">
                        कुल अनुपस्थित छात्र: {totalAbsent} (कक्षाध्यापक रजिस्टर में दर्ज करें)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Notes & Signatures for Class Statement */}
            <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <p className="text-[11px] text-slate-500">
                * सभी संबंधित कक्षाध्यापक परीक्षा उपरांत अपनी कक्षा के अनुपस्थित छात्रों की प्रविष्टि दैनिक उपस्थिति पंजिका (Attendance Register) में करें।
              </p>
              <div className="flex items-center gap-10 text-center">
                <div>
                  <div className="w-32 h-6 border-b border-dashed border-slate-400"></div>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5">हस्ताक्षर परीक्षा प्रभारी</p>
                </div>
                <div>
                  <div className="w-32 h-6 border-b border-dashed border-slate-400"></div>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5">हस्ताक्षर प्रधानाचार्य / सील</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* PRINT SECTION 2: ROOM-WISE STATEMENT FOR SUPERINTENDENT*/}
        {/* ===================================================== */}
        {(printOption === 'both' || printOption === 'room-wise') && (
          <div>
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h1>
              <p className="text-sm sm:text-base font-bold text-indigo-900 mt-1">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="inline-flex items-center gap-4 mt-2 px-4 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 border border-slate-300">
                <span>📅 दिनांक: {examDetails.date}</span>
                <span>•</span>
                <span>⏰ समय / शिफ्ट: {examDetails.timeRange}</span>
              </div>
              <div className="mt-3">
                <span className="px-3 py-1 bg-rose-900 text-white text-xs font-black tracking-widest uppercase rounded">
                  ROOM-WISE ABSENTEE STATEMENT (कक्षवार अनुपस्थित छात्र विवरण पत्रक - परीक्षा अधीक्षक पटल)
                </span>
              </div>
            </div>

            {/* Room-Wise Master Table */}
            <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                  <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-12 text-center">क्र.</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">कमरा / हॉल का नाम</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-center">आबंटित</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-center">उपस्थित</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-center font-black text-amber-300">
                        अनुपस्थित
                      </th>
                      <th className="px-3 py-2.5 border-r border-slate-700">
                        अनुपस्थित छात्रों के रोल नंबर (Absent Roll Numbers)
                      </th>
                      <th className="px-3 py-2.5 w-32 text-center">कक्ष निरीक्षक हस्ताक्षर</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {absenteeSummary.map((row, idx) => {
                      if (row.totalSeated === 0) return null;
                      return (
                        <tr key={row.roomId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 text-center font-bold text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-black text-slate-900 border-r border-slate-200">
                            {row.roomName}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            {row.totalSeated}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700 border-r border-slate-200">
                            {row.presentCount}
                          </td>
                          <td className="px-3 py-2 text-center font-black text-rose-700 border-r border-slate-200 text-sm">
                            {row.absentCount > 0 ? row.absentCount : '0'}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold border-r border-slate-200">
                            {row.absentCount > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.absentRolls.map((ab, abIdx) => (
                                  <span
                                    key={abIdx}
                                    className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded text-xs"
                                  >
                                    {ab.className}-{ab.section}: #{ab.rollNo}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">निरंक (Nil)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-300">
                            _________________
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-200 border-t-2 border-slate-900 font-extrabold text-slate-900">
                    <tr>
                      <td colSpan="2" className="px-4 py-2.5 text-right border-r border-slate-300">
                        संपूर्ण केंद्र महायोग (Grand Total):
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-slate-300 text-sm">
                        {totalAllocated}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-slate-300 text-sm text-emerald-800">
                        {totalPresent}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-slate-300 text-sm text-rose-800 font-black">
                        {totalAbsent}
                      </td>
                      <td colSpan="2" className="px-3 py-2.5 text-slate-600 font-semibold text-[11px]">
                        कुल अनुपस्थित छात्र: {totalAbsent}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Notes & Signatures for Room Statement */}
            <div className="mt-8 pt-4 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-800">प्रमाण-पत्र (Certificate):</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                  प्रमाणित किया जाता है कि उपरोक्त विवरण परीक्षा कक्षों में उपस्थित एवं अनुपस्थित छात्रों के वास्तविक सत्यापन उपरांत तैयार किया गया है।
                </p>
              </div>
              <div className="mt-6 sm:mt-0 flex items-center gap-12 text-center">
                <div>
                  <div className="w-36 h-8 border-b border-dashed border-slate-400"></div>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">हस्ताक्षर परीक्षा प्रभारी</p>
                </div>
                <div>
                  <div className="w-36 h-8 border-b border-dashed border-slate-400"></div>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">हस्ताक्षर केंद्राध्यक्ष / सील</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
