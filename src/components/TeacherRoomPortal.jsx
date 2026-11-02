import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EXAM_TIMETABLE } from '../data/examSchemeData';
import { DEFAULT_SHIFT_1, DEFAULT_SHIFT_2 } from '../data/defaultData';
import { generateSeatingPlan } from '../utils/seatingAlgorithm';
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
  Info,
  Copy,
  Check,
  DoorOpen,
  Star,
  BookOpen,
  Plus,
  Minus,
  ChevronRight,
  Lock,
  RefreshCw,
  Phone,
  Bell,
  X
} from 'lucide-react';

export default function TeacherRoomPortal({
  examSession,
  activeDate,
  activeShift,
  handleShiftChange,
  teachers = [],
  liveAbsentees = {},
  bCopyRecords = {},
  onToggleAbsent,
  onUpdateBCopy,
  onLogout,
  onSwitchToAdminView,
  onGoToEvaluation,
  onRefreshDuty,
  evaluationAllotment = {},
  marksLocks = {},
  classes = [],
  examDetails = {},
}) {
  const { currentUser, canAccessAllRooms } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'bench' | 'absent-summary'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [filterOnlyAbsent, setFilterOnlyAbsent] = useState(false);
  const [togglingRoll, setTogglingRoll] = useState(null);

  const [summaryScope, setSummaryScope] = useState('school'); // 'school' (all classes for class teachers) | 'room'
  const [copiedClassKey, setCopiedClassKey] = useState(null);

  // Reliever direct calling modal & Handover slip modal
  const [isRelieverModalOpen, setIsRelieverModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Selected Exam Day State (Defaults to 'd3' or matches activeDate prop)
  const [selectedDayId, setSelectedDayId] = useState(() => {
    if (activeDate) {
      const match = (EXAM_TIMETABLE || []).find(
        (d) => d.fullDate === activeDate || d.date === activeDate || activeDate.includes(d.date)
      );
      if (match) return match.id;
    }
    return 'd3';
  });

  // Sync when activeDate prop updates
  useEffect(() => {
    if (activeDate) {
      const match = (EXAM_TIMETABLE || []).find(
        (d) => d.fullDate === activeDate || d.date === activeDate || activeDate.includes(d.date)
      );
      if (match) setSelectedDayId(match.id);
    }
  }, [activeDate]);

  const selectedDay = useMemo(() => {
    return (EXAM_TIMETABLE || []).find((d) => d.id === selectedDayId) || EXAM_TIMETABLE[2] || EXAM_TIMETABLE[0];
  }, [selectedDayId]);

  // Centralized safe absentee checker (declared before useMemo hooks)
  const isStudentAbsent = (rollNo) => {
    if (rollNo === undefined || rollNo === null) return false;
    const num = Number(rollNo);
    const str = String(rollNo);
    const rec = liveAbsentees[rollNo] || liveAbsentees[str] || (!isNaN(num) && liveAbsentees[num]);
    if (!rec || !rec.isAbsent) return false;
    // Verify record date matches currently selected exam date
    if (rec.date) {
      const targetDate = selectedDay.fullDate || selectedDay.date;
      const match = rec.date === targetDate || rec.date === selectedDay.date || (activeDate && (rec.date === activeDate || activeDate.includes(rec.date)));
      if (!match) return false;
    }
    return true;
  };

  // Helper to get B-Copies Count for any student (declared before useMemo hooks)
  const getStudentBCopies = (rollNo) => {
    if (rollNo === undefined || rollNo === null) return 0;
    const rec = bCopyRecords[rollNo] || bCopyRecords[String(rollNo)] || bCopyRecords[Number(rollNo)];
    return Number(rec?.bCopiesCount) || 0;
  };

  // Robust Phone & Name normalizers for teacher matching
  const normalizePhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  const cleanName = (n) => String(n || '').replace(/^(श्री|श्रीमती|डॉ०|डॉ\.|डा०|डा\.|shri|mr|mrs|dr)\s+/i, '').trim().toLowerCase();

  // Find all assigned copy bundles for this teacher
  const myAssignedEvaluationBundles = useMemo(() => {
    if (!currentUser || !evaluationAllotment) return [];
    const uPhone = normalizePhone(currentUser.phone || currentUser.mobile || '');
    const uName = cleanName(currentUser.name || '');
    const uId = String(currentUser.assignedTeacherId || currentUser.id || currentUser._id || '');

    const bundles = [];
    Object.entries(evaluationAllotment).forEach(([key, allot]) => {
      if (!allot) return;
      const tPhone = normalizePhone(allot.teacherPhone || '');
      const tName = cleanName(allot.teacherName || '');
      const tId = String(allot.teacherId || '');

      const isMatch =
        (uPhone && tPhone && uPhone === tPhone) ||
        (uId && tId && uId === tId) ||
        (uName && tName && (uName.includes(tName) || tName.includes(uName)));

      if (isMatch) {
        // key format is `${grade}_${section}_${subject}`
        const parts = key.split('_');
        const grade = parts[0] || '';
        const section = parts[1] || '';
        const subject = parts.slice(2).join('_') || '';

        // Find class student count
        const classObj = classes.find(
          (c) => String(c.name).trim() === grade && String(c.section).toUpperCase().trim() === section.toUpperCase()
        );
        const totalCopies = classObj ? (Number(classObj.totalStudents) || (classObj.studentList ? classObj.studentList.length : 0) || 0) : 0;
        const lock = marksLocks[key] || null;

        bundles.push({
          key,
          grade,
          section,
          subject,
          totalCopies,
          isLocked: Boolean(lock?.isLocked),
          lockedBy: lock?.lockedBy || '',
          allotment: allot,
        });
      }
    });

    return bundles;
  }, [currentUser, evaluationAllotment, marksLocks, classes]);

  // Independent shift for teacher portal - defaults based on current time (>= 12:00 PM -> Shift 2)
  const [portalShift, setPortalShift] = useState(() => {
    return new Date().getHours() >= 12 ? 'shift_2' : (activeShift || 'shift_1');
  });

  const seatingShift1 = useMemo(() => {
    return generateSeatingPlan({
      classes: DEFAULT_SHIFT_1.classes,
      rooms: DEFAULT_SHIFT_1.rooms,
      pairingStrategy: 'auto',
    });
  }, []);

  const seatingShift2 = useMemo(() => {
    return generateSeatingPlan({
      classes: DEFAULT_SHIFT_2.classes,
      rooms: DEFAULT_SHIFT_2.rooms,
      pairingStrategy: 'auto',
    });
  }, []);

  // Available room objects corresponding to the shift the teacher is currently viewing
  const rooms = useMemo(() => {
    if (examSession?.rooms && examSession.rooms.length > 0 && portalShift === activeShift) {
      return examSession.rooms;
    }
    if (portalShift === 'shift_1') {
      return (seatingShift1?.rooms && seatingShift1.rooms.length > 0) ? seatingShift1.rooms : (examSession?.rooms || []);
    }
    return (seatingShift2?.rooms && seatingShift2.rooms.length > 0) ? seatingShift2.rooms : (examSession?.rooms || []);
  }, [portalShift, activeShift, seatingShift1, seatingShift2, examSession?.rooms]);

  // Flatten all students across all rooms in the exam session
  const allSchoolStudents = useMemo(() => {
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

  // School-wide Class-Wise Absent Summary (For all Class Teachers)
  const schoolWideClassAbsentSummary = useMemo(() => {
    const map = {};
    allSchoolStudents.forEach((st) => {
      const classKey = `${st.className || ''}_${st.section || ''}`.trim() || 'Other';
      if (!map[classKey]) {
        const classTeacher = (teachers || []).find(
          (t) =>
            String(t.assignedClass || '').trim() === String(st.className || '').trim() &&
            (!t.assignedSection || String(t.assignedSection || '').trim().toUpperCase() === String(st.section || '').trim().toUpperCase())
        );

        map[classKey] = {
          classKey,
          className: st.className || 'कक्षा',
          section: st.section || '',
          displayName: `कक्षा ${st.className || ''}${st.section ? ` - सेक्शन ${st.section}` : ''}`,
          classTeacherName: classTeacher ? classTeacher.name : '',
          classTeacherId: classTeacher ? classTeacher.id : '',
          total: 0,
          presentCount: 0,
          absentCount: 0,
          absentStudents: [],
        };
      }

      map[classKey].total++;
      const isAbsent = isStudentAbsent(st.rollNo);
      if (isAbsent) {
        map[classKey].absentCount++;
        map[classKey].absentStudents.push(st);
      } else {
        map[classKey].presentCount++;
      }
    });

    return Object.values(map).sort((a, b) => {
      const numA = parseInt(a.className, 10) || 0;
      const numB = parseInt(b.className, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.section || '').localeCompare(b.section || '');
    });
  }, [allSchoolStudents, liveAbsentees, teachers]);

  // WhatsApp absentee message copy handler for Class Teachers
  const handleCopyClassAbsent = (cls) => {
    const absentListText = cls.absentStudents.length > 0
      ? cls.absentStudents.map((st, i) => `${i + 1}. रोल #${st.rollNo} - ${st.name || 'परीक्षार्थी'} (${st.roomName || selectedRoomName || 'कमरा'}, बेंच #${st.benchNumber || '—'})`).join('\n')
      : '✅ सभी छात्र उपस्थित हैं (कोई अनुपस्थित नहीं)';

    const text = `*${examSession?.sessionName || 'ए.बी.वी.आई.सी. मीरांपुर कटरा'}*\n*कक्षा-वार अनुपस्थिति रिपोर्ट (Class Absentee List)*\n📅 दिनांक: ${activeDate || ''} | पाली: ${activeShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}\n🎓 कक्षा: ${cls.displayName}${cls.classTeacherName ? `\n👨‍🏫 कक्षाध्यापक: ${cls.classTeacherName}` : ''}\n----------------------------------\n👥 कुल नामांकित: ${cls.total}\n✅ उपस्थित: ${cls.presentCount}\n❌ अनुपस्थित: ${cls.absentCount}\n----------------------------------\n*अनुपस्थित छात्र सूची:*\n${absentListText}\n----------------------------------\n_रिपोर्ट समय: ${new Date().toLocaleTimeString('hi-IN')}_`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedClassKey(cls.classKey);
      setTimeout(() => setCopiedClassKey(null), 3000);
    }
  };

  // 1. Identify teacher's assigned room and duty status for BOTH Shift 1 and Shift 2
  const dutyRoster = examSession?.dutyRoster || {};

  // Build teacher identification ID set
  const teacherIdSet = useMemo(() => {
    if (!currentUser) return new Set();
    const set = new Set();
    if (currentUser.assignedTeacherId) set.add(String(currentUser.assignedTeacherId));
    if (currentUser.id) set.add(String(currentUser.id));
    if (currentUser._id) set.add(String(currentUser._id));
    if (currentUser.phone) set.add(String(currentUser.phone));

    const cleanStr = (s) => String(s || '').replace(/^(श्री|श्रीमती|डॉ०|डॉ\.|डा०|डा\.|shri|mr|mrs|dr)\s+/i, '').replace(/\s+/g, '').toLowerCase();
    const uCleanName = cleanStr(currentUser.name);
    const uPhone = String(currentUser.phone || '').replace(/\D/g, '').slice(-10);

    (teachers || []).forEach((t) => {
      const tPhone = String(t.mobile || t.phone || '').replace(/\D/g, '').slice(-10);
      const tCleanName = cleanStr(t.name);
      const isMatch =
        (uPhone && tPhone && uPhone === tPhone) ||
        (currentUser.assignedTeacherId && (String(t.id) === String(currentUser.assignedTeacherId) || String(t._id) === String(currentUser.assignedTeacherId))) ||
        (currentUser.id && (String(t.id) === String(currentUser.id) || String(t._id) === String(currentUser.id))) ||
        (uCleanName && tCleanName && uCleanName === tCleanName);

      if (isMatch) {
        if (t.id) set.add(String(t.id));
        if (t._id) set.add(String(t._id));
        if (t.teacherCode) {
          set.add(String(t.teacherCode));
          set.add(String(t.teacherCode).toLowerCase());
        }
        if (t.mobile) set.add(String(t.mobile));
        if (t.name) {
          set.add(String(t.name).trim());
          set.add(cleanStr(t.name));
        }
      }
    });

    return set;
  }, [currentUser, teachers]);

  // Preferred day ID for backward compatibility
  const preferredDayId = selectedDay.id;

  // Automatically refresh duty from DB on mount so mobile portals always display latest live duty
  useEffect(() => {
    if (onRefreshDuty) {
      onRefreshDuty();
    }
  }, []);

  // Helper to resolve duty status for any specific shift (shift_1 or shift_2)
  const getDutyInfoForShift = (targetShift, targetRooms = []) => {
    if (!currentUser) {
      return { hasDuty: false, isReliever: false, roomName: null, isRosterPublished: false, statusText: 'लॉगिन नहीं हैं' };
    }

    // Helper to inspect an allocation object for this teacher
    const checkTeacherInAlloc = (allocation) => {
      if (!allocation || !allocation.rooms) return null;
      const clean = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
      for (const [rId, dInfo] of Object.entries(allocation.rooms)) {
        const inv1 = dInfo.invigilator1 ? String(dInfo.invigilator1) : null;
        const inv2 = dInfo.invigilator2 ? String(dInfo.invigilator2) : null;
        if (
          (inv1 && teacherIdSet.has(inv1)) ||
          (inv2 && teacherIdSet.has(inv2))
        ) {
          const targetId = clean(rId);
          const foundRoom = targetRooms.find((r) => 
            clean(r.roomId) === targetId || 
            clean(r.id) === targetId || 
            clean(r.roomName) === targetId || 
            clean(r.name) === targetId
          );
          const rName = foundRoom ? (foundRoom.roomName || foundRoom.name) : rId;
          return {
            hasDuty: true,
            isReliever: false,
            roomName: rName,
            role: inv1 && teacherIdSet.has(inv1) ? 'कक्ष निरीक्षक 1' : 'कक्ष निरीक्षक 2',
            isRosterPublished: true,
            statusText: rName,
          };
        }
      }
      if (allocation.relievers && Array.isArray(allocation.relievers)) {
        for (const relId of allocation.relievers) {
          if (teacherIdSet.has(String(relId))) {
            return {
              hasDuty: true,
              isReliever: true,
              roomName: null,
              role: 'उड़नदस्ता / रिलीवर',
              isRosterPublished: true,
              statusText: 'उड़नदस्ता / रिलीवर ड्यूटी',
            };
          }
        }
      }
      return null;
    };

    // 1. Identify all valid keys that represent the selected day for this shift
    const candidateKeys = [
      `${selectedDay.id}_${targetShift}`,
      `${selectedDay.fullDate}_${targetShift}`,
      `${selectedDay.date}_${targetShift}`,
      `${selectedDayId}_${targetShift}`,
    ];

    // Find if roster exists for the selected day
    let todayAlloc = null;
    for (const k of candidateKeys) {
      if (dutyRoster[k]?.rooms && Object.keys(dutyRoster[k].rooms).length > 0) {
        todayAlloc = dutyRoster[k];
        break;
      }
    }

    if (todayAlloc) {
      // Today's roster is published! Check teacher's duty in TODAY's allocation ONLY.
      const match = checkTeacherInAlloc(todayAlloc);
      if (match) return match;

      // Teacher is NOT assigned in today's roster -> Duty is strictly Off Duty (ड्यूटी मुक्त)
      return {
        hasDuty: false,
        isReliever: false,
        roomName: null,
        isRosterPublished: true,
        statusText: 'इस पाली में आपकी कोई कक्ष ड्यूटी नहीं है (ड्यूटी मुक्त)',
      };
    }

    // If duty for this specific shift has not been created/published yet
    return {
      hasDuty: false,
      isReliever: false,
      roomName: null,
      isRosterPublished: false,
      statusText: `${targetShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'} की ड्यूटी अभी निर्धारित नहीं हुई है`,
    };
  };

  const s1DutyInfo = useMemo(() => {
    return getDutyInfoForShift('shift_1', seatingShift1?.rooms || []);
  }, [selectedDay, selectedDayId, dutyRoster, teacherIdSet, seatingShift1]);

  const s2DutyInfo = useMemo(() => {
    return getDutyInfoForShift('shift_2', seatingShift2?.rooms || []);
  }, [selectedDay, selectedDayId, dutyRoster, teacherIdSet, seatingShift2]);

  const currentShiftDutyInfo = portalShift === 'shift_1' ? s1DutyInfo : s2DutyInfo;

  const assignedRoomDefault = useMemo(() => {
    if (canAccessAllRooms) {
      return currentShiftDutyInfo.roomName || rooms[0]?.roomName || 'Room 01';
    }
    return currentShiftDutyInfo.roomName || null;
  }, [canAccessAllRooms, currentShiftDutyInfo, rooms]);

  const [selectedRoomName, setSelectedRoomName] = useState(() => {
    return assignedRoomDefault || (canAccessAllRooms ? rooms[0]?.roomName || 'Room 01' : '');
  });

  useEffect(() => {
    if (canAccessAllRooms) {
      setSelectedRoomName(currentShiftDutyInfo.roomName || selectedRoomName || rooms[0]?.roomName || 'Room 01');
    } else {
      setSelectedRoomName(currentShiftDutyInfo.roomName || '');
    }
  }, [currentShiftDutyInfo, canAccessAllRooms, activeShift, rooms]);

  // Current active room object
  const currentRoom = useMemo(() => {
    if (!selectedRoomName) return null;
    const clean = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
    const target = clean(selectedRoomName);
    return rooms.find((r) => 
      clean(r.roomName) === target || 
      clean(r.name) === target || 
      clean(r.roomId) === target || 
      clean(r.id) === target
    ) || null;
  }, [rooms, selectedRoomName]);

  // Reliever Range Mapping (3 Rooms per Reliever):
  // Range 1 (Rooms 1 - 3): Reliever 1
  // Range 2 (Rooms 4 - 6): Reliever 2
  // Range 3 (Rooms 7 - 9): Reliever 3
  // Range 4 (Rooms 10 - 12): Reliever 4
  // Floating / All Rooms: Reliever 5
  const currentSlotRelievers = useMemo(() => {
    const key = `${selectedDay.id}_${portalShift}`;
    const alloc = dutyRoster[key] || dutyRoster[`${selectedDay.fullDate}_${portalShift}`] || dutyRoster[`${selectedDay.date}_${portalShift}`] || {};
    const relIds = alloc.relievers || [];
    return relIds.map((id, idx) => {
      const t = (teachers || []).find(teach => String(teach.id) === String(id) || String(teach._id) === String(id));
      let rangeLabel = 'फ्लोटिंग (सभी कमरे)';
      if (idx === 0) rangeLabel = 'रेंज 1 (कमरा 01 - 03)';
      else if (idx === 1) rangeLabel = 'रेंज 2 (कमरा 04 - 06)';
      else if (idx === 2) rangeLabel = 'रेंज 3 (कमरा 07 - 09)';
      else if (idx === 3) rangeLabel = 'रेंज 4 (कमरा 10 - 12)';
      return {
        id,
        index: idx + 1,
        name: t ? t.name : 'रिलीवर शिक्षक',
        mobile: t ? (t.mobile || t.phone) : '',
        rangeLabel,
      };
    });
  }, [dutyRoster, preferredDayId, portalShift, teachers]);

  const myAssignedZoneReliever = useMemo(() => {
    if (!currentRoom) return currentSlotRelievers[0] || null;
    const rName = currentRoom.roomName || currentRoom.name || selectedRoomName || '';
    const match = rName.match(/\d+/);
    const roomNum = match ? parseInt(match[0], 10) : 1;
    let targetIdx = 0;
    if (roomNum >= 1 && roomNum <= 3) targetIdx = 0;
    else if (roomNum >= 4 && roomNum <= 6) targetIdx = 1;
    else if (roomNum >= 7 && roomNum <= 9) targetIdx = 2;
    else if (roomNum >= 10 && roomNum <= 12) targetIdx = 3;
    else targetIdx = 4;

    return currentSlotRelievers[targetIdx] || currentSlotRelievers[0] || null;
  }, [currentRoom, selectedRoomName, currentSlotRelievers]);

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
          list = list.filter((st) => isStudentAbsent(st.rollNo));
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
      const absentList = grp.students.filter((st) => isStudentAbsent(st.rollNo));
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
  const absentCount = roomStudents.filter((st) => isStudentAbsent(st.rollNo)).length;
  const presentCount = totalStudents - absentCount;

  // 1-Click Absent Toggle Handler
  const handleToggle = async (student) => {
    if (!student || !student.rollNo) return;
    const roll = Number(student.rollNo) || student.rollNo;
    const currentIsAbsent = isStudentAbsent(student.rollNo);
    const newStatus = !currentIsAbsent;

    setTogglingRoll(student.rollNo);

    try {
      await onToggleAbsent({
        rollNo: roll,
        isAbsent: newStatus,
        roomName: student.roomName || selectedRoomName || currentRoom?.roomName || 'Room 01',
        sessionName: examSession?.sessionName || 'Half Yearly  Examination 2026',
        date: activeDate || new Date().toISOString().split('T')[0],
        shift: activeShift || 'shift_1',
        studentName: student.name || '',
        className: student.className || '',
        section: student.section || '',
      });
    } catch (err) {
      console.error('Toggle absent error in TeacherRoomPortal:', err);
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

  // Total B-copies in current room
  const totalRoomBCopies = useMemo(() => {
    return roomStudents.reduce((sum, st) => {
      if (isStudentAbsent(st.rollNo)) return sum;
      return sum + getStudentBCopies(st.rollNo);
    }, 0);
  }, [roomStudents, bCopyRecords, liveAbsentees]);

  // Handle B-Copy +1 or -1
  const handleUpdateStudentBCopy = async (student, delta) => {
    if (!student || !student.rollNo) return;
    const roll = Number(student.rollNo) || student.rollNo;
    const currentCount = getStudentBCopies(roll);
    const newCount = Math.max(0, currentCount + delta);

    if (onUpdateBCopy) {
      await onUpdateBCopy({
        rollNo: roll,
        bCopiesCount: newCount,
        roomName: student.roomName || selectedRoomName || currentRoom?.roomName || 'Room 01',
        sessionName: examSession?.sessionName || 'Half Yearly  Examination 2026',
        date: activeDate || new Date().toISOString().split('T')[0],
        shift: activeShift || 'shift_1',
        studentName: student.name || '',
        className: student.className || '',
        section: student.section || '',
      });
    }
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
            {onGoToEvaluation && (
              <button
                onClick={onGoToEvaluation}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold border border-indigo-500/30 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="आवंटित कॉपियों के अंक भरें"
              >
                <BookOpen className="w-4 h-4" />
                <span>कॉपी जांच व अंक भरें</span>
              </button>
            )}
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

        {/* Assigned Copy Checking Bundles Section for Teacher */}
        {myAssignedEvaluationBundles.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide">
                      आपकी आवंटित उत्तर पुस्तिकाएं (मूल्यांकन कार्य)
                    </h3>
                    <p className="text-[11px] text-indigo-700">
                      प्रधानाचार्य / परीक्षा प्रभारी द्वारा आपको <strong>{myAssignedEvaluationBundles.length} विषय बंडल</strong> सौंपे गए हैं
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {myAssignedEvaluationBundles.map((b) => (
                  <div
                    key={b.key}
                    className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-between gap-2.5 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                          Class {b.grade}-{b.section}
                        </span>
                        <h4 className="text-sm font-black text-indigo-900 mt-1">
                          {b.subject}
                        </h4>
                      </div>
                      {b.isLocked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3" /> सबमिट
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          जांच बाकी
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-600 font-medium">
                        कुल कॉपियां: <strong className="text-slate-900 font-bold">{b.totalCopies}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onGoToEvaluation) {
                            onGoToEvaluation({ grade: b.grade, section: b.section, subject: b.subject });
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <span>अंक भरें</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Exam Timing & Warning Bell Alert Card */}
        {currentShiftDutyInfo.hasDuty && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="font-black text-amber-950 flex items-center gap-1.5">
                  <span>⏰ परीक्षा समय: {examDetails?.timeRange || (portalShift === 'shift_1' ? (examDetails?.shift1Time || '08:30 AM - 11:45 AM') : (examDetails?.shift2Time || '01:30 PM - 04:45 PM'))}</span>
                </div>
                <div className="text-[11px] text-amber-900 font-medium mt-0.5">
                  🔔 चेतावनी अलर्ट ({examDetails?.warningMinutes || 15} मिनट पूर्व): परीक्षार्थियों से उत्तर-पुस्तिकाएं नत्थी (बांधना) कराएं एवं 'B' कॉपी वितरण बंद करें।
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Buttons for Active Invigilators */}
        {currentShiftDutyInfo.hasDuty && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
            {/* 1-Tap Zone Reliever Call */}
            <button
              type="button"
              onClick={() => setIsRelieverModalOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>📞 रिलीवर सहायता (Call Reliever)</span>
            </button>

            {/* Handover Receipt Slip */}
            <button
              type="button"
              onClick={() => setIsHandoverModalOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>📦 कॉपी जमा पावती (Handover Slip)</span>
            </button>
          </div>
        )}

        {/* Room & Shift Selection Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Room Selector */}
          <div className={`rounded-xl p-2.5 sm:p-3 border ${
            canAccessAllRooms 
              ? 'bg-blue-50/80 border-blue-200' 
              : currentShiftDutyInfo.hasDuty
                ? 'bg-emerald-50/80 border-emerald-300'
                : 'bg-amber-50/80 border-amber-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`block text-xs font-black uppercase tracking-wider ${
                canAccessAllRooms ? 'text-blue-700' : currentShiftDutyInfo.hasDuty ? 'text-emerald-800' : 'text-amber-800'
              }`}>
                {canAccessAllRooms ? 'कक्ष चयन (Admin):' : currentShiftDutyInfo.hasDuty ? 'आवंटित कक्ष:' : 'ड्यूटी स्थिति:'}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                  canAccessAllRooms ? 'bg-blue-200 text-blue-900' : currentShiftDutyInfo.hasDuty ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`} title="आपकी आवंटित ड्यूटी">
                  {canAccessAllRooms ? `ड्यूटी: ${assignedRoomDefault}` : currentShiftDutyInfo.hasDuty ? '🔒 लॉक' : '☕ ड्यूटी मुक्त'}
                </span>
                {onRefreshDuty && (
                  <button
                    type="button"
                    onClick={onRefreshDuty}
                    className="text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                    title="ताज़ा ड्यूटी लोड करें"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>रिफ्रेश</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${canAccessAllRooms ? 'text-blue-600' : currentShiftDutyInfo.hasDuty ? 'text-emerald-700' : 'text-amber-700'}`} />
              {canAccessAllRooms ? (
                <select
                  value={selectedRoomName}
                  onChange={(e) => {
                    setSelectedRoomName(e.target.value);
                    setSelectedClassFilter('all');
                  }}
                  className="w-full bg-white border border-blue-300 rounded-lg py-1 px-2 text-xs sm:text-sm font-black text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                >
                  {rooms.map((rm) => {
                    const isAssigned = rm.roomName === assignedRoomDefault;
                    return (
                      <option key={rm.roomId || rm.roomName} value={rm.roomName}>
                        {rm.roomName} {isAssigned ? '⭐ (आपकी ड्यूटी)' : ''} ({rm.benchesCount || 20} बेंच • {rm.seatedCount || 0} छात्र)
                      </option>
                    );
                  })}
                </select>
              ) : currentShiftDutyInfo.hasDuty ? (
                <div className="w-full bg-white border border-emerald-400 rounded-lg py-1.5 px-2 text-xs sm:text-sm font-black text-emerald-950 flex items-center justify-between shadow-2xs">
                  <span className="flex items-center gap-1">
                    <span className="text-sm sm:text-base font-black">{assignedRoomDefault}</span>
                    <span className="text-xs text-emerald-700 font-bold">
                      ({currentRoom?.benchesCount || 20} बेंच • {currentRoom?.seatedCount || 0} छात्र)
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    🔒 आपका कक्ष
                  </span>
                </div>
              ) : (
                <div className="w-full bg-white border border-amber-300 rounded-lg py-1.5 px-2 text-xs sm:text-sm font-black text-amber-950 flex items-center justify-between shadow-2xs">
                  <span className="truncate">{currentShiftDutyInfo.statusText}</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shrink-0 ml-1">
                    कोई कक्ष नहीं
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date Selector */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 block text-xs font-black uppercase tracking-wider">
                परीक्षा तिथि (Date)
              </span>
              <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                {selectedDay.day}
              </span>
            </div>
            <select
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className="mt-1.5 w-full bg-white border border-purple-300 text-purple-950 font-black text-xs sm:text-sm rounded-lg py-1 px-2 focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
            >
              {EXAM_TIMETABLE.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.date} ({d.day}) {dutyRoster[`${d.id}_shift_1`] ? '• ड्यूटी जारी' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 block text-xs font-black uppercase tracking-wider">
                परीक्षा पाली (Shift)
              </span>
              <span className="text-xs text-amber-800 font-bold">
                {portalShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <button
                type="button"
                onClick={() => setPortalShift('shift_1')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[34px] ${
                  portalShift === 'shift_1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
                title="सुबह की पाली (9वीं - 12वीं)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Shift 1 {s1DutyInfo.hasDuty ? `(${s1DutyInfo.roomName})` : '(ड्यूटी मुक्त)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPortalShift('shift_2')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[34px] ${
                  portalShift === 'shift_2'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
                title="दोपहर की पाली (6वीं - 8वीं)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Shift 2 {s2DutyInfo.hasDuty ? `(${s2DutyInfo.roomName})` : '(ड्यूटी मुक्त)'}</span>
              </button>
            </div>
          </div>

          {/* Attendance Stats & Copy Meter */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 sm:p-3">
            <span className="text-emerald-700 block text-xs font-black uppercase tracking-wider">
              उपस्थिति व कॉपी खपत (Live)
            </span>
            <div className="text-xs sm:text-sm font-black mt-1.5 flex items-center justify-between gap-1 flex-wrap">
              <span className="text-emerald-800" title="1 A-कॉपी प्रति उपस्थित छात्र">
                A-कॉपी: <strong className="text-sm sm:text-base font-black text-emerald-950">{presentCount}</strong>
              </span>
              <span className="text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded font-black" title="वितरित पूरक B-कॉपियां">
                B-कॉपी: <strong className="text-sm sm:text-base font-black text-amber-950">{totalRoomBCopies}</strong>
              </span>
              <span className="text-rose-700">
                अनु.: <strong className="text-sm sm:text-base font-black text-rose-800">{absentCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Why multiple classes note - Hidden on mobile to remove clutter */}
        {currentRoom && roomClasses.length > 0 && (
          <div className="hidden md:flex mt-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl items-start gap-2 text-xs text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>नकल विहीन परीक्षा (Anti-Adjacent Pairing):</strong> इस कमरे में <strong>{roomClasses.map((c) => c.displayName).join(' एवं ')}</strong> के छात्र एक साथ अगल-बगल बेंच पर बैठे हैं। नीचे सूची को <strong>कक्षा-वार</strong> और <strong>रोल नंबर के बढ़ते क्रम</strong> में व्यवस्थित कर दिया गया है।
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      {!canAccessAllRooms && !currentShiftDutyInfo.hasDuty ? (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-amber-200 shadow-sm p-6 sm:p-8 text-center my-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
            {currentShiftDutyInfo.isRosterPublished
              ? 'इस पाली में आपकी कोई कक्ष ड्यूटी नहीं है (ड्यूटी मुक्त)'
              : `${portalShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'} की ड्यूटी अभी निर्धारित नहीं हुई है`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-5 max-w-md mx-auto leading-relaxed">
            {currentShiftDutyInfo.isRosterPublished
              ? `दिनांक ${selectedDay.date} के ${portalShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'} में आपको किसी कक्ष का प्रभार नहीं दिया गया है।`
              : `कंट्रोल रूम द्वारा दिनांक ${selectedDay.date} के ${portalShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} की कक्ष ड्यूटी अभी जारी नहीं की गई है। जैसे ही ड्यूटी लगाई जाएगी, आपका कमरा यहाँ स्वतः दिखाई देगा।`}
          </p>

          <div className="inline-flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold">
            <span>💡 दूसरी पाली देखने के लिए यहाँ क्लिक करें:</span>
            <button
              type="button"
              onClick={() => setPortalShift(portalShift === 'shift_1' ? 'shift_2' : 'shift_1')}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-black shadow-xs transition cursor-pointer"
            >
              {portalShift === 'shift_1' ? 'Shift 2 (दोपहर) देखें' : 'Shift 1 (सुबह) देखें'}
            </button>
          </div>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* View Mode Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* 3 View Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs sm:text-sm font-bold w-full sm:w-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">छात्र सूची</span>
              <span className="hidden sm:inline">कक्षा-वार छात्र सूची</span>
            </button>

            <button
              onClick={() => setViewMode('absent-summary')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                viewMode === 'absent-summary'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">अनुपस्थिति ({absentCount})</span>
              <span className="hidden sm:inline">अनुपस्थिति पत्रक ({absentCount})</span>
            </button>

            <button
              onClick={() => setViewMode('bench')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                viewMode === 'bench'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">सीटिंग लेआउट</span>
              <span className="hidden sm:inline">सीटिंग लेआउट (Bench)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 min-w-[200px] w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="रोल नंबर या नाम खोजें..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Class Filter Tabs (Pills) */}
        {viewMode !== 'absent-summary' && roomClasses.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm no-scrollbar">
            <span className="font-bold text-slate-500 text-xs shrink-0 mr-1">कक्षा फ़िल्टर:</span>
            <button
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer min-h-[34px] ${
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
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                  selectedClassFilter === cls.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{cls.displayName}</span>
                <span className="px-1.5 py-0.2 rounded-full text-xs bg-black/15">
                  {cls.count}
                </span>
              </button>
            ))}

            <button
              onClick={() => setFilterOnlyAbsent(!filterOnlyAbsent)}
              className={`ml-auto px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[34px] ${
                filterOnlyAbsent
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <UserX className="w-4 h-4 shrink-0" />
              <span>केवल अनुपस्थित ({absentCount})</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: CLASS-WISE & ROLL NO-WISE SORTED STUDENT LIST    */}
        {/* ======================================================== */}
        {viewMode === 'list' && (
          <div className="space-y-4 sm:space-y-5">
            {filteredClassGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500 text-sm">
                कोई परीक्षार्थी नहीं मिला।
              </div>
            ) : (
              filteredClassGroups.map((grp) => {
                const classAbsentCount = grp.students.filter((st) => isStudentAbsent(st.rollNo)).length;
                const classPresentCount = grp.students.length - classAbsentCount;

                return (
                  <div key={grp.classKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Class Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <h3 className="text-sm sm:text-base font-black tracking-tight">
                            {grp.displayName}
                          </h3>
                          <span className="text-xs text-blue-200 block">
                            रोल नंबर अनुसार व्यवस्थित ({grp.students[0]?.rollNo} से {grp.students[grp.students.length - 1]?.rollNo})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
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
                    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {grp.students.map((st) => {
                        const roll = Number(st.rollNo) || st.rollNo;
                        const isAbsent = isStudentAbsent(st.rollNo);
                        const isToggling = togglingRoll === st.rollNo || togglingRoll === roll;

                        return (
                          <div
                            key={`${st.rollNo}-${st.benchNumber}`}
                            onClick={() => !isToggling && handleToggle(st)}
                            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-2.5 shadow-2xs cursor-pointer select-none active:scale-[0.99] ${
                              isAbsent
                                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Student Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
                                  #{st.rollNo}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  बेंच #{st.benchNumber} ({st.side?.includes('Left') ? 'L' : 'R'})
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                                    isAbsent
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {isAbsent ? 'ABSENT' : 'PRESENT'}
                                </span>
                              </div>

                              <div className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1">
                                {st.name || 'परीक्षार्थी'}
                              </div>

                              <div className="text-xs sm:text-sm text-slate-600 truncate mt-0.5">
                                {st.className} {st.section ? `(${st.section})` : ''} • {st.subject || 'सामान्य विषय'}
                              </div>

                              {isAbsent ? (
                                <div className="text-xs sm:text-sm font-bold text-rose-600 mt-1 flex items-center gap-1">
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>अनुपस्थित (ABSENT)</span>
                                </div>
                              ) : (
                                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                    📘 A-कॉपी: 1
                                  </span>
                                  {getStudentBCopies(st.rollNo) > 0 && (
                                    <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-500 text-white animate-pulse">
                                      📙 B: +{getStudentBCopies(st.rollNo)}
                                    </span>
                                  )}
                                  <div className="ml-auto flex items-center gap-1.5">
                                    {getStudentBCopies(st.rollNo) > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStudentBCopy(st, -1)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                                        title="B-कॉपी घटाएं (-1)"
                                      >
                                        -
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStudentBCopy(st, 1)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 min-h-[30px]"
                                      title="पूरक उत्तर पुस्तिका B-कॉपी दें (+1)"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>B-कॉपी (+1)</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 1-Tap Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(st);
                              }}
                              disabled={isToggling}
                              className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0 min-h-[44px] ${
                                isAbsent
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                              }`}
                            >
                              {isToggling ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isAbsent ? (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  <span>उपस्थित</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-4 h-4" />
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
            {/* Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-rose-600" />
                  कक्षा-वार अनुपस्थिति पत्रक (Class-Wise Absentee Register)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  परीक्षा तिथि: <strong className="text-slate-800">{selectedDay.date}</strong> • पाली: <strong>{activeShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  प्रिंट करें
                </button>
              </div>
            </div>

            {/* Scope Toggle: All Classes (Class Teacher View) vs Current Room */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSummaryScope('school')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    summaryScope === 'school'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>संपूर्ण विद्यालय कक्षा-वार रिपोर्ट (All Classes)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    summaryScope === 'school' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {schoolWideClassAbsentSummary.length} कक्षाएं
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSummaryScope('room')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    summaryScope === 'room'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  <span>केवल कमरा #{selectedRoomName} की कक्षाएं</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-normal px-2">
                {summaryScope === 'school'
                  ? '💡 कक्षाध्यापक अपनी पूरी कक्षा की अनुपस्थिति देख व व्हाट्सएप पर साझा कर सकते हैं'
                  : `कमरे में बैठे ${classWiseAbsentSummary.length} कक्षाओं के छात्र`}
              </div>
            </div>

            {/* Summary Cards per Class */}
            <div className="space-y-4">
              {(summaryScope === 'school' ? schoolWideClassAbsentSummary : classWiseAbsentSummary).map((clsSummary) => {
                const isMyAssignedClass = (teachers || []).some((t) => {
                  const isUser = (t.mobile && currentUser?.phone && t.mobile.trim() === currentUser?.phone.trim()) ||
                                 (t.id && currentUser?.assignedTeacherId && String(t.id) === String(currentUser?.assignedTeacherId));
                  return isUser && String(t.assignedClass || '').trim() === String(clsSummary.className || '').trim();
                });

                return (
                  <div
                    key={clsSummary.classKey}
                    className={`rounded-2xl border-2 transition-all overflow-hidden ${
                      clsSummary.absentCount > 0
                        ? 'bg-white border-rose-300 shadow-sm ring-1 ring-rose-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Class Card Header */}
                    <div className={`p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 ${
                      isMyAssignedClass
                        ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-950 text-white'
                        : clsSummary.absentCount > 0
                        ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 text-white'
                        : 'bg-slate-900 text-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm sm:text-base text-white">
                              {clsSummary.displayName}
                            </h3>
                            {isMyAssignedClass && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-yellow-400 text-slate-950 flex items-center gap-1 shadow-xs">
                                <Star className="w-3 h-3 fill-slate-950" />
                                आपकी कक्षा
                              </span>
                            )}
                          </div>
                          {clsSummary.classTeacherName && (
                            <span className="text-[11px] text-amber-200 block">
                              कक्षाध्यापक: {clsSummary.classTeacherName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-300 text-xs font-bold px-2 py-0.5 rounded bg-white/10">
                          नामांकित: {clsSummary.total}
                        </span>
                        <span className="text-emerald-300 text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30">
                          उपस्थित: {clsSummary.presentCount}
                        </span>
                        <span className={`font-black text-xs px-2.5 py-0.5 rounded-lg ${
                          clsSummary.absentCount > 0
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          अनुपस्थित: {clsSummary.absentCount}
                        </span>

                        {/* WhatsApp Copy button for Class Teachers */}
                        <button
                          type="button"
                          onClick={() => handleCopyClassAbsent(clsSummary)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer ml-1"
                          title="व्हाट्सएप पर शेयर करने हेतु कॉपी करें"
                        >
                          {copiedClassKey === clsSummary.classKey ? (
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

                    {/* Absent Roll Numbers List */}
                    <div className="p-3 sm:p-4">
                      {clsSummary.absentCount === 0 ? (
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>इस कक्षा के सभी परीक्षार्थी उपस्थित हैं (No Absentees)।</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-[11px] font-black text-rose-900 block">
                            अनुपस्थित परीक्षार्थियों के रोल नंबर (Roll Numbers):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {clsSummary.absentStudents.map((st) => (
                              <div
                                key={`${st.rollNo}-${st.roomName || ''}`}
                                className="px-3.5 py-2.5 bg-rose-50 border-2 border-rose-300 rounded-xl shadow-xs flex items-center justify-between gap-2 text-xs sm:text-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-rose-950 text-base sm:text-lg">
                                      #{st.rollNo}
                                    </span>
                                    {st.roomName && (
                                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-slate-200">
                                        {st.roomName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-bold text-slate-900 truncate mt-0.5">
                                    {st.name || 'परीक्षार्थी'}
                                  </div>
                                  {st.benchNumber && (
                                    <div className="text-xs text-slate-500 font-mono">
                                      बेंच #{st.benchNumber}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggle(st)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 shrink-0 min-h-[36px]"
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
                );
              })}
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
                      const leftIsAbsent = left ? isStudentAbsent(left.rollNo) : false;
                      const rightIsAbsent = right ? isStudentAbsent(right.rollNo) : false;

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
                                className={`p-2.5 rounded-xl border-2 text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                                  leftIsAbsent
                                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50'
                                    : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">बायां (Left)</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                        leftIsAbsent
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                      }`}
                                    >
                                      {leftIsAbsent ? 'ABSENT' : 'PRESENT'}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                                    #{left.rollNo}
                                  </div>

                                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                                    {left.name || 'परीक्षार्थी'}
                                  </div>

                                  <div className="text-xs text-slate-600 truncate mt-0.5">
                                    {left.className} {left.section ? `(${left.section})` : ''} • {left.subject}
                                  </div>

                                  {!leftIsAbsent && (
                                    <div className="mt-1.5 flex items-center justify-between text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                        A: 1
                                      </span>
                                      {getStudentBCopies(left.rollNo) > 0 && (
                                        <span className="text-white bg-amber-500 px-1.5 py-0.5 rounded font-black">
                                          B: +{getStudentBCopies(left.rollNo)}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStudentBCopy(left, 1)}
                                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 ml-auto"
                                        title="+ B-कॉपी दें"
                                      >
                                        +B
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-xs font-black text-center min-h-[30px] flex items-center justify-center">
                                  {leftIsAbsent ? (
                                    <span className="text-emerald-700 flex items-center justify-center gap-1">
                                      <UserCheck className="w-3.5 h-3.5" />
                                      उपस्थित
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 flex items-center justify-center gap-1">
                                      <UserX className="w-3.5 h-3.5" />
                                      अनुपस्थित
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div className="p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-bold">
                                खाली सीट
                              </div>
                            )}

                            {/* Right Seat */}
                            {right ? (
                              <button
                                type="button"
                                onClick={() => handleToggle(right)}
                                disabled={togglingRoll === right.rollNo}
                                className={`p-2.5 rounded-xl border-2 text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                                  rightIsAbsent
                                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/50'
                                    : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">दायां (Right)</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                        rightIsAbsent
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                      }`}
                                    >
                                      {rightIsAbsent ? 'ABSENT' : 'PRESENT'}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                                    #{right.rollNo}
                                  </div>

                                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                                    {right.name || 'परीक्षार्थी'}
                                  </div>

                                  <div className="text-xs text-slate-600 truncate mt-0.5">
                                    {right.className} {right.section ? `(${right.section})` : ''} • {right.subject}
                                  </div>

                                  {!rightIsAbsent && (
                                    <div className="mt-1.5 flex items-center justify-between text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                        A: 1
                                      </span>
                                      {getStudentBCopies(right.rollNo) > 0 && (
                                        <span className="text-white bg-amber-500 px-1.5 py-0.5 rounded font-black">
                                          B: +{getStudentBCopies(right.rollNo)}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStudentBCopy(right, 1)}
                                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 ml-auto"
                                        title="+ B-कॉपी दें"
                                      >
                                        +B
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-xs font-black text-center min-h-[30px] flex items-center justify-center">
                                  {rightIsAbsent ? (
                                    <span className="text-emerald-700 flex items-center justify-center gap-1">
                                      <UserCheck className="w-3.5 h-3.5" />
                                      उपस्थित
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 flex items-center justify-center gap-1">
                                      <UserX className="w-3.5 h-3.5" />
                                      अनुपस्थित
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <div className="p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-bold">
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
      )}

      {/* Floating Bottom Status Bar */}
      {(canAccessAllRooms || currentShiftDutyInfo.hasDuty) && (
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
      )}

      {/* 1-Tap Zone Reliever Calling Modal */}
      {isRelieverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={() => setIsRelieverModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-xs">
                <Phone className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                📞 रिलीवर सहायता (Zone Reliever Call)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                कमरा: <strong>{selectedRoomName}</strong> • पानी पीने या आवश्यक कार्य हेतु तुरंत कॉल लगाएं
              </p>
            </div>

            {/* Primary: Designated Zone Reliever (3 rooms per reliever) */}
            {myAssignedZoneReliever ? (
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 mb-4 text-center shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  ⭐ आपके ब्लॉक का निर्धारित रिलीवर ({myAssignedZoneReliever.rangeLabel})
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {myAssignedZoneReliever.name}
                </h4>
                <div className="text-xs text-slate-700 font-black mt-0.5 font-mono">
                  मो० {myAssignedZoneReliever.mobile || 'नंबर उपलब्ध नहीं'}
                </div>
                {myAssignedZoneReliever.mobile && (
                  <a
                    href={`tel:${myAssignedZoneReliever.mobile}`}
                    className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>सीधे फोन कॉल लगाएं (Call Now)</span>
                  </a>
                )}
              </div>
            ) : null}

            {/* Other Relievers & Control Room Emergency */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">अन्य रिलीवर शिक्षक सूची:</div>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {currentSlotRelievers
                  .filter(r => r.id !== myAssignedZoneReliever?.id)
                  .map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
                      <div>
                        <div className="text-slate-900">{r.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{r.rangeLabel}</div>
                      </div>
                      {r.mobile ? (
                        <a href={`tel:${r.mobile}`} className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <Phone className="w-3 h-3" /> कॉल
                        </a>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRelieverModalOpen(false)}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              बंद करें (Close)
            </button>
          </div>
        </div>
      )}

      {/* Digital Copy Handover Receipt Slip Modal */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={() => setIsHandoverModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4 pb-2 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1">
                परीक्षा समाप्ति डिजिटल पावती
              </span>
              <h3 className="text-base font-black text-slate-900">
                📦 उत्तर-पुस्तिका जमा रसीद (Handover Receipt)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                स्ट्रॉन्ग रूम / वितरण लिपिक को जमा करने हेतु तैयार समरी
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-bold">कमरा संख्या:</span>
                <span className="text-slate-900 font-black text-sm">{selectedRoomName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-bold">दिनांक व पाली:</span>
                <span className="text-slate-900 font-bold">{selectedDay.date} | {portalShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-bold">कक्ष निरीक्षक:</span>
                <span className="text-slate-900 font-black">{currentUser?.name} (मो० {currentUser?.phone})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-bold">कुल नामांकित छात्र:</span>
                <span className="text-slate-900 font-bold">{roomStudents.length} छात्र</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-emerald-700 font-bold">उपस्थित छात्र (A-कॉपी जारी):</span>
                <span className="text-emerald-900 font-black">{presentCount}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-rose-700 font-bold">अनुपस्थित छात्र:</span>
                <span className="text-rose-900 font-black">{absentCount}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-amber-800 font-bold">पूरक B-कॉपी कुल खपत:</span>
                <span className="text-amber-950 font-black">{totalRoomBCopies}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                <span className="text-indigo-900 font-black">कुल जमा कॉपियां (A + B):</span>
                <span className="text-indigo-950 font-black text-base">{presentCount + totalRoomBCopies} कॉपी</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const slipText = `*ए.बी.वी.आई.सी. मीरांपुर कटरा*\n*उत्तर-पुस्तिका जमा पावती*\n---------------------------\n🏫 कमरा: ${selectedRoomName}\n📅 दिनांक: ${selectedDay.date} | पाली: ${portalShift}\n👨‍🏫 कक्ष निरीक्षक: ${currentUser?.name} (${currentUser?.phone})\n👥 नामांकित छात्र: ${roomStudents.length}\n✅ उपस्थित छात्र (A-कॉपी): ${presentCount}\n❌ अनुपस्थित: ${absentCount}\n📑 B-कॉपी खपत: ${totalRoomBCopies}\n📦 कुल जमा कॉपियां: ${presentCount + totalRoomBCopies}\n---------------------------`;
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(slipText);
                    alert('✅ जमा पावती क्लिपबोर्ड में कॉपी हो गई!');
                  }
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                📋 पावती कॉपी करें
              </button>
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
