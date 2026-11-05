import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserX,
  UserCheck,
  Layers, 
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
  Info,
  BookOpen,
  ClipboardList,
  Download,
  FileCheck,
  Award,
  LayoutGrid,
  X
} from 'lucide-react';
import { 
  exportAbsenteeListToExcel, 
  exportReExamListToExcel, 
  exportClassAttendanceMatrixToExcel,
  export2DMatrixToExcel
} from '../utils/excelExport';
import { EXAM_TIMETABLE, EXAM_SCHEME_METADATA, getTodayExamDay, areDatesMatching, normalizeDateToYYYYMMDD } from '../data/examSchemeData';
import { fetchLiveAbsenteesAPI, fetchLiveCopiesAPI } from '../services/api';

export default function AbsenteeManager({ 
  seatingResult = {}, 
  activeShift = 'shift_1',
  examDetails = {}, 
  absentStudents = {}, 
  setAbsentStudents,
  onToggleAbsent,
  teachers = [],
  bCopyRecords = {},
  onUpdateBCopy,
  classes = []
}) {
  const { rooms = [] } = seatingResult;
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId || 'all');
  const [quickRollInput, setQuickRollInput] = useState('');
  const [searchFeedback, setSearchFeedback] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('class-wise'); // 'class-wise' | 'room-wise' | 're-exam' | 'register-matrix'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [filterOnlyAbsentClasses, setFilterOnlyAbsentClasses] = useState(false);
  const todayDateStr = useMemo(() => getTodayExamDay().fullDate || '2026-11-05', []);
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => todayDateStr);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all'); // 'all' | 'absent' | 'present' | 'b-copy'
  const [copiedClassKey, setCopiedClassKey] = useState(null);
  const [printOption, setPrintOption] = useState('both'); // 'both' | 'class-wise' | 'room-wise' | 're-exam' | 'register-matrix'
  const [reExamSearch, setReExamSearch] = useState('');
  const [reExamClassFilter, setReExamClassFilter] = useState('all');
  const [matrixSelectedClass, setMatrixSelectedClass] = useState('all');
  const [selectedMatrixCell, setSelectedMatrixCell] = useState(null);

  // Load all dates absentee records from MongoDB
  const [allDatesAbsentees, setAllDatesAbsentees] = useState([]);
  const [isLoadingAllDates, setIsLoadingAllDates] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setIsLoadingAllDates(true);
      try {
        const res = await fetchLiveAbsenteesAPI({
          sessionName: examDetails.examName,
          date: 'all',
          shift: 'all',
        });
        if (isMounted && res && res.records) {
          setAllDatesAbsentees(res.records.filter((r) => r.isAbsent));
        }
      } catch (err) {
        console.error('Failed to load all dates absentees:', err);
      } finally {
        if (isMounted) setIsLoadingAllDates(false);
      }
    };
    loadAll();
    return () => { isMounted = false; };
  }, [examDetails.examName, absentStudents]);

  // Load date-wise B-copies dynamically when date filter changes
  const [dateWiseCopyMap, setDateWiseCopyMap] = useState({});
  const [loadedCopyDate, setLoadedCopyDate] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveCopiesAPI({
      sessionName: examDetails?.examName,
      date: selectedDateFilter,
      shift: activeShift,
    }).then((res) => {
      if (isMounted) {
        if (res && res.success && res.copyMap) {
          setDateWiseCopyMap(res.copyMap);
        } else {
          setDateWiseCopyMap({});
        }
        setLoadedCopyDate(selectedDateFilter);
      }
    }).catch(() => {
      if (isMounted) {
        setDateWiseCopyMap({});
        setLoadedCopyDate(selectedDateFilter);
      }
    });
    return () => { isMounted = false; };
  }, [selectedDateFilter, activeShift, examDetails?.examName, bCopyRecords]);

  const activeCopyMap = useMemo(() => {
    // If we have loaded data for this selectedDateFilter, use it directly (even if empty, i.e., 0 B-copies)
    if (loadedCopyDate === selectedDateFilter) {
      return dateWiseCopyMap || {};
    }
    // If selected date matches today/activeDate, can initially show bCopyRecords while loading
    if (areDatesMatching(selectedDateFilter, examDetails?.date) || areDatesMatching(selectedDateFilter, todayDateStr)) {
      return bCopyRecords || {};
    }
    // Future or other dates start at 0 while loading
    return {};
  }, [dateWiseCopyMap, loadedCopyDate, selectedDateFilter, bCopyRecords, examDetails?.date, todayDateStr]);

  // Helper to fetch B-copies for a student
  const getStudentBCopies = (rollNo) => {
    const rollStr = String(rollNo);
    const rec = activeCopyMap[rollStr] || activeCopyMap[Number(rollNo)];
    return rec?.bCopiesCount || 0;
  };

  // Center-wide total B-copies
  const totalCenterBCopies = useMemo(() => {
    return Object.values(activeCopyMap || {}).reduce((sum, rec) => sum + (rec?.bCopiesCount || 0), 0);
  }, [activeCopyMap]);

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

  // Compute effective absentees map for the selected date (supports single date & all dates)
  const effectiveAbsenteesMap = useMemo(() => {
    const map = {};
    if (selectedDateFilter === 'all') {
      (allDatesAbsentees || []).forEach((r) => {
        if (r.rollNo) {
          map[String(r.rollNo)] = true;
          map[Number(r.rollNo)] = true;
        }
      });
      Object.keys(absentStudents || {}).forEach((k) => {
        if (absentStudents[k]) map[k] = true;
      });
      return map;
    }

    // Match selectedDateFilter against allDatesAbsentees strictly using canonical date matching
    (allDatesAbsentees || []).forEach((r) => {
      if (r.rollNo && areDatesMatching(r.date, selectedDateFilter)) {
        map[String(r.rollNo)] = true;
        map[Number(r.rollNo)] = true;
      }
    });

    // Also include live local absentStudents ONLY if selected date is truly today's active date
    const todayFullDate = getTodayExamDay().fullDate;
    const isToday =
      areDatesMatching(selectedDateFilter, todayFullDate) ||
      areDatesMatching(selectedDateFilter, getTodayExamDay().date) ||
      areDatesMatching(selectedDateFilter, examDetails?.date);
    if (isToday) {
      Object.keys(absentStudents || {}).forEach((k) => {
        if (absentStudents[k]) {
          map[String(k)] = true;
          map[Number(k)] = true;
        }
      });
    }

    return map;
  }, [selectedDateFilter, examDetails?.date, absentStudents, allDatesAbsentees]);

  // 1. Generate Room-wise Absentee Summary Data
  const absenteeSummary = useMemo(() => {
    return rooms.map((room) => {
      const totalSeated = room.seatedCount || (room.students ? room.students.length : 0);
      const roomAbsentRolls = [];
      let roomBCopies = 0;

      (room.students || []).forEach((s) => {
        if (effectiveAbsenteesMap[s.rollNo?.toString()] || effectiveAbsenteesMap[s.rollNo]) {
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
        roomBCopies += getStudentBCopies(s.rollNo);
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
        bCopiesCount: roomBCopies,
        absentRolls: roomAbsentRolls,
        absentRollsText,
        students: room.students || [],
      };
    });
  }, [rooms, effectiveAbsenteesMap, activeCopyMap]);

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
          bCopiesCount: 0,
          students: [],
          absentStudents: [],
        };
      }

      map[classKey].totalStudents++;
      map[classKey].students.push(st);

      const stBCopies = getStudentBCopies(st.rollNo);
      map[classKey].bCopiesCount += stBCopies;

      const isAbsent = Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]);
      if (!map[classKey].presentStudents) map[classKey].presentStudents = [];
      if (!map[classKey].bCopyStudents) map[classKey].bCopyStudents = [];

      if (isAbsent) {
        map[classKey].absentCount++;
        map[classKey].absentStudents.push(st);
      } else {
        map[classKey].presentCount++;
        map[classKey].presentStudents.push(st);
      }
      if (stBCopies > 0) {
        map[classKey].bCopyStudents.push(st);
      }
    });

    // Sort numerically by class, then section
    return Object.values(map).sort((a, b) => {
      const numA = parseInt(a.className, 10) || 0;
      const numB = parseInt(b.className, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.section || '').localeCompare(b.section || '');
    });
  }, [allSeatedStudents, effectiveAbsenteesMap, teachers, activeCopyMap]);

  // 4. Flat list of all absent students
  const flatAbsentStudents = useMemo(() => {
    return allSeatedStudents
      .filter((st) => Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]))
      .sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
  }, [allSeatedStudents, effectiveAbsenteesMap]);

  // 5. Compute 2D Room-wise x Class-wise Matrix Data
  const {
    matrixColumns,
    matrixRows,
    matrixColTotals,
    matrixGrandTotal,
    allBCopyDetails,
    allAbsentDetails,
  } = useMemo(() => {
    const colMap = {};
    allSeatedStudents.forEach((st) => {
      const classKey = `${st.className || ''}_${st.section || ''}`.trim() || 'Other';
      if (!colMap[classKey]) {
        colMap[classKey] = {
          classKey,
          className: st.className || '',
          section: st.section || '',
          displayName: `${st.className || ''}-${st.section || ''}`.trim(),
        };
      }
    });

    const matrixColumns = Object.values(colMap).sort((a, b) => {
      const numA = parseInt(a.className, 10) || 0;
      const numB = parseInt(b.className, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.section || '').localeCompare(b.section || '');
    });

    const matrixColTotals = {};
    matrixColumns.forEach((c) => {
      matrixColTotals[c.classKey] = { totalA: 0, totalB: 0, totalAllocated: 0, totalAbsent: 0 };
    });

    const allBCopyDetails = [];
    const allAbsentDetails = [];

    const matrixRows = rooms.map((room) => {
      const cells = {};
      let rowTotalA = 0;
      let rowTotalB = 0;
      let rowTotalAllocated = 0;
      let rowTotalAbsent = 0;

      matrixColumns.forEach((col) => {
        const studentsInCell = (room.students || []).filter((s) => {
          const matchClass = String(s.className || '').trim() === String(col.className).trim();
          const matchSec = String(s.section || '').trim().toUpperCase() === String(col.section).trim().toUpperCase();
          return matchClass && matchSec;
        });

        const totalSeated = studentsInCell.length;
        if (totalSeated === 0) {
          cells[col.classKey] = {
            classKey: col.classKey,
            displayName: col.displayName,
            totalSeated: 0,
            presentCount: 0,
            absentCount: 0,
            bCopiesCount: 0,
            students: [],
            studentsWithB: [],
            absentStudents: [],
            rollRange: '—',
          };
          return;
        }

        rowTotalAllocated += totalSeated;
        matrixColTotals[col.classKey].totalAllocated += totalSeated;

        let cellAbsent = 0;
        let cellB = 0;
        const absentStudents = [];
        const studentsWithB = [];
        const rolls = [];

        studentsInCell.forEach((st) => {
          rolls.push(Number(st.rollNo));
          const isAbs = Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]);
          const bCount = getStudentBCopies(st.rollNo);

          if (isAbs) {
            cellAbsent++;
            absentStudents.push(st);
            allAbsentDetails.push({
              roomName: room.roomName || room.name,
              roomId: room.roomId || room.id,
              className: col.className,
              section: col.section,
              rollNo: st.rollNo,
              name: st.name || '',
            });
          }
          if (bCount > 0) {
            cellB += bCount;
            const bRec = activeCopyMap[String(st.rollNo)] || activeCopyMap[Number(st.rollNo)];
            studentsWithB.push({
              rollNo: st.rollNo,
              name: st.name || '',
              bCount,
              bCopyNumbers: bRec?.bCopyNumbers || [],
              aCopyNumber: bRec?.aCopyNumber || '',
            });
            allBCopyDetails.push({
              roomName: room.roomName || room.name,
              roomId: room.roomId || room.id,
              className: col.className,
              section: col.section,
              rollNo: st.rollNo,
              name: st.name || '',
              bCount,
              bCopyNumbers: bRec?.bCopyNumbers || [],
              aCopyNumber: bRec?.aCopyNumber || '',
            });
          }
        });

        const presentCount = totalSeated - cellAbsent;
        rowTotalA += presentCount;
        rowTotalB += cellB;
        rowTotalAbsent += cellAbsent;

        matrixColTotals[col.classKey].totalA += presentCount;
        matrixColTotals[col.classKey].totalB += cellB;
        matrixColTotals[col.classKey].totalAbsent += cellAbsent;

        rolls.sort((a, b) => a - b);
        const minRoll = rolls[0];
        const maxRoll = rolls[rolls.length - 1];
        const rollRange = minRoll === maxRoll ? `#${minRoll}` : `#${minRoll}-${maxRoll}`;

        cells[col.classKey] = {
          classKey: col.classKey,
          displayName: col.displayName,
          totalSeated,
          presentCount,
          absentCount: cellAbsent,
          bCopiesCount: cellB,
          students: studentsInCell,
          studentsWithB,
          absentStudents,
          rollRange,
        };
      });

      return {
        roomId: room.roomId || room.id,
        roomName: room.roomName || room.name,
        cells,
        rowTotalAllocated,
        rowTotalA,
        rowTotalB,
        rowTotalAbsent,
        rowGrandTotal: rowTotalA + rowTotalB,
      };
    });

    const matrixGrandTotal = {
      totalAllocated: matrixRows.reduce((sum, r) => sum + r.rowTotalAllocated, 0),
      totalA: matrixRows.reduce((sum, r) => sum + r.rowTotalA, 0),
      totalB: matrixRows.reduce((sum, r) => sum + r.rowTotalB, 0),
      totalAbsent: matrixRows.reduce((sum, r) => sum + r.rowTotalAbsent, 0),
      totalCopies: matrixRows.reduce((sum, r) => sum + r.rowGrandTotal, 0),
    };

    return {
      matrixColumns,
      matrixRows,
      matrixColTotals,
      matrixGrandTotal,
      allBCopyDetails,
      allAbsentDetails,
    };
  }, [allSeatedStudents, rooms, effectiveAbsenteesMap, activeCopyMap]);

  const handleExport2DMatrixExcel = () => {
    export2DMatrixToExcel({
      matrixRows,
      matrixColumns,
      colTotals: matrixColTotals,
      grandTotal: matrixGrandTotal,
      bCopyDetails: allBCopyDetails,
      absentDetails: allAbsentDetails,
    }, examDetails);
  };

  const displayedMatrixColumns = useMemo(() => {
    if (matrixSelectedClass === 'all') return matrixColumns;
    return matrixColumns.filter((c) => c.classKey === matrixSelectedClass);
  }, [matrixColumns, matrixSelectedClass]);

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
      : '✅ सभी परीक्षार्थी उपस्थित हैं (शत-प्रतिशत उपस्थिति)';

    const text = `*${examDetails.schoolName || 'ए.बी.वी.आई.सी. मीरांपुर कटरा'}*\n*कक्षा-वार अनुपस्थिति व कॉपी रिपोर्ट (Class Absentee & Copy List)*\n📅 दिनांक: ${examDetails.date || ''} | समय: ${examDetails.timeRange || ''}\n🎓 कक्षा: ${cls.displayName}${cls.classTeacherName ? `\n👨‍🏫 कक्षाध्यापक: ${cls.classTeacherName}` : ''}\n----------------------------------\n👥 कुल छात्र: ${cls.totalStudents}\n✅ उपस्थित ('A' कॉपियां): ${cls.presentCount}\n📙 पूरक 'B' कॉपियां: ${cls.bCopiesCount || 0}\n❌ अनुपस्थित: ${cls.absentCount}\n----------------------------------\n*अनुपस्थित छात्र सूची:*\n${absentListText}\n----------------------------------\n_रिपोर्ट समय: ${new Date().toLocaleTimeString('hi-IN')}_`;

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
              कक्षा एवं कमरा-वार अनुपस्थित व उत्तर-पुस्तिका प्रबंधन (Attendance & Copy System)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            कक्षाध्यापक (Class Teacher) अपनी कक्षा की रिपोर्ट देखें एवं परीक्षा प्रभारी कमरा अनुसार पत्रक व कॉपी विवरण प्रिंट करें
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export Buttons */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="कक्षा व कमरा अनुपस्थिति एक्सेल डाउनलोड करें"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>एक्सेल (सामान्य)</span>
          </button>

          <button
            type="button"
            onClick={handleExport2DMatrixExcel}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="2D उत्तर-पुस्तिका वितरण मैट्रिक्स एक्सेल (.xlsx) डाउनलोड करें"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>2D मैट्रिक्स (.xlsx)</span>
          </button>

          {/* Print Dropdown Buttons */}
          <div className="inline-flex rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
            <button
              type="button"
              onClick={() => handlePrint('class-wise')}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-all border-r border-indigo-200 cursor-pointer"
              title="केवल कक्षा-वार पत्रक प्रिंट करें"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>कक्षा-वार</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint('room-wise')}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-all border-r border-indigo-200 cursor-pointer"
              title="केवल कमरा-वार पत्रक प्रिंट करें"
            >
              <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>कमरा-वार</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint('2d-matrix')}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-all border-r border-indigo-200 cursor-pointer"
              title="2D उत्तर-पुस्तिका वितरण मैट्रिक्स प्रिंट करें (Landscape)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />
              <span>2D मैट्रिक्स</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint('both')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="सभी पत्रक प्रिंट करें"
            >
              <Printer className="w-4 h-4" />
              <span>सभी प्रिंट</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">कुल आबंटित छात्र</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalAllocated}</p>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">उपस्थित ('A' कॉपियां)</span>
          <p className="text-xl font-black text-emerald-800 mt-1">{totalPresent}</p>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-amber-800 uppercase">कुल 'B' पूरक कॉपियां</span>
          <p className="text-xl font-black text-amber-900 mt-1">{totalCenterBCopies}</p>
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

      {/* Date-wise Selector Bar (दिनांक अनुसार फ़िल्टर) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              दिनांक अनुसार उपस्थिति व अनुपस्थिति फ़िल्टर (Date-wise Attendance):
            </span>
          </div>
          {selectedDateFilter !== 'all' ? (
            <span className="text-[11px] text-slate-600 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              📅 चयनित परीक्षा तिथि: {selectedDateFilter}
            </span>
          ) : (
            <span className="text-[11px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              🌐 संपूर्ण सत्र संकलित दृश्य (All Dates)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedDateFilter === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌐 समस्त दिवस (All Dates)</span>
          </button>

          {EXAM_TIMETABLE.map((d) => {
            const dateStr = d.fullDate || d.date;
            const isSelected = selectedDateFilter === d.fullDate || selectedDateFilter === d.date;
            const isToday = d.id === getTodayExamDay().id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDateFilter(dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{d.date}</span>
                {isToday && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                    isSelected ? 'bg-white text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    आज
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Attendance Status Filter Chips (स्थिति फ़िल्टर) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> स्थिति फ़िल्टर:
          </span>

          <button
            type="button"
            onClick={() => setAttendanceStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attendanceStatusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🔘 सभी छात्र ({totalAllocated})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attendanceStatusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>❌ केवल अनुपस्थित ({totalAbsent})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceStatusFilter('present')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attendanceStatusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>✅ केवल उपस्थित ({totalPresent})</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceStatusFilter('b-copy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              attendanceStatusFilter === 'b-copy'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📙 केवल 'B' कॉपी लेने वाले ({totalCenterBCopies} B)</span>
          </button>
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

      {/* View Switcher: Class-Wise vs Room-Wise vs 2D Matrix (No Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveViewMode('class-wise')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'class-wise'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>कक्षा-वार अनुपस्थिति</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              totalAbsent > 0 ? 'bg-rose-500 text-white font-black' : 'bg-black/10'
            }`}>
              {totalAbsent}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('room-wise')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'room-wise'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>कमरा-वार सीटिंग</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('2d-matrix')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === '2d-matrix'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>📊 2D कॉपी मैट्रिक्स (A & B Matrix)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
              {totalCenterBCopies} B
            </span>
          </button>
        </div>

        {/* Info Hint */}
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {activeViewMode === 'class-wise'
              ? 'प्रत्येक कक्षा के अनुपस्थित छात्र उनके आवंटित कमरे सहित'
              : activeViewMode === 'room-wise'
              ? 'कमरे अनुसार सीटिंग कार्ड्स पर 1-क्लिक अनुपस्थिति मार्क करें'
              : 'कमरा × कक्षा 2D ग्रिड — किसी भी सेल पर क्लिक करके रोल नंबर व कॉपी विवरण देखें'}
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
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
                        'B' कॉपी: {cls.bCopiesCount || 0}
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

                  {/* Card Body with Dynamic Attendance Status Filter */}
                  <div className="p-3 sm:p-4">
                    {/* View: ONLY ABSENT or ALL (with absentees) */}
                    {(attendanceStatusFilter === 'absent' || attendanceStatusFilter === 'all') && cls.absentCount > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                          <UserX className="w-4 h-4 text-rose-600" />
                          <span>अनुपस्थित छात्र सूची ({cls.absentCount} छात्र):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {cls.absentStudents.map((st) => (
                            <div
                              key={`abs-${st.rollNo}-${st.roomId}`}
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

                    {/* View: ONLY PRESENT */}
                    {attendanceStatusFilter === 'present' && (
                      <div className="space-y-2">
                        <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>उपस्थित छात्र सूची ({cls.presentCount} छात्र - 'A' कॉपी जमा):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                          {(cls.presentStudents || []).map((st) => (
                            <div
                              key={`pres-${st.rollNo}-${st.roomId}`}
                              className="p-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-sm text-emerald-950">
                                    #{st.rollNo}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                                    {st.roomName}
                                  </span>
                                  {getStudentBCopies(st.rollNo) > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                      +{getStudentBCopies(st.rollNo)} B
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                                  {st.name || 'परीक्षार्थी'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAbsent(st.rollNo)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                title="अनुपस्थित मार्क करें"
                              >
                                <UserX className="w-3 h-3" />
                                <span>अनुपस्थित</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View: ONLY B-COPY TAKERS */}
                    {attendanceStatusFilter === 'b-copy' && (
                      <div className="space-y-2">
                        <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          <span>'B' कॉपी लेने वाले छात्र ({(cls.bCopyStudents || []).length} छात्र):</span>
                        </div>
                        {(cls.bCopyStudents || []).length === 0 ? (
                          <div className="text-xs font-bold text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                            इस कक्षा के किसी छात्र द्वारा 'B' कॉपी नहीं ली गई है।
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(cls.bCopyStudents || []).map((st) => (
                              <div
                                key={`b-${st.rollNo}-${st.roomId}`}
                                className="p-3 bg-amber-50/80 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-sm text-slate-900">
                                      #{st.rollNo}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                                      {st.roomName}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-400">
                                      +{getStudentBCopies(st.rollNo)} B
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-900 truncate mt-1">
                                    {st.name || 'परीक्षार्थी'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* All Present Message when attendanceStatusFilter is 'absent' or 'all' and no absentees */}
                    {(attendanceStatusFilter === 'absent' || attendanceStatusFilter === 'all') && cls.absentCount === 0 && (
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>इस कक्षा के सभी छात्र परीक्षा में उपस्थित हैं (शत-प्रतिशत उपस्थिति)।</span>
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
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">
                  आबंटित: {currentRoomData.totalSeated}
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                  उपस्थित ('A'): {currentRoomData.presentCount}
                </span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-bold">
                  'B' कॉपी: {currentRoomData.bCopiesCount || 0}
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
                {currentRoomData.students
                  .filter((st) => {
                    const isAbs = Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]);
                    const bCount = getStudentBCopies(st.rollNo);
                    if (attendanceStatusFilter === 'absent') return isAbs;
                    if (attendanceStatusFilter === 'present') return !isAbs;
                    if (attendanceStatusFilter === 'b-copy') return bCount > 0;
                    return true;
                  })
                  .map((st) => {
                    const isAbsent = Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]);
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

                      <div className="font-mono font-black text-sm text-slate-900 flex items-center justify-between">
                        <span>#{st.rollNo}</span>
                        {getStudentBCopies(st.rollNo) > 0 && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold">
                            +{getStudentBCopies(st.rollNo)} B
                          </span>
                        )}
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
      {/* VIEW C: 2D ANSWER BOOK MATRIX (ROOM-WISE x CLASS-WISE)   */}
      {/* ======================================================== */}
      {activeViewMode === '2d-matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 no-print space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                  <LayoutGrid className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    कमरा × कक्षा 2D उत्तर-पुस्तिका वितरण मैट्रिक्स (A & B Copy Matrix)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    प्रत्येक कमरे में उपस्थित ('A') व पूरक ('B') कॉपियों का प्रत्यक्ष संकलन। किसी भी बॉक्स पर क्लिक करके रोल नंबर देखें।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-bold text-slate-600">कक्षा:</span>
                <select
                  value={matrixSelectedClass}
                  onChange={(e) => setMatrixSelectedClass(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">सभी कक्षाएं ({matrixColumns.length})</option>
                  {matrixColumns.map((c) => (
                    <option key={c.classKey} value={c.classKey}>
                      {c.displayName} ({matrixColTotals[c.classKey]?.totalAllocated || 0} छात्र)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExport2DMatrixExcel}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="2D मैट्रिक्स एक्सेल डाउनलोड करें"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>एक्सेल (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint('2d-matrix')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="2D मैट्रिक्स A4 Landscape में प्रिंट करें"
              >
                <Printer className="w-4 h-4" />
                <span>प्रिंट (Landscape)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase">कुल आबंटित</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{matrixGrandTotal.totalAllocated}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">उपस्थित ('A' कॉपियां)</span>
              <p className="text-lg font-black text-emerald-800 mt-0.5">{matrixGrandTotal.totalA}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 uppercase">कुल पूरक 'B' कॉपियां</span>
              <p className="text-lg font-black text-amber-900 mt-0.5">{matrixGrandTotal.totalB}</p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 uppercase">कुल अनुपस्थित</span>
              <p className="text-lg font-black text-rose-800 mt-0.5">{matrixGrandTotal.totalAbsent}</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-[10px] font-bold text-purple-700 uppercase">कुल प्रयुक्त कॉपियां (A+B)</span>
              <p className="text-lg font-black text-purple-900 mt-0.5">{matrixGrandTotal.totalCopies}</p>
            </div>
          </div>

          {/* Legend / Info bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-800">संकेत (Legend):</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block"></span>
                <strong className="text-emerald-800">A</strong> = उपस्थित मुख्य कॉपियां
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                <strong className="text-amber-800">+B</strong> = अतिरिक्त पूरक कॉपियां
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                <strong className="text-rose-800">अनुप.</strong> = अनुपस्थित छात्र
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                #9101-9125 = रोल नंबर रेंज
              </span>
            </div>
            <span className="text-indigo-600 font-bold">
              💡 किसी भी सेल पर क्लिक/टैप करके छात्र सूची व रोल नंबर देखें
            </span>
          </div>

          {/* Interactive 2D Matrix Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px] relative">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-slate-900 text-white font-extrabold uppercase sticky top-0 z-20">
                  <tr>
                    <th className="p-3 text-left border-r border-slate-700 bg-slate-900 sticky left-0 z-30 min-w-[130px] shadow-sm">
                      कमरा / कक्ष
                    </th>
                    {displayedMatrixColumns.map((col) => (
                      <th key={col.classKey} className="p-2.5 border-r border-slate-700 min-w-[78px] max-w-[110px]">
                        <div className="font-black text-xs text-amber-300">{col.displayName}</div>
                        <div className="text-[10px] font-medium text-slate-300">
                          {matrixColTotals[col.classKey]?.totalAllocated || 0} छात्र
                        </div>
                      </th>
                    ))}
                    <th className="p-2.5 border-r border-slate-700 bg-emerald-950 text-emerald-300 min-w-[70px]">
                      कुल 'A'
                    </th>
                    <th className="p-2.5 border-r border-slate-700 bg-amber-950 text-amber-300 min-w-[70px]">
                      कुल 'B'
                    </th>
                    <th className="p-2.5 border-r border-slate-700 bg-rose-950 text-rose-300 min-w-[70px]">
                      अनुपस्थित
                    </th>
                    <th className="p-2.5 bg-purple-950 text-purple-200 min-w-[75px]">
                      महायोग
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matrixRows.map((r, rIdx) => {
                    if (r.rowTotalAllocated === 0) return null;
                    return (
                      <tr key={r.roomId} className={rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100/70'}>
                        <td className="p-2.5 text-left font-black text-slate-900 border-r border-slate-200 sticky left-0 z-10 bg-inherit shadow-xs">
                          <div className="text-xs font-black">{r.roomName}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{r.rowTotalAllocated} आबंटित</div>
                        </td>
                        {displayedMatrixColumns.map((col) => {
                          const cell = r.cells[col.classKey];
                          if (!cell || cell.totalSeated === 0) {
                            return (
                              <td key={col.classKey} className="p-2 border-r border-slate-200 text-slate-300 font-bold select-none">
                                —
                              </td>
                            );
                          }
                          const hasB = cell.bCopiesCount > 0;
                          const hasAbs = cell.absentCount > 0;
                          return (
                            <td
                              key={col.classKey}
                              onClick={() => setSelectedMatrixCell({ room: r, col, cell })}
                              className={`p-1.5 border-r border-slate-200 transition-all cursor-pointer group hover:scale-[1.02] hover:z-10 hover:shadow-md ${
                                hasB ? 'bg-amber-50/90 hover:bg-amber-100 border-amber-200' : 'hover:bg-indigo-50/80'
                              }`}
                              title={`${r.roomName} - ${col.displayName}: क्लिक करके सभी ${cell.totalSeated} छात्रों के रोल नंबर देखें`}
                            >
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-xs font-black text-emerald-800 group-hover:underline">
                                  {cell.presentCount} A
                                </span>
                                {hasB && (
                                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px] shadow-xs">
                                    +{cell.bCopiesCount} B
                                  </span>
                                )}
                                {hasAbs && (
                                  <span className="px-1 py-0.1 bg-rose-100 text-rose-800 font-bold rounded text-[9px]">
                                    {cell.absentCount} अनुप.
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-slate-500 mt-0.5 font-bold">
                                  {cell.rollRange}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 border-r border-slate-200 font-black text-emerald-800 bg-emerald-50/40">
                          {r.rowTotalA}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-black text-amber-900 bg-amber-50/50">
                          {r.rowTotalB > 0 ? r.rowTotalB : '—'}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-black text-rose-700 bg-rose-50/40">
                          {r.rowTotalAbsent > 0 ? r.rowTotalAbsent : '—'}
                        </td>
                        <td className="p-2 font-black text-purple-900 bg-purple-50/40">
                          {r.rowGrandTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-200 font-extrabold text-slate-900 border-t-2 border-slate-900 sticky bottom-0 z-20 shadow-md">
                  {/* Row 1: Total A */}
                  <tr className="bg-emerald-100/90 border-b border-emerald-300 text-emerald-950">
                    <td className="p-2.5 text-left font-black border-r border-emerald-300 sticky left-0 z-30 bg-emerald-100">
                      कक्षा-वार कुल 'A' मुख्य
                    </td>
                    {displayedMatrixColumns.map((col) => (
                      <td key={col.classKey} className="p-2 border-r border-emerald-300 font-black text-emerald-900">
                        {matrixColTotals[col.classKey]?.totalA || 0}
                      </td>
                    ))}
                    <td colSpan="4" className="p-2 font-black text-emerald-950 text-center">
                      कुल 'A' मुख्य कॉपियां: {matrixGrandTotal.totalA}
                    </td>
                  </tr>
                  {/* Row 2: Total B */}
                  <tr className="bg-amber-100/90 border-b border-amber-300 text-amber-950">
                    <td className="p-2.5 text-left font-black border-r border-amber-300 sticky left-0 z-30 bg-amber-100">
                      कक्षा-वार कुल 'B' पूरक
                    </td>
                    {displayedMatrixColumns.map((col) => (
                      <td key={col.classKey} className="p-2 border-r border-amber-300 font-black text-amber-950">
                        {matrixColTotals[col.classKey]?.totalB || 0}
                      </td>
                    ))}
                    <td colSpan="4" className="p-2 font-black text-amber-950 text-center">
                      कुल 'B' पूरक कॉपियां: {matrixGrandTotal.totalB}
                    </td>
                  </tr>
                  {/* Row 3: Class Grand Total */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="p-2.5 text-left font-black border-r border-slate-700 sticky left-0 z-30 bg-slate-900 text-amber-300">
                      कक्षा महायोग (A + B)
                    </td>
                    {displayedMatrixColumns.map((col) => {
                      const t = matrixColTotals[col.classKey];
                      return (
                        <td key={col.classKey} className="p-2 border-r border-slate-700 font-black text-amber-300">
                          {(t?.totalA || 0) + (t?.totalB || 0)}
                        </td>
                      );
                    })}
                    <td className="p-2 border-r border-slate-700 text-emerald-300 font-black">
                      {matrixGrandTotal.totalA}
                    </td>
                    <td className="p-2 border-r border-slate-700 text-amber-300 font-black">
                      {matrixGrandTotal.totalB}
                    </td>
                    <td className="p-2 border-r border-slate-700 text-rose-300 font-black">
                      {matrixGrandTotal.totalAbsent}
                    </td>
                    <td className="p-2 font-black text-white bg-purple-900">
                      {matrixGrandTotal.totalCopies}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Screen Quick Audit Lists: B-Copy Recipients & Absent Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Box 1: All B-Copy Students */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-amber-500 text-slate-950 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950">
                    पूरक 'B' उत्तर-पुस्तिका प्राप्तकर्ता छात्र ({allBCopyDetails.length} छात्र, {matrixGrandTotal.totalB} कॉपियां)
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
                  कुल {matrixGrandTotal.totalB} 'B' कॉपियां
                </span>
              </div>

              {allBCopyDetails.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {allBCopyDetails.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900">#{b.rollNo}</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {b.className}-{b.section}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {b.roomName}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 truncate max-w-[200px]">
                          {b.name || 'परीक्षार्थी'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded-lg text-xs shadow-xs">
                          +{b.bCount} 'B' {b.bCopyNumbers?.length ? `(${b.bCopyNumbers.join(', ')})` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  वर्तमान में किसी छात्र को पूरक 'B' कॉपी जारी नहीं की गई है।
                </p>
              )}
            </div>

            {/* Box 2: All Absent Students */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-rose-600 text-white rounded-lg">
                    <UserX className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-rose-950">
                    अनुपस्थित परीक्षार्थी सूची ({allAbsentDetails.length} अनुपस्थित छात्र)
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full text-[10px] font-black">
                  {allAbsentDetails.length} अनुपस्थित
                </span>
              </div>

              {allAbsentDetails.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {allAbsentDetails.map((ab, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-rose-200 text-xs flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-rose-700">#{ab.rollNo}</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {ab.className}-{ab.section}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {ab.roomName}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 truncate max-w-[200px]">
                          {ab.name || 'परीक्षार्थी'}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 bg-rose-600 text-white font-black rounded-lg text-[10px] uppercase">
                        ABSENT
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  ✅ शत-प्रतिशत उपस्थिति (कोई परीक्षार्थी अनुपस्थित नहीं है)।
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2D MATRIX CELL DETAIL MODAL POPUP                         */}
      {/* ======================================================== */}
      {selectedMatrixCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-xs font-black uppercase">
                    {selectedMatrixCell.room.roomName}
                  </span>
                  <span className="text-sm font-bold text-slate-400">•</span>
                  <span className="text-sm font-black text-amber-300">
                    कक्षा: {selectedMatrixCell.col.displayName}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  छात्र रोल नंबर एवं उत्तर-पुस्तिका विवरण (Detailed Roster)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatrixCell(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Mini Summary */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-100 border-b border-slate-200 text-center text-xs">
              <div className="bg-white p-2 rounded-xl">
                <span className="text-slate-500 font-bold text-[10px] uppercase">नामांकित छात्र</span>
                <p className="font-black text-slate-800 text-sm">{selectedMatrixCell.cell.totalSeated}</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-bold text-[10px] uppercase">उपस्थित ('A')</span>
                <p className="font-black text-emerald-800 text-sm">{selectedMatrixCell.cell.presentCount}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                <span className="text-amber-800 font-bold text-[10px] uppercase">'B' कॉपियां</span>
                <p className="font-black text-amber-900 text-sm">{selectedMatrixCell.cell.bCopiesCount}</p>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-rose-700 font-bold text-[10px] uppercase">अनुपस्थित</span>
                <p className="font-black text-rose-800 text-sm">{selectedMatrixCell.cell.absentCount}</p>
              </div>
            </div>

            {/* Modal Student List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs font-bold text-slate-500 border-b border-slate-100">
                <span>परीक्षार्थियों की नामावली ({selectedMatrixCell.cell.students.length} छात्र):</span>
                <span className="font-mono text-indigo-700">रोल रेंज: {selectedMatrixCell.cell.rollRange}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {selectedMatrixCell.cell.students
                  .slice()
                  .sort((a, b) => Number(a.rollNo) - Number(b.rollNo))
                  .map((st) => {
                    const isAbs = Boolean(effectiveAbsenteesMap[st.rollNo?.toString()] || effectiveAbsenteesMap[st.rollNo]);
                    const bCount = getStudentBCopies(st.rollNo);
                    const bRec = activeCopyMap[String(st.rollNo)] || activeCopyMap[Number(st.rollNo)];

                    return (
                      <div
                        key={st.rollNo}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs ${
                          isAbs
                            ? 'bg-rose-50 border-rose-300'
                            : bCount > 0
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              #{st.rollNo}
                            </span>
                            {st.benchNumber && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                बेंच {st.benchNumber}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-800 truncate max-w-[170px]">
                            {st.name || 'परीक्षार्थी'}
                          </div>
                          {st.subject && (
                            <div className="text-[10px] text-slate-500 truncate">
                              {st.subject}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {isAbs ? (
                            <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black uppercase">
                              ABSENT
                            </span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                ✅ 'A' उपस्थित
                              </span>
                              {bCount > 0 && (
                                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded text-[10px] font-black shadow-xs">
                                  +{bCount} 'B' {bRec?.bCopyNumbers?.length ? `(${bRec.bCopyNumbers.join(', ')})` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                कुल उपस्थित 'A': <strong>{selectedMatrixCell.cell.presentCount}</strong> | पूरक 'B': <strong>{selectedMatrixCell.cell.bCopiesCount}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedMatrixCell(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
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
          <div className="print-absentee-sheet mb-10 print:mb-0">
            {/* Header */}
            <div className="print-sheet-header text-center pb-3 border-b-2 border-slate-900 mb-4 print:mb-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h1>
              <p className="text-sm sm:text-base font-bold text-indigo-900 mt-0.5">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="print-meta inline-flex items-center gap-3 mt-1.5 px-3 py-0.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 border border-slate-300">
                <span>📅 दिनांक: {selectedDateFilter !== 'all' ? selectedDateFilter : examDetails.date}</span>
                <span>•</span>
                <span>⏰ समय / शिफ्ट: {examDetails.timeRange}</span>
              </div>
              <div className="mt-2 print:mt-1">
                <span className="print-banner px-3 py-0.5 bg-indigo-900 text-white text-xs font-black tracking-widest uppercase rounded">
                  CLASS-WISE ABSENTEE STATEMENT (कक्षावार अनुपस्थित छात्र विवरण पत्रक - कक्षाध्यापक पटल)
                </span>
              </div>
            </div>

            {/* Class-Wise Master Table */}
            <div className="border border-slate-900 rounded-xl print:rounded-none print:border-black overflow-hidden print:overflow-visible">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                    <tr>
                      <th className="px-2 py-2.5 border-r border-slate-700 w-10 text-center">क्र.</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-28">कक्षा व वर्ग</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-36">कक्षाध्यापक का नाम</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-14">नामांकित</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-16">उपस्थित ('A')</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-14 bg-amber-950/60 text-amber-300">'B' कॉपी</th>
                      <th className="px-2 py-2.5 border-r border-slate-700 text-center w-16 font-black text-rose-300">
                        अनुपस्थित
                      </th>
                      <th className="px-3 py-2.5 border-r border-slate-700">
                        अनुपस्थित परीक्षार्थियों के रोल नंबर व नाम (कमरा सहित)
                      </th>
                      <th className="px-3 py-2.5 w-24 text-center">कक्षाध्यापक हस्ताक्षर</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {classWiseSummary.map((row, idx) => (
                      <tr key={row.classKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-2 py-2 text-center font-bold text-slate-500 border-r border-slate-200">
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
                        <td className="px-2 py-2 text-center font-black text-amber-800 border-r border-slate-200 bg-amber-50/40">
                          {row.bCopiesCount > 0 ? row.bCopiesCount : '—'}
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
                            <span className="text-slate-400 font-normal italic">✅ शून्य अनुपस्थित (100% उपस्थित)</span>
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
                      <td className="px-2 py-2.5 text-center border-r border-slate-300 text-sm text-amber-900 font-black">
                        {totalCenterBCopies}
                      </td>
                      <td className="px-2 py-2.5 text-center border-r border-slate-300 text-sm text-rose-800 font-black">
                        {totalAbsent}
                      </td>
                      <td colSpan="2" className="px-3 py-2.5 text-slate-700 font-bold text-[11px]">
                        'A' मुख्य कॉपियां: {totalPresent} | पूरक 'B' कॉपियां: {totalCenterBCopies} | अनुपस्थित: {totalAbsent}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Notes & Signatures for Class Statement */}
            <div className="print-sheet-footer mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <p className="text-[11px] text-slate-500 max-w-sm">
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
          <div className="print-absentee-sheet">
            {/* Header */}
            <div className="print-sheet-header text-center pb-3 border-b-2 border-slate-900 mb-4 print:mb-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h1>
              <p className="text-sm sm:text-base font-bold text-indigo-900 mt-0.5">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="print-meta inline-flex items-center gap-3 mt-1.5 px-3 py-0.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 border border-slate-300">
                <span>📅 दिनांक: {selectedDateFilter !== 'all' ? selectedDateFilter : examDetails.date}</span>
                <span>•</span>
                <span>⏰ समय / शिफ्ट: {examDetails.timeRange}</span>
              </div>
              <div className="mt-2 print:mt-1">
                <span className="print-banner px-3 py-0.5 bg-rose-900 text-white text-xs font-black tracking-widest uppercase rounded">
                  ROOM-WISE ABSENTEE STATEMENT (कक्षवार अनुपस्थित छात्र विवरण पत्रक - परीक्षा अधीक्षक पटल)
                </span>
              </div>
            </div>

            {/* Room-Wise Master Table */}
            <div className="border border-slate-900 rounded-xl print:rounded-none print:border-black overflow-hidden print:overflow-visible">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-12 text-center">क्र.</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">कमरा / हॉल का नाम</th>
                      <th className="px-2.5 py-2.5 border-r border-slate-700 text-center w-16">आबंटित</th>
                      <th className="px-2.5 py-2.5 border-r border-slate-700 text-center w-20">उपस्थित ('A')</th>
                      <th className="px-2.5 py-2.5 border-r border-slate-700 text-center w-16 bg-amber-950/60 text-amber-300">'B' कॉपी</th>
                      <th className="px-2.5 py-2.5 border-r border-slate-700 text-center w-20 font-black text-rose-300">
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
                          <td className="px-2.5 py-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            {row.totalSeated}
                          </td>
                          <td className="px-2.5 py-2 text-center font-bold text-emerald-700 border-r border-slate-200">
                            {row.presentCount}
                          </td>
                          <td className="px-2.5 py-2 text-center font-black text-amber-800 border-r border-slate-200 bg-amber-50/40">
                            {row.bCopiesCount > 0 ? row.bCopiesCount : '—'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-black text-rose-700 border-r border-slate-200 text-sm">
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
                              <span className="text-slate-400 font-normal italic">✅ शून्य अनुपस्थित (100% उपस्थित)</span>
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
                      <td className="px-2.5 py-2.5 text-center border-r border-slate-300 text-sm">
                        {totalAllocated}
                      </td>
                      <td className="px-2.5 py-2.5 text-center border-r border-slate-300 text-sm text-emerald-800">
                        {totalPresent}
                      </td>
                      <td className="px-2.5 py-2.5 text-center border-r border-slate-300 text-sm text-amber-900 font-black">
                        {totalCenterBCopies}
                      </td>
                      <td className="px-2.5 py-2.5 text-center border-r border-slate-300 text-sm text-rose-800 font-black">
                        {totalAbsent}
                      </td>
                      <td colSpan="2" className="px-3 py-2.5 text-slate-700 font-semibold text-[11px]">
                        'A' मुख्य कॉपियां: {totalPresent} | 'B' पूरक कॉपियां: {totalCenterBCopies} | अनुपस्थित: {totalAbsent}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Notes & Signatures for Room Statement */}
            <div className="print-sheet-footer mt-4 pt-2 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-800 text-xs">प्रमाण-पत्र (Certificate):</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5 max-w-md">
                  प्रमाणित किया जाता है कि उपरोक्त विवरण परीक्षा कक्षों में उपस्थित एवं अनुपस्थित छात्रों के वास्तविक सत्यापन उपरांत तैयार किया गया है।
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-12 text-center">
                <div>
                  <div className="w-32 h-6 border-b border-dashed border-slate-400"></div>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5">हस्ताक्षर परीक्षा प्रभारी</p>
                </div>
                <div>
                  <div className="w-32 h-6 border-b border-dashed border-slate-400"></div>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5">हस्ताक्षर केंद्राध्यक्ष / सील</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* PRINT SECTION 3: 2D ANSWER BOOK DISTRIBUTION MATRIX   */}
        {/* ===================================================== */}
        {(printOption === 'both' || printOption === '2d-matrix') && (
          <div className="print-matrix-sheet">
            {/* Header */}
            <div className="print-sheet-header text-center pb-2 border-b-2 border-slate-900 mb-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h1>
              <p className="text-sm font-bold text-indigo-900 mt-0.5">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="print-meta inline-flex items-center gap-3 mt-1 px-3 py-0.5 bg-slate-100 rounded-full text-[10px] font-semibold text-slate-800 border border-slate-300">
                <span>📅 दिनांक: {selectedDateFilter !== 'all' ? selectedDateFilter : examDetails.date}</span>
                <span>•</span>
                <span>⏰ समय / शिफ्ट: {examDetails.timeRange}</span>
              </div>
              <div className="mt-1">
                <span className="print-banner px-3 py-0.5 bg-purple-900 text-white text-xs font-black tracking-widest uppercase rounded">
                  ROOM-WISE × CLASS-WISE ANSWER BOOK DISTRIBUTION MATRIX (कक्षा एवं कमरा-वार उत्तर-पुस्तिका वितरण पत्रक - 'A' व 'B' कॉपियां)
                </span>
              </div>
            </div>

            {/* Master 2D Matrix Table */}
            <div className="border border-slate-900 overflow-hidden mb-3">
              <table className="w-full text-center border-collapse">
                <thead className="bg-slate-900 text-white font-extrabold uppercase text-[9px]">
                  <tr>
                    <th className="p-1 border border-black text-left w-24">कमरा / कक्ष</th>
                    {matrixColumns.map((col) => (
                      <th key={col.classKey} className="p-1 border border-black">
                        {col.displayName}
                      </th>
                    ))}
                    <th className="p-1 border border-black w-14 bg-emerald-950 text-white">कुल 'A'</th>
                    <th className="p-1 border border-black w-14 bg-amber-950 text-amber-200">कुल 'B'</th>
                    <th className="p-1 border border-black w-14 bg-rose-950 text-white">अनुप.</th>
                    <th className="p-1 border border-black w-14 bg-indigo-950 text-white">महायोग</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[9px]">
                  {matrixRows.map((r, idx) => {
                    if (r.rowTotalAllocated === 0) return null;
                    return (
                      <tr key={r.roomId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1 border border-black text-left font-bold whitespace-nowrap">
                          {r.roomName}
                        </td>
                        {matrixColumns.map((col) => {
                          const cell = r.cells[col.classKey];
                          if (!cell || cell.totalSeated === 0) {
                            return (
                              <td key={col.classKey} className="p-1 border border-black text-slate-300">
                                —
                              </td>
                            );
                          }
                          return (
                            <td key={col.classKey} className={`p-1 border border-black font-semibold ${cell.bCopiesCount > 0 ? 'bg-amber-100 font-bold' : ''}`}>
                              <div>{cell.presentCount} A</div>
                              {cell.bCopiesCount > 0 && (
                                <div className="text-[8px] font-black text-amber-900">+{cell.bCopiesCount} B</div>
                              )}
                              {cell.absentCount > 0 && (
                                <div className="text-[7.5px] font-bold text-rose-700">{cell.absentCount} abs</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-1 border border-black font-black text-emerald-900 bg-emerald-50/60">
                          {r.rowTotalA}
                        </td>
                        <td className="p-1 border border-black font-black text-amber-900 bg-amber-50/60">
                          {r.rowTotalB > 0 ? r.rowTotalB : '—'}
                        </td>
                        <td className="p-1 border border-black font-black text-rose-800 bg-rose-50/60">
                          {r.rowTotalAbsent > 0 ? r.rowTotalAbsent : '—'}
                        </td>
                        <td className="p-1 border border-black font-black text-slate-900 bg-slate-100">
                          {r.rowGrandTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-200 border-t-2 border-black font-black text-[9px]">
                  <tr>
                    <td className="p-1 border border-black text-left">कक्षा-वार कुल 'A' कॉपियां</td>
                    {matrixColumns.map((col) => (
                      <td key={col.classKey} className="p-1 border border-black text-emerald-900">
                        {matrixColTotals[col.classKey]?.totalA || 0}
                      </td>
                    ))}
                    <td colSpan="4" className="p-1 border border-black text-center text-emerald-900">
                      कुल 'A': {matrixGrandTotal.totalA}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1 border border-black text-left">कक्षा-वार कुल 'B' कॉपियां</td>
                    {matrixColumns.map((col) => (
                      <td key={col.classKey} className="p-1 border border-black text-amber-950 font-black">
                        {matrixColTotals[col.classKey]?.totalB || 0}
                      </td>
                    ))}
                    <td colSpan="4" className="p-1 border border-black text-center text-amber-950 font-black">
                      कुल 'B': {matrixGrandTotal.totalB}
                    </td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="p-1 border border-black text-left text-amber-300">विद्यालय कुल महायोग (A+B)</td>
                    {matrixColumns.map((col) => (
                      <td key={col.classKey} className="p-1 border border-black text-amber-300">
                        {(matrixColTotals[col.classKey]?.totalA || 0) + (matrixColTotals[col.classKey]?.totalB || 0)}
                      </td>
                    ))}
                    <td className="p-1 border border-black text-emerald-300">{matrixGrandTotal.totalA}</td>
                    <td className="p-1 border border-black text-amber-300">{matrixGrandTotal.totalB}</td>
                    <td className="p-1 border border-black text-rose-300">{matrixGrandTotal.totalAbsent}</td>
                    <td className="p-1 border border-black text-white">{matrixGrandTotal.totalCopies}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Under-Table Audit Appendix for Paper Print: Detailed B-Copy recipients and Absent roll numbers */}
            <div className="grid grid-cols-2 gap-3 text-[9px] border-t-2 border-slate-900 pt-2 mb-3">
              {/* Box 1: B-Copy Recipients */}
              <div className="border border-slate-900 p-2 rounded bg-amber-50/20">
                <h4 className="font-black text-amber-950 border-b border-amber-300 pb-1 mb-1 uppercase">
                  1. पूरक 'B' उत्तर-पुस्तिका प्राप्तकर्ता परीक्षार्थी विवरण ({allBCopyDetails.length} छात्र, कुल {matrixGrandTotal.totalB} कॉपियां)
                </h4>
                {allBCopyDetails.length > 0 ? (
                  <div className="space-y-0.5 max-h-36 overflow-hidden">
                    {allBCopyDetails.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-bold">
                          {idx + 1}. #{b.rollNo} {b.name ? `(${b.name})` : ''} - {b.className}-{b.section} ({b.roomName})
                        </span>
                        <span className="font-mono font-black text-amber-900">
                          +{b.bCount} 'B' {b.bCopyNumbers?.length ? `[${b.bCopyNumbers.join(', ')}]` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-slate-500">किसी परीक्षार्थी को पूरक 'B' कॉपी जारी नहीं हुई।</p>
                )}
              </div>

              {/* Box 2: Absentees */}
              <div className="border border-slate-900 p-2 rounded bg-rose-50/20">
                <h4 className="font-black text-rose-950 border-b border-rose-300 pb-1 mb-1 uppercase">
                  2. अनुपस्थित परीक्षार्थी विवरण (Absentees Audit - कुल {allAbsentDetails.length} अनुपस्थित)
                </h4>
                {allAbsentDetails.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-hidden">
                    {allAbsentDetails.map((ab, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 border border-rose-400 bg-rose-100 font-bold rounded text-[8.5px]">
                        #{ab.rollNo} {ab.className}-{ab.section} ({ab.roomName})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-slate-500">शत-प्रतिशत उपस्थिति (शून्य अनुपस्थित परीक्षार्थी)।</p>
                )}
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="print-sheet-footer pt-2 border-t border-slate-400 flex items-center justify-between text-[10px] text-slate-700">
              <p className="max-w-md">
                * प्रमाणित किया जाता है कि 'A' मुख्य कॉपियां एवं पूरक 'B' कॉपियों का वितरण उपरोक्त 2D मैट्रिक्स के अनुसार पूर्णतः सत्यापित है।
              </p>
              <div className="flex items-center gap-12 text-center">
                <div>
                  <div className="w-28 h-5 border-b border-dashed border-slate-500"></div>
                  <p className="font-bold text-[9px] mt-0.5">हस्ताक्षर परीक्षा प्रभारी</p>
                </div>
                <div>
                  <div className="w-28 h-5 border-b border-dashed border-slate-500"></div>
                  <p className="font-bold text-[9px] mt-0.5">हस्ताक्षर केंद्राध्यक्ष / प्रधानाचार्य</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
