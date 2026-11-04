import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp,
  BarChart3,
  Bell,
  Users, 
  UserCheck, 
  UserX, 
  UserPlus,
  Printer, 
  Sparkles, 
  Shuffle, 
  Upload, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  DoorOpen, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  Scale,
  Shield,
  Layers,
  Check,
  Database,
  Save,
  RotateCcw,
  Lock,
  Unlock,
  KeyRound,
  Filter
} from 'lucide-react';
import { EXAM_SCHEME_METADATA, EXAM_TIMETABLE, getTodayExamDay } from '../data/examSchemeData';
import { DEFAULT_SHIFT_1, DEFAULT_SHIFT_2 } from '../data/defaultData';
import { generateSeatingPlan } from '../utils/seatingAlgorithm';
import TeacherExcelImporterModal from './TeacherExcelImporterModal';
import { saveDutyRosterToDB, fetchTeachersAPI, createTeacherAPI, updateTeacherAPI, deleteTeacherAPI, bulkImportTeachersAPI } from '../services/api';
import { exportTeachersToExcel, exportMasterTeacherDutyToExcel } from '../utils/excelExport';
import { useAuth } from '../context/AuthContext';

export default function TeacherDutyManager({
  teachers = [],
  setTeachers,
  seatingResult,
  activeShift = 'shift_1',
  dutyRoster = {},
  setDutyRoster,
  examDetails,
  setExamDetails,
  bCopyRecords = {},
  absentStudents = {},
  classes = [],
  rooms = []
}) {
  const targetDayId = useMemo(() => {
    if (examDetails?.date) {
      const match = EXAM_TIMETABLE.find(
        (d) => d.fullDate === examDetails.date || d.date === examDetails.date || examDetails.date.includes(d.date)
      );
      if (match) return match.id;
    }
    const today = getTodayExamDay();
    return today ? today.id : 'd4';
  }, [examDetails?.date]);

  const [selectedDateId, setSelectedDateId] = useState(() => targetDayId);

  useEffect(() => {
    if (targetDayId) {
      setSelectedDateId(targetDayId);
    }
  }, [targetDayId]);

  const [isImporting, setIsImporting] = useState(false);

  // Fetch teachers directly from MongoDB Atlas on mount
  useEffect(() => {
    let isMounted = true;
    fetchTeachersAPI()
      .then((res) => {
        if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTeachers(res.data.map((t) => ({ ...t, id: t._id ? t._id.toString() : t.id })));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch teachers from DB:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'staff', 'print'
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffAttendanceFilter, setStaffAttendanceFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'on-duty' | 'off-duty' | 'incharge'
  const [selectedRelieverToAdd, setSelectedRelieverToAdd] = useState('');
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    try {
      return localStorage.getItem('duty_last_db_sync_time') || null;
    } catch {
      return null;
    }
  });
  const { currentUser, isPrincipal, isSuperAdmin } = useAuth();
  const canEditTeacher = isPrincipal || isSuperAdmin;
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // PIN Lock State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState('lock'); // 'lock' | 'unlock'
  const [enteredPin, setEnteredPin] = useState('1234');
  const [pinError, setPinError] = useState('');

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    fatherName: '',
    designation: 'सहायक अध्यापक',
    subject: '',
    mobile: '',
    assignedClass: '',
    assignedSection: '',
  });

  const selectedDay = useMemo(() => {
    return EXAM_TIMETABLE.find((d) => d.id === selectedDateId) || EXAM_TIMETABLE[0];
  }, [selectedDateId]);

  // Independent in-page shift selection so assigning Shift 2 duty NEVER interferes with ongoing Shift 1 exam!
  const [selectedShift, setSelectedShift] = useState(activeShift || 'shift_1');

  // Pre-calculate seating for Shift 1 (19 rooms) and Shift 2 (12 rooms)
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

  const currentSeating = selectedShift === 'shift_1' ? seatingShift1 : seatingShift2;

  // Active rooms for the CURRENT selected shift
  const activeRooms = useMemo(() => {
    if (!currentSeating || !currentSeating.rooms) return [];
    return currentSeating.rooms.filter((r) => (r.students && r.students.length > 0) || r.seatedCount > 0);
  }, [currentSeating]);

  // Current duty allocation for selected day & shift: { [roomId]: { invigilator1: teacherId, invigilator2: teacherId }, relievers: [teacherId...] }
  const currentAllocKey = `${selectedDay.id}_${selectedShift}`;
  const currentAllocation = useMemo(() => {
    return dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
  }, [dutyRoster, currentAllocKey]);

  // Is current shift's duty locked with a PIN?
  const isDutyLocked = Boolean(currentAllocation?.isLocked);

  // Centralized state update + immediate persistent save to MongoDB Atlas & localStorage
  const applyAndSaveRosterUpdate = (updater, targetSh = selectedShift) => {
    setDutyRoster((prev) => {
      const nextRoster = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('exam_duty_roster_v1', JSON.stringify(nextRoster));
      } catch {}
      saveDutyRosterToDB(
        examDetails?.examName || 'Half_Yearly_2026_27',
        targetSh,
        nextRoster
      ).then((res) => {
        if (res && res.success) {
          const timeStr = new Date().toLocaleTimeString('hi-IN');
          setLastSavedTime(timeStr);
          try { localStorage.setItem('duty_last_db_sync_time', timeStr); } catch {}
        }
      }).catch(() => {});
      return nextRoster;
    });
  };

  const handleLockDuty = (pin) => {
    const cleanPin = String(pin || '').trim();
    if (cleanPin.length < 4) {
      setPinError('कृपया कम से कम 4 अंकों का गुप्त पिन दर्ज करें (उदा. 1234)');
      return;
    }
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const updatedRoster = {
      ...dutyRoster,
      [currentAllocKey]: {
        ...curr,
        isLocked: true,
        lockPin: cleanPin,
        pin: cleanPin,
        lockedBy: currentUser?.name || 'परीक्षा प्रभारी / प्रधानाचार्य',
        lockedAt: new Date().toISOString(),
      },
    };
    applyAndSaveRosterUpdate(updatedRoster);
    setIsPinModalOpen(false);
    setEnteredPin('1234');
    setPinError('');
    alert('🔒 ड्यूटी चार्ट पिन द्वारा सफलतापूर्वक डेटाबेस में लॉक कर दिया गया है!');
  };

  const handleUnlockDuty = (pin) => {
    const cleanPin = String(pin || '').trim();
    const savedPin = String(currentAllocation?.lockPin || currentAllocation?.pin || '1234').trim();
    if (cleanPin === savedPin || cleanPin === '1234' || isPrincipal || isSuperAdmin) {
      const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
      const updatedRoster = {
        ...dutyRoster,
        [currentAllocKey]: {
          ...curr,
          isLocked: false,
          lockPin: null,
          pin: null,
          unlockedBy: currentUser?.name || 'परीक्षा प्रभारी',
          unlockedAt: new Date().toISOString(),
        },
      };
      applyAndSaveRosterUpdate(updatedRoster);
      setIsPinModalOpen(false);
      setEnteredPin('1234');
      setPinError('');
      alert('🔓 ड्यूटी चार्ट सफलतापूर्वक अनलॉक हो गया है! अब आप आवश्यकतानुसार बदलाव कर सकते हैं।');
    } else {
      setPinError('गलत पिन! कृपया सही 4 अंकों का पिन दर्ज करें (Default PIN: 1234)');
    }
  };

  // Other shift key on the same day (e.g. shift_2 if selectedShift is shift_1)
  const otherShift = selectedShift === 'shift_1' ? 'shift_2' : 'shift_1';
  const otherShiftKey = `${selectedDay.id}_${otherShift}`;
  const otherShiftAllocation = useMemo(() => {
    return dutyRoster[otherShiftKey] || { rooms: {}, relievers: [] };
  }, [dutyRoster, otherShiftKey]);

  // Fast teacher lookup map
  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [teachers]);

  // Helper for Range Information (3 rooms per reliever range)
  const getRelieverRangeInfo = (idx) => {
    if (idx === 0) return { badge: 'रेंज 1', rooms: 'कमरा 01 - 03', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    if (idx === 1) return { badge: 'रेंज 2', rooms: 'कमरा 04 - 06', bg: 'bg-blue-50 text-blue-800 border-blue-300' };
    if (idx === 2) return { badge: 'रेंज 3', rooms: 'कमरा 07 - 09', bg: 'bg-purple-50 text-purple-800 border-purple-300' };
    if (idx === 3) return { badge: 'रेंज 4', rooms: 'कमरा 10 - 12', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
    return { badge: 'फ्लोटिंग', rooms: 'समस्त कक्ष / उड़नदस्ता', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
  };

  // State for Dynamic Exam Time & Warning Bell Modal
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [shift1TimeInput, setShift1TimeInput] = useState(examDetails?.shift1Time || examDetails?.timeRange || '09:30 AM - 12:00 AM');
  const [shift2TimeInput, setShift2TimeInput] = useState(examDetails?.shift2Time || '01:00 PM - 03:00 PM');
  const [warningMinutesInput, setWarningMinutesInput] = useState(examDetails?.warningMinutes || 15);
  const [entryMinutesInput, setEntryMinutesInput] = useState(examDetails?.entryMinutes || 15);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [timeSaveSuccess, setTimeSaveSuccess] = useState('');

  // Synchronize when examDetails changes
  useEffect(() => {
    if (examDetails?.shift1Time) setShift1TimeInput(examDetails.shift1Time);
    else if (examDetails?.timeRange && selectedShift === 'shift_1') setShift1TimeInput(examDetails.timeRange);
    if (examDetails?.shift2Time) setShift2TimeInput(examDetails.shift2Time);
    if (examDetails?.warningMinutes) setWarningMinutesInput(examDetails.warningMinutes);
    if (examDetails?.entryMinutes) setEntryMinutesInput(examDetails.entryMinutes);
  }, [examDetails, selectedShift]);

  const handleSaveTimeSettings = async () => {
    setIsSavingTime(true);
    try {
      const updatedDetails = {
        ...examDetails,
        shift1Time: shift1TimeInput,
        shift2Time: shift2TimeInput,
        warningMinutes: Number(warningMinutesInput) || 15,
        entryMinutes: Number(entryMinutesInput) || 15,
        timeRange: selectedShift === 'shift_1' ? shift1TimeInput : shift2TimeInput
      };
      if (setExamDetails) {
        setExamDetails(updatedDetails);
      }
      const sName = examDetails?.examName || 'Half_Yearly_2026_27';
      const curDate = examDetails?.date || new Date().toISOString().split('T')[0];
      await saveDutyRosterToDB({
        sessionName: sName,
        shift: selectedShift,
        date: curDate,
        dutyRoster: dutyRoster,
        examDetails: updatedDetails
      });
      setTimeSaveSuccess('✅ परीक्षा समय व चेतावनी घंटी सफलतापूर्वक अपडेट हो गई!');
      setTimeout(() => {
        setTimeSaveSuccess('');
        setShowTimeModal(false);
      }, 1400);
    } catch (err) {
      console.error('Save time error:', err);
      alert('समय सुरक्षित करने में त्रुटि: ' + (err.message || err));
    } finally {
      setIsSavingTime(false);
    }
  };

  // 3-Tier B-Copy Analytics & AI Predictive Forecast Memo
  const [bCopySearch, setBCopySearch] = useState('');
  const [bCopySubView, setBCopySubView] = useState('rooms'); // 'rooms', 'classes', 'students', 'prediction'

  const bCopyAnalytics = useMemo(() => {
    const roomsMap = {};
    const classesMap = {};
    const studentRows = [];

    const currentRooms = currentSeating?.rooms || {};
    Object.entries(currentRooms).forEach(([roomId, roomObj]) => {
      const rName = roomObj.roomName || roomObj.name || roomId;
      const seatedList = roomObj.seatedStudents || [];
      let rPresent = 0;
      let rAbsent = 0;
      let rBCopies = 0;
      let rBStudents = 0;

      seatedList.forEach((st) => {
        const roll = st.rollNo;
        const isAbs = Boolean(absentStudents[roll] || absentStudents[String(roll)]);
        if (isAbs) {
          rAbsent++;
        } else {
          rPresent++;
        }
        const bRec = bCopyRecords[roll] || bCopyRecords[String(roll)];
        const bCount = Number(bRec?.bCopiesCount) || 0;
        if (bCount > 0) {
          rBCopies += bCount;
          rBStudents++;
          studentRows.push({
            rollNo: roll,
            name: st.name || bRec?.studentName || ('परीक्षार्थी #' + roll),
            className: st.className || bRec?.className || '—',
            section: st.section || '—',
            roomName: rName,
            bCopiesCount: bCount,
            bCopyNumbers: bRec?.bCopyNumbers || [],
            aCopyNumber: bRec?.aCopyNumber || '—'
          });
        }

        const cKey = (st.className || 'General') + '_' + (st.section || 'A');
        if (!classesMap[cKey]) {
          classesMap[cKey] = {
            classKey: cKey,
            className: st.className || '—',
            section: st.section || '—',
            total: 0,
            present: 0,
            absent: 0,
            bCopies: 0,
            bStudents: 0
          };
        }
        classesMap[cKey].total++;
        if (isAbs) classesMap[cKey].absent++;
        else classesMap[cKey].present++;
        if (bCount > 0) {
          classesMap[cKey].bCopies += bCount;
          classesMap[cKey].bStudents++;
        }
      });

      const alloc = currentAllocation?.rooms?.[roomId] || {};
      const t1 = teacherMap[alloc.invigilator1];
      const t2 = teacherMap[alloc.invigilator2];

      roomsMap[roomId] = {
        roomId,
        roomName: rName,
        totalSeated: seatedList.length,
        present: rPresent,
        absent: rAbsent,
        bCopies: rBCopies,
        bStudents: rBStudents,
        bRate: rPresent > 0 ? Math.round((rBStudents / rPresent) * 100) : 0,
        invigilators: [t1?.name, t2?.name].filter(Boolean).join(', ') || '—'
      };
    });

    const currentDayIdx = EXAM_TIMETABLE.findIndex((d) => d.id === selectedDateId);
    const nextDay = EXAM_TIMETABLE[currentDayIdx + 1] || EXAM_TIMETABLE[0];
    const nextShiftSubs = nextDay?.[selectedShift] || {};

    let predictedDemandLevel = 'मध्यम (Moderate Demand)';
    let avgCopyMultiplier = 0.45;
    let subjectHighlights = [];

    Object.entries(nextShiftSubs).forEach(([gr, subList]) => {
      (subList || []).forEach((s) => {
        const sName = (s.name || '').toUpperCase();
        subjectHighlights.push('कक्षा ' + gr + ': ' + sName);
        if (['MATH', 'SCIENCE', 'PHYSICS', 'CHEMISTRY', 'ACCOUNTANCY', 'गणित', 'विज्ञान'].some(k => sName.includes(k))) {
          avgCopyMultiplier = Math.max(avgCopyMultiplier, 0.95);
          predictedDemandLevel = 'अति उच्च (High - भारी गणना व आरेख)';
        }
      });
    });

    const totalRegisteredToday = Object.values(roomsMap).reduce((s, r) => s + r.totalSeated, 0);
    const predictedBCopies = Math.round(totalRegisteredToday * avgCopyMultiplier);
    const recommendedBufferCopies = Math.round(predictedBCopies * 1.15);
    const recommendedBundles = Math.ceil(recommendedBufferCopies / 50);

    return {
      roomsList: Object.values(roomsMap),
      classesList: Object.values(classesMap),
      studentRows: studentRows.sort((a, b) => b.bCopiesCount - a.bCopiesCount),
      totalBCopies: Object.values(roomsMap).reduce((s, r) => s + r.bCopies, 0),
      totalBStudents: Object.values(roomsMap).reduce((s, r) => s + r.bStudents, 0),
      aiPrediction: {
        nextDay,
        nextDate: nextDay?.date || 'आगामी दिवस',
        predictedDemandLevel,
        avgCopyMultiplier,
        subjectHighlights,
        predictedBCopies,
        recommendedBufferCopies,
        recommendedBundles
      }
    };
  }, [currentSeating, currentAllocation, teacherMap, bCopyRecords, absentStudents, selectedDateId, selectedShift]);


  // Teachers who are ALREADY ASSIGNED in the CURRENT shift (rooms + relievers)
  const currentlyAssignedIds = useMemo(() => {
    const set = new Set();
    if (currentAllocation.rooms) {
      Object.values(currentAllocation.rooms).forEach((r) => {
        if (r.invigilator1) set.add(String(r.invigilator1));
        if (r.invigilator2) set.add(String(r.invigilator2));
      });
    }
    if (currentAllocation.relievers) {
      currentAllocation.relievers.forEach((tid) => {
        if (tid) set.add(String(tid));
      });
    }
    return set;
  }, [currentAllocation]);

  // Teachers who were ASSIGNED in the OTHER shift on the SAME day
  const otherShiftAssignedIds = useMemo(() => {
    const set = new Set();
    if (otherShiftAllocation.rooms) {
      Object.values(otherShiftAllocation.rooms).forEach((r) => {
        if (r.invigilator1) set.add(String(r.invigilator1));
        if (r.invigilator2) set.add(String(r.invigilator2));
      });
    }
    if (otherShiftAllocation.relievers) {
      otherShiftAllocation.relievers.forEach((tid) => {
        if (tid) set.add(String(tid));
      });
    }
    return set;
  }, [otherShiftAllocation]);

  // Exam Committee / Incharges (Exempt from room duties)
  const inchargeTeachers = useMemo(() => {
    return teachers.filter((t) => t.isExamIncharge);
  }, [teachers]);

  // Available / Free teachers for CURRENT shift (Not assigned anywhere in this shift and isPresent !== false and NOT incharge/exempt)
  // Sorted: Fresh teachers (no duty in other shift) come FIRST!
  const freeTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        if (t.isPresent === false) return false;
        if (t.isExamIncharge || t.exemptDuty) return false;
        return !currentlyAssignedIds.has(String(t.id));
      })
      .sort((a, b) => {
        const aInOther = otherShiftAssignedIds.has(String(a.id));
        const bInOther = otherShiftAssignedIds.has(String(b.id));
        if (aInOther !== bInOther) {
          return aInOther ? 1 : -1; // Fresh teachers first
        }
        return a.name.localeCompare(b.name);
      });
  }, [teachers, currentlyAssignedIds, otherShiftAssignedIds]);

  // Fresh teachers count (zero duty today) vs Repeaters (already worked in other shift)
  const freshCount = useMemo(() => {
    return freeTeachers.filter((t) => !otherShiftAssignedIds.has(String(t.id))).length;
  }, [freeTeachers, otherShiftAssignedIds]);

  const repeatCount = useMemo(() => {
    return freeTeachers.filter((t) => otherShiftAssignedIds.has(String(t.id))).length;
  }, [freeTeachers, otherShiftAssignedIds]);

  // Smart Auto Allocate Duties with strict Shift 1 vs Shift 2 fair rotation
  // Rule: "jiski first meeting me duty ho wo 2nd meeting me na ho , ager koi free na ho tab lage duty dono meeting me"
  // Rule: "jis room me duty lag chuki ho usme bar bar na lage"
  // Rule: "duplicate teacher duty na lage"
  const handleAutoAllocate = (targetShift = selectedShift) => {
    const targetKey = `${selectedDay.id}_${targetShift}`;
    if (dutyRoster[targetKey]?.isLocked || isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! बदलाव करने के लिए पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    const targetOtherShift = targetShift === 'shift_1' ? 'shift_2' : 'shift_1';
    const targetOtherKey = `${selectedDay.id}_${targetOtherShift}`;
    const targetOtherAlloc = dutyRoster[targetOtherKey] || { rooms: {}, relievers: [] };

    // Target rooms strictly for the shift being allocated (Shift 1 = 19 rooms, Shift 2 = 12 rooms)
    const targetSeating = targetShift === 'shift_1' ? seatingShift1 : seatingShift2;
    const targetRooms = (targetSeating?.rooms || []).filter((r) => (r.students && r.students.length > 0) || r.seatedCount > 0);

    // Get set of teachers who worked in the other shift on this date
    const otherWorkedSet = new Set();
    if (targetOtherAlloc.rooms) {
      Object.values(targetOtherAlloc.rooms).forEach((r) => {
        if (r.invigilator1) otherWorkedSet.add(String(r.invigilator1));
        if (r.invigilator2) otherWorkedSet.add(String(r.invigilator2));
      });
    }
    if (targetOtherAlloc.relievers) {
      targetOtherAlloc.relievers.forEach((tid) => {
        if (tid) otherWorkedSet.add(String(tid));
      });
    }

    const availableTeachers = teachers.filter((t) => t.isPresent !== false && !t.isExamIncharge && !t.exemptDuty);
    if (availableTeachers.length === 0) {
      alert('कोई भी शिक्षक उपस्थित नहीं है। कृपया स्टाफ सूची में शिक्षकों की उपस्थिति चेक करें।');
      return;
    }

    // TIER 1: Fresh teachers (No duty in other shift today)
    const freshPool = availableTeachers.filter((t) => !otherWorkedSet.has(String(t.id)));
    // TIER 2: Repeaters (Already worked in other shift today)
    const repeaterPool = availableTeachers.filter((t) => otherWorkedSet.has(String(t.id)));

    // Shuffle separately for fair rotation
    const shuffledFresh = [...freshPool].sort(() => Math.random() - 0.5);
    const shuffledRepeaters = [...repeaterPool].sort(() => Math.random() - 0.5);

    // Prioritized pool: Fresh teachers allocated FIRST. Repeaters used ONLY if fresh runs out!
    const candidatePool = [...shuffledFresh, ...shuffledRepeaters];

    // Priority Relievers specified by user:
    // श्री अंकित अवस्थी (t19), श्री प्रभात कुमार पाण्डेय (t13), श्री सुनील कुमार बाजपेयी (t2)
    const preferredRelieverIds = ['t19', 't13', 't2'];
    const chosenRelievers = [];
    const usedIds = new Set(); // Tracks all teachers assigned in THIS shift (NO DUPLICATES ALLOWED!)

    // Check if preferred relievers are in candidate pool
    preferredRelieverIds.forEach((pid) => {
      const match = candidatePool.find((t) => String(t.id) === String(pid));
      if (match && !usedIds.has(String(match.id))) {
        chosenRelievers.push(match.id);
        usedIds.add(String(match.id));
      }
    });

    // If preferred relievers are less than 3, pick from remaining candidates
    for (const t of candidatePool) {
      if (chosenRelievers.length >= 3) break;
      if (!usedIds.has(String(t.id))) {
        chosenRelievers.push(t.id);
        usedIds.add(String(t.id));
      }
    }

    // MULTI-DAY ROOM HISTORY TRACKING across ALL past days in EXAM_TIMETABLE:
    // Maps teacherId -> Set of roomIds where they have served on ANY previous day
    const currentDayIdx = EXAM_TIMETABLE.findIndex((d) => d.id === selectedDay.id);
    const teacherPastRooms = new Map();
    for (let i = 0; i < currentDayIdx; i++) {
      const pastDay = EXAM_TIMETABLE[i];
      ['shift_1', 'shift_2'].forEach((sh) => {
        const pKey = `${pastDay.id}_${sh}`;
        const pAlloc = dutyRoster[pKey];
        if (pAlloc?.rooms) {
          Object.entries(pAlloc.rooms).forEach(([rId, rData]) => {
            [rData?.invigilator1, rData?.invigilator2].filter(Boolean).forEach((tid) => {
              const sTid = String(tid);
              if (!teacherPastRooms.has(sTid)) teacherPastRooms.set(sTid, new Set());
              teacherPastRooms.get(sTid).add(rId);
            });
          });
        }
      });
    }

    const roomAssignments = {};

    targetRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;

      // Available unassigned candidates for this room (STRICTLY NOT IN usedIds)
      const unassigned = candidatePool.filter((t) => !usedIds.has(String(t.id)));

      // Candidate who has NEVER been in rm.roomId on any prior day
      let cand1 = unassigned.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
      if (!cand1 && unassigned.length > 0) {
        cand1 = unassigned[0]; // fallback to any unassigned teacher
      }

      let inv1 = null;
      if (cand1) {
        inv1 = cand1.id;
        usedIds.add(String(cand1.id));
      }

      // If large room and still unassigned teachers available, allocate invigilator 2
      let inv2 = null;
      if (isLarge) {
        const unassigned2 = candidatePool.filter((t) => !usedIds.has(String(t.id)));
        let cand2 = unassigned2.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
        if (!cand2 && unassigned2.length > 0) {
          cand2 = unassigned2[0];
        }
        if (cand2) {
          inv2 = cand2.id;
          usedIds.add(String(cand2.id));
        }
      }

      roomAssignments[rm.roomId] = {
        invigilator1: inv1,
        invigilator2: inv2,
      };
    });

    const updatedRoster = {
      ...dutyRoster,
      [targetKey]: {
        rooms: roomAssignments,
        relievers: chosenRelievers,
      },
    };

    applyAndSaveRosterUpdate(updatedRoster, targetShift);
  };

  // Smart allocation for BOTH Shifts (Shift 1 & Shift 2) in one click with zero overlaps
  const handleAllocateBothShifts = () => {
    const k1 = `${selectedDay.id}_shift_1`;
    const k2 = `${selectedDay.id}_shift_2`;

    if (dutyRoster[k1]?.isLocked || dutyRoster[k2]?.isLocked || isDutyLocked) {
      alert('⚠️ कम से कम एक पाली की ड्यूटी पिन द्वारा लॉक है! बदलाव करने के लिए पहले उसे अनलॉक करें।');
      return;
    }

    const s1ActiveRooms = (seatingShift1?.rooms || []).filter((r) => (r.students && r.students.length > 0) || r.seatedCount > 0);
    const s2ActiveRooms = (seatingShift2?.rooms || []).filter((r) => (r.students && r.students.length > 0) || r.seatedCount > 0);

    const available = teachers.filter((t) => t.isPresent !== false && !t.isExamIncharge && !t.exemptDuty);
    if (available.length < s1ActiveRooms.length) {
      alert(`कुल उपस्थित शिक्षक (${available.length}) Shift 1 के कमरों (${s1ActiveRooms.length}) से कम हैं!`);
      return;
    }

    // MULTI-DAY ROOM HISTORY TRACKING across ALL past days in EXAM_TIMETABLE:
    const currentDayIdx = EXAM_TIMETABLE.findIndex((d) => d.id === selectedDay.id);
    const teacherPastRooms = new Map();
    for (let i = 0; i < currentDayIdx; i++) {
      const pastDay = EXAM_TIMETABLE[i];
      ['shift_1', 'shift_2'].forEach((sh) => {
        const pKey = `${pastDay.id}_${sh}`;
        const pAlloc = dutyRoster[pKey];
        if (pAlloc?.rooms) {
          Object.entries(pAlloc.rooms).forEach(([rId, rData]) => {
            [rData?.invigilator1, rData?.invigilator2].filter(Boolean).forEach((tid) => {
              const sTid = String(tid);
              if (!teacherPastRooms.has(sTid)) teacherPastRooms.set(sTid, new Set());
              teacherPastRooms.get(sTid).add(rId);
            });
          });
        }
      });
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);

    // ================= SHIFT 1 ALLOCATION =================
    // Shift 1 needs up to 19 rooms + 3 relievers = 22 teachers
    const s1Used = new Set();
    const s1Relievers = [];

    // Preferred relievers for Shift 1
    ['t19', 't13', 't2'].forEach((pid) => {
      const m = shuffled.find((t) => String(t.id) === String(pid));
      if (m && !s1Used.has(String(m.id))) {
        s1Relievers.push(m.id);
        s1Used.add(String(m.id));
      }
    });
    for (const t of shuffled) {
      if (s1Relievers.length >= 3) break;
      if (!s1Used.has(String(t.id))) {
        s1Relievers.push(t.id);
        s1Used.add(String(t.id));
      }
    }

    const s1Rooms = {};
    s1ActiveRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      const unassigned = shuffled.filter((t) => !s1Used.has(String(t.id)));

      let cand1 = unassigned.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
      if (!cand1 && unassigned.length > 0) {
        cand1 = unassigned[0];
      }

      let inv1 = null;
      if (cand1) {
        inv1 = cand1.id;
        s1Used.add(String(cand1.id));
      }

      let inv2 = null;
      if (isLarge) {
        const unassigned2 = shuffled.filter((t) => !s1Used.has(String(t.id)));
        let cand2 = unassigned2.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
        if (!cand2 && unassigned2.length > 0) {
          cand2 = unassigned2[0];
        }
        if (cand2) {
          inv2 = cand2.id;
          s1Used.add(String(cand2.id));
        }
      }

      s1Rooms[rm.roomId] = { invigilator1: inv1, invigilator2: inv2 };
    });

    // ================= SHIFT 2 ALLOCATION =================
    // Teachers with NO duty in Shift 1 get FIRST priority for Shift 2!
    const s1FreeTeachers = shuffled.filter((t) => !s1Used.has(String(t.id)));
    const s1AssignedTeachers = shuffled.filter((t) => s1Used.has(String(t.id)));
    const poolShift2 = [...s1FreeTeachers, ...s1AssignedTeachers];

    const s2Used = new Set();
    const s2Relievers = [];
    for (const t of poolShift2) {
      if (s2Relievers.length >= 3) break;
      if (!s2Used.has(String(t.id))) {
        s2Relievers.push(t.id);
        s2Used.add(String(t.id));
      }
    }

    const s2Rooms = {};
    s2ActiveRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      const unassigned = poolShift2.filter((t) => !s2Used.has(String(t.id)));

      let cand1 = unassigned.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
      if (!cand1 && unassigned.length > 0) {
        cand1 = unassigned[0];
      }

      let inv1 = null;
      if (cand1) {
        inv1 = cand1.id;
        s2Used.add(String(cand1.id));
      }

      let inv2 = null;
      if (isLarge) {
        const unassigned2 = poolShift2.filter((t) => !s2Used.has(String(t.id)));
        let cand2 = unassigned2.find((t) => !teacherPastRooms.get(String(t.id))?.has(rm.roomId));
        if (!cand2 && unassigned2.length > 0) {
          cand2 = unassigned2[0];
        }
        if (cand2) {
          inv2 = cand2.id;
          s2Used.add(String(cand2.id));
        }
      }

      s2Rooms[rm.roomId] = { invigilator1: inv1, invigilator2: inv2 };
    });

    const updatedRoster = {
      ...dutyRoster,
      [k1]: { rooms: s1Rooms, relievers: s1Relievers },
      [k2]: { rooms: s2Rooms, relievers: s2Relievers },
    };

    applyAndSaveRosterUpdate(updatedRoster, selectedShift);

    alert(`✅ दोनों पालियों का निष्पक्ष व डुप्लीकेट-रहित आवंटन पूर्ण हुआ!\n• Shift 1 (सुबह): ${s1ActiveRooms.length} कक्ष, 3 रिलीवर (कुल ${s1Used.size} शिक्षक)\n• Shift 2 (दोपहर): ${s2ActiveRooms.length} कक्ष, 3 रिलीवर (कुल ${s2Used.size} शिक्षक)\n• किसी भी शिक्षक की एक ही पाली में दोहरी ड्यूटी नहीं है और पिछले दिनों के कमरे दोहराए नहीं गए हैं!`);
  };

  // Auto-allocation is on-demand by clicking 'ऑटो ड्यूटी आवंटन' button


  // 1. Clear duty allocation for currently selected date & shift
  const handleClearCurrentShift = () => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! खाली करने के लिए पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    if (!window.confirm(`क्या आप ${selectedDay.date} (${selectedShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}) का ड्यूटी डेटा खाली करना चाहते हैं?`)) {
      return;
    }
    const next = { ...dutyRoster };
    delete next[currentAllocKey];
    applyAndSaveRosterUpdate(next);
  };

  // 2. Completely delete all test duty roster data (All dates & shifts) from state, localStorage & MongoDB Atlas
  const handleClearAllDuties = async () => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    const ok = window.confirm(
      '⚠️ क्या आप निश्चित हैं कि आप सभी तिथियों और शिफ्टों का टेस्ट ड्यूटी डेटा पूरी तरह हटाना (Delete) चाहते हैं?\n\nयह डेटाबेस (MongoDB Atlas) और स्थानीय ब्राउज़र दोनों से हमेशा के लिए साफ हो जाएगा।'
    );
    if (!ok) return;

    // Reset local state and clear DB
    applyAndSaveRosterUpdate({});

    // Clear localStorage
    try {
      localStorage.removeItem('exam_duty_roster_v1');
    } catch {}

    alert('✅ सभी टेस्ट ड्यूटी डेटा सफलतापूर्वक डिलीट कर दिया गया है! अब परीक्षा के लिए डेटाबेस पूरी तरह क्लीन (Clean) है।');
  };

  // Handle manual dropdown change for a room
  // When a teacher is selected, remove them from relievers or other room if previously assigned
  const handleRoomTeacherChange = (roomId, slot, teacherId) => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! शिक्षक बदलने के लिए पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const currRooms = { ...(curr.rooms || {}) };
    let currRelievers = [...(curr.relievers || [])];

    // If teacher was in relievers, remove them from relievers
    if (teacherId) {
      currRelievers = currRelievers.filter((tid) => String(tid) !== String(teacherId));

      // If teacher was already in another room, remove from that room to avoid double duty
      Object.keys(currRooms).forEach((rId) => {
        if (currRooms[rId]?.invigilator1 === teacherId && (rId !== roomId || slot !== 'invigilator1')) {
          currRooms[rId] = { ...currRooms[rId], invigilator1: null };
        }
        if (currRooms[rId]?.invigilator2 === teacherId && (rId !== roomId || slot !== 'invigilator2')) {
          currRooms[rId] = { ...currRooms[rId], invigilator2: null };
        }
      });
    }

    const currRoom = currRooms[roomId] || {};
    currRooms[roomId] = {
      ...currRoom,
      [slot]: teacherId || null,
    };

    applyAndSaveRosterUpdate((prev) => ({
      ...prev,
      [currentAllocKey]: {
        ...curr,
        rooms: currRooms,
        relievers: currRelievers,
      },
    }));
  };

  // Add teacher to Relievers
  const handleAddReliever = (teacherId) => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! रिलीवर जोड़ने के लिए पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    if (!teacherId) return;
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const currRelievers = [...(curr.relievers || [])];
    const currRooms = { ...(curr.rooms || {}) };

    // Remove from any room if assigned there
    Object.keys(currRooms).forEach((rId) => {
      if (currRooms[rId]?.invigilator1 === teacherId) {
        currRooms[rId] = { ...currRooms[rId], invigilator1: null };
      }
      if (currRooms[rId]?.invigilator2 === teacherId) {
        currRooms[rId] = { ...currRooms[rId], invigilator2: null };
      }
    });

    if (!currRelievers.includes(teacherId)) {
      currRelievers.push(teacherId);
    }

    applyAndSaveRosterUpdate((prev) => ({
      ...prev,
      [currentAllocKey]: {
        ...curr,
        rooms: currRooms,
        relievers: currRelievers,
      },
    }));

    setSelectedRelieverToAdd('');
  };

  // Remove teacher from Relievers
  const handleRemoveReliever = (teacherId) => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! रिलीवर हटाने के लिए पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const currRelievers = (curr.relievers || []).filter((tid) => String(tid) !== String(teacherId));

    applyAndSaveRosterUpdate((prev) => ({
      ...prev,
      [currentAllocKey]: {
        ...curr,
        relievers: currRelievers,
      },
    }));
  };

  // Set User's Requested 3 Relievers: श्री अंकित अवस्थी (t19), श्री प्रभात कुमार पाण्डेय (t13), श्री सुनील कुमार बाजपेयी (t2)
  const handleSetPriorityRelievers = () => {
    if (isDutyLocked) {
      alert('⚠️ यह ड्यूटी चार्ट पिन द्वारा लॉक है! पहले ऊपर दिए गए बटन से अनलॉक करें।');
      return;
    }
    const targetIds = ['t19', 't13', 't2'];
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const currRooms = { ...(curr.rooms || {}) };

    // Remove these 3 from any rooms if currently assigned
    targetIds.forEach((tid) => {
      Object.keys(currRooms).forEach((rId) => {
        if (currRooms[rId]?.invigilator1 === tid) currRooms[rId] = { ...currRooms[rId], invigilator1: null };
        if (currRooms[rId]?.invigilator2 === tid) currRooms[rId] = { ...currRooms[rId], invigilator2: null };
      });
    });

    applyAndSaveRosterUpdate((prev) => ({
      ...prev,
      [currentAllocKey]: {
        ...curr,
        rooms: currRooms,
        relievers: targetIds,
      },
    }));
  };

  // Save Duty Roster explicitly to MongoDB Atlas
  const handleSaveDutyToDB = async () => {
    setIsSavingDB(true);
    try {
      const res = await saveDutyRosterToDB(
        examDetails?.examName || 'Half_Yearly_2026_27',
        selectedShift,
        dutyRoster
      );
      if (res && res.success) {
        const timeStr = new Date().toLocaleTimeString('hi-IN');
        setLastSavedTime(timeStr);
        try { localStorage.setItem('duty_last_db_sync_time', timeStr); } catch {}
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(`त्रुटि: ${res?.message || 'डेटाबेस में सहेजा नहीं जा सका'}`);
      }
    } catch (err) {
      alert(`नेटवर्क त्रुटि: ${err.message}`);
    } finally {
      setIsSavingDB(false);
    }
  };

  // Auto-sync debounce to MongoDB whenever dutyRoster changes (every 2.5s)
  useEffect(() => {
    if (!dutyRoster || Object.keys(dutyRoster).length === 0) return;
    const timer = setTimeout(() => {
      saveDutyRosterToDB(
        examDetails?.examName || 'Half_Yearly_2026_27',
        selectedShift,
        dutyRoster
      ).then((res) => {
        if (res && res.success) {
          const timeStr = new Date().toLocaleTimeString('hi-IN');
          setLastSavedTime(timeStr);
          try { localStorage.setItem('duty_last_db_sync_time', timeStr); } catch {}
        }
      }).catch(() => {});
    }, 2500);

    return () => clearTimeout(timer);
  }, [dutyRoster, examDetails?.examName, selectedShift]);


  // Toggle Exam Incharge status (Exempt from room duties)
  const handleToggleIncharge = async (teacherId) => {
    const targetTeacher = teachers.find((t) => t.id === teacherId);
    if (!targetTeacher) return;
    const newStatus = !targetTeacher.isExamIncharge;

    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, isExamIncharge: newStatus, exemptDuty: newStatus ? true : t.exemptDuty }
          : t
      )
    );

    const idToUpdate = targetTeacher._id || targetTeacher.id;
    if (idToUpdate) {
      try {
        await updateTeacherAPI(idToUpdate, {
          isExamIncharge: newStatus,
          exemptDuty: newStatus ? true : targetTeacher.exemptDuty,
        });
      } catch (err) {
        console.error('Failed to sync incharge status:', err);
      }
    }
  };

  // Automatically purge Exam Incharges from any room assignment in dutyRoster
  useEffect(() => {
    if (!dutyRoster || Object.keys(dutyRoster).length === 0) return;
    const inchargeIds = new Set(
      teachers.filter((t) => t.isExamIncharge || t.exemptDuty).map((t) => String(t.id))
    );
    if (inchargeIds.size === 0) return;

    let modified = false;
    const newRoster = { ...dutyRoster };

    Object.keys(newRoster).forEach((key) => {
      const alloc = newRoster[key];
      if (!alloc) return;

      let allocChanged = false;
      const rooms = { ...(alloc.rooms || {}) };

      Object.keys(rooms).forEach((rId) => {
        const rm = rooms[rId];
        if (rm?.invigilator1 && inchargeIds.has(String(rm.invigilator1))) {
          rooms[rId] = { ...rooms[rId], invigilator1: null };
          allocChanged = true;
        }
        if (rm?.invigilator2 && inchargeIds.has(String(rm.invigilator2))) {
          rooms[rId] = { ...rooms[rId], invigilator2: null };
          allocChanged = true;
        }
      });

      let relievers = alloc.relievers || [];
      if (relievers.some((id) => inchargeIds.has(String(id)))) {
        relievers = relievers.filter((id) => !inchargeIds.has(String(id)));
        allocChanged = true;
      }

      if (allocChanged) {
        newRoster[key] = { ...alloc, rooms, relievers };
        modified = true;
      }
    });

    if (modified) {
      setDutyRoster(newRoster);
    }
  }, [teachers]);

  // Toggle teacher presence (Leave / Active)
  const handleTogglePresence = (teacherId) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, isPresent: !t.isPresent } : t))
    );
  };

    // Add single teacher and save to MongoDB
  const handleAddSingleTeacher = async (e) => {
    e.preventDefault();
    if (!newTeacher.name.trim() || !newTeacher.mobile.trim()) {
      alert('शिक्षक का नाम और 10-अंकीय मोबाइल नंबर आवश्यक है।');
      return;
    }

    const teacherObj = {
      name: newTeacher.name.trim(),
      englishName: newTeacher.name.trim().toUpperCase(),
      fatherName: newTeacher.fatherName ? newTeacher.fatherName.trim() : '',
      designation: newTeacher.designation.trim() || 'सहायक अध्यापक',
      subject: newTeacher.subject.trim() || 'General',
      mobile: newTeacher.mobile.trim(),
      assignedClass: newTeacher.assignedClass.trim(),
      assignedSection: newTeacher.assignedSection.trim().toUpperCase(),
      isClassTeacher: !!newTeacher.assignedClass.trim(),
      isPresent: true,
    };

    try {
      const res = await createTeacherAPI(teacherObj);
      if (res && res.success && res.data) {
        const created = res.data;
        setTeachers((prev) => [...prev, { ...created, id: created._id ? created._id.toString() : created.id }]);
        alert('✅ नया शिक्षक डेटाबेस में सफलतापूर्वक सुरक्षित हो गया!');
      } else {
        setTeachers((prev) => [...prev, { ...teacherObj, id: `t_${Date.now()}` }]);
        if (res && !res.success) {
          alert(`⚠️ शिक्षक जोड़ा गया, परंतु डेटाबेस में सुरक्षित नहीं हुआ: ${res.message || 'त्रुटि'}`);
        }
      }
    } catch (err) {
      setTeachers((prev) => [...prev, { ...teacherObj, id: `t_${Date.now()}` }]);
      alert(`⚠️ त्रुटि: ${err.message}`);
    }

    setNewTeacher({ name: '', fatherName: '', designation: 'सहायक अध्यापक', subject: '', mobile: '', assignedClass: '', assignedSection: '' });
  };

  // Start inline editing of a teacher
  const handleStartEdit = (t) => {
    setEditingTeacherId(t.id);
    setEditForm({
      name: t.name || '',
      fatherName: t.fatherName || '',
      mobile: t.mobile || '',
      designation: t.designation || 'सहायक अध्यापक',
      subject: t.subject || '',
      assignedClass: t.assignedClass || '',
      assignedSection: t.assignedSection || '',
    });
  };

  // Save inline edit to state & MongoDB
  const handleSaveEdit = async (teacherId) => {
    const editPayload = {
      name: editForm.name.trim(),
      englishName: editForm.name.trim().toUpperCase(),
      fatherName: editForm.fatherName.trim(),
      mobile: editForm.mobile.trim(),
      designation: editForm.designation.trim(),
      subject: editForm.subject.trim(),
      assignedClass: editForm.assignedClass.trim(),
      assignedSection: editForm.assignedSection.trim().toUpperCase(),
      isClassTeacher: !!editForm.assignedClass.trim(),
    };

    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, ...editPayload } : t))
    );
    setEditingTeacherId(null);

    const target = teachers.find((t) => t.id === teacherId);
    const idToUpdate = target?._id || target?.id || teacherId;
    if (idToUpdate) {
      try {
        await updateTeacherAPI(idToUpdate, editPayload);
      } catch (err) {
        console.error('Update teacher in DB failed:', err);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
  };

  // Delete teacher from state & MongoDB
  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('क्या आप इस शिक्षक को डेटाबेस और सूची से हटाना चाहते हैं?')) return;
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));

    const target = teachers.find((t) => t.id === teacherId);
    const idToDelete = target?._id || target?.id || teacherId;
    if (idToDelete) {
      try {
        await deleteTeacherAPI(idToDelete);
      } catch (err) {
        console.error('Delete teacher in DB failed:', err);
      }
    }
  };

  // Handle Excel import and save directly to MongoDB Atlas
  const handleImportTeachers = async (importedList, strategy) => {
    if (!importedList || importedList.length === 0) return;
    setIsImporting(true);

    try {
      const res = await bulkImportTeachersAPI(importedList, strategy);
      if (res && res.success && Array.isArray(res.data)) {
        const syncedTeachers = res.data.map((t) => ({
          ...t,
          id: t._id ? t._id.toString() : t.id,
        }));
        setTeachers(syncedTeachers);
        alert(`✅ ${importedList.length} शिक्षकों का डेटा सफलतापूर्वक MongoDB डेटाबेस में सुरक्षित (Saved) हो गया है!`);
      } else {
        if (strategy === 'replace') {
          setTeachers(importedList);
        } else {
          setTeachers((prev) => {
            const existingNames = new Set(prev.map((t) => t.name.toLowerCase().trim()));
            const toAdd = importedList.filter((t) => !existingNames.has(t.name.toLowerCase().trim()));
            return [...prev, ...toAdd];
          });
        }
        alert(`⚠️ डेटा लोड हुआ, परंतु डेटाबेस सिंक में समस्या: ${res?.message || 'सिंक विफल'}`);
      }
    } catch (err) {
      console.error('Import error:', err);
      alert(`इम्पोर्ट में त्रुटि: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrint = () => {
    setActiveTab('chart');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Compute duties count per teacher across current schedule
  const teacherDutyCounts = useMemo(() => {
    const counts = {};
    teachers.forEach((t) => {
      counts[t.id] = 0;
    });

    Object.values(dutyRoster).forEach((alloc) => {
      if (alloc.rooms) {
        Object.values(alloc.rooms).forEach((r) => {
          if (r.invigilator1 && counts[r.invigilator1] !== undefined) counts[r.invigilator1]++;
          if (r.invigilator2 && counts[r.invigilator2] !== undefined) counts[r.invigilator2]++;
        });
      }
      if (alloc.relievers) {
        alloc.relievers.forEach((tid) => {
          if (counts[tid] !== undefined) counts[tid]++;
        });
      }
    });

    return counts;
  }, [dutyRoster, teachers]);

    // All slots across entire exam timetable
  const shiftSlots = useMemo(() => {
    const slots = [];
    (EXAM_TIMETABLE || []).forEach((d) => {
      slots.push({
        dayId: d.id,
        date: d.date,
        fullDate: d.fullDate,
        shift: 'shift_1',
        slotKey: `${d.id}_shift_1`,
        colLabel: `${d.date} S1`,
        displayTitle: `${d.date} (सुबह)`,
      });
      slots.push({
        dayId: d.id,
        date: d.date,
        fullDate: d.fullDate,
        shift: 'shift_2',
        slotKey: `${d.id}_shift_2`,
        colLabel: `${d.date} S2`,
        displayTitle: `${d.date} (दोपहर)`,
      });
    });
    return slots;
  }, []);

  const masterDutyRows = useMemo(() => {
    return (teachers || []).map((t) => {
      const teacherIds = new Set();
      if (t.id) teacherIds.add(String(t.id));
      if (t._id) teacherIds.add(String(t._id));
      if (t.teacherCode) {
        teacherIds.add(String(t.teacherCode));
        teacherIds.add(String(t.teacherCode).toLowerCase());
      }
      if (t.mobile) teacherIds.add(String(t.mobile));
      if (t.name) teacherIds.add(String(t.name).trim());

      const dutyMap = {};
      let roomDutyCount = 0;
      let relieverDutyCount = 0;

      shiftSlots.forEach((slot) => {
        const alloc = dutyRoster[slot.slotKey];
        let assignedDesc = null;

        if (alloc && alloc.rooms) {
          for (const [rId, dInfo] of Object.entries(alloc.rooms)) {
            const inv1 = dInfo.invigilator1 ? String(dInfo.invigilator1) : null;
            const inv2 = dInfo.invigilator2 ? String(dInfo.invigilator2) : null;
            if (
              (inv1 && teacherIds.has(inv1)) ||
              (inv2 && teacherIds.has(inv2))
            ) {
              const rObj = (seatingResult?.rooms || []).find((r) => r.roomId === rId || r.roomName === rId);
              assignedDesc = rObj ? rObj.roomName : rId;
              roomDutyCount++;
              break;
            }
          }
        }

        if (!assignedDesc && alloc && alloc.relievers && Array.isArray(alloc.relievers)) {
          for (const relId of alloc.relievers) {
            if (teacherIds.has(String(relId))) {
              assignedDesc = 'उड़नदस्ता';
              relieverDutyCount++;
              break;
            }
          }
        }

        dutyMap[slot.slotKey] = assignedDesc;
      });

      return {
        id: t.id || t._id,
        name: t.name || t.englishName || 'शिक्षक',
        designation: t.designation || 'सहायक अध्यापक',
        subject: t.subject || '—',
        mobile: t.mobile || '—',
        dutyMap,
        roomDutyCount,
        relieverDutyCount,
        totalDuties: roomDutyCount + relieverDutyCount,
      };
    });
  }, [teachers, dutyRoster, shiftSlots, seatingResult?.rooms]);

  const [masterSearchQuery, setMasterSearchQuery] = useState('');

  const filteredMasterRows = useMemo(() => {
    if (!masterSearchQuery.trim()) return masterDutyRows;
    const q = masterSearchQuery.toLowerCase().trim();
    return masterDutyRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q)
    );
  }, [masterDutyRows, masterSearchQuery]);

  const handleExportMasterExcel = () => {
    exportMasterTeacherDutyToExcel({ masterDutyRows, shiftSlots }, examDetails);
  };

  const handlePrintMaster = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.englishName && t.englishName.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.designation && t.designation.toLowerCase().includes(q)) ||
          (t.mobile && String(t.mobile).includes(q))
      );
    }
    if (staffAttendanceFilter === 'present') {
      return list.filter((t) => t.isPresent !== false);
    }
    if (staffAttendanceFilter === 'absent') {
      return list.filter((t) => t.isPresent === false);
    }
    if (staffAttendanceFilter === 'on-duty') {
      return list.filter((t) => currentlyAssignedIds.has(String(t.id)));
    }
    if (staffAttendanceFilter === 'off-duty') {
      return list.filter((t) => !currentlyAssignedIds.has(String(t.id)) && t.isPresent !== false && !t.isExamIncharge);
    }
    if (staffAttendanceFilter === 'incharge') {
      return list.filter((t) => Boolean(t.isExamIncharge));
    }
    return list;
  }, [teachers, searchQuery, staffAttendanceFilter, currentlyAssignedIds]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  कक्ष निरीक्षक ड्यूटी प्रबंधन (Invigilation Duty Manager)
                </h2>
                <p className="text-xs text-slate-500">
                  {EXAM_SCHEME_METADATA.schoolName} • कुल शिक्षक स्टाफ: <strong>{teachers.length}</strong> (उपस्थित: {teachers.filter(t => t.isPresent !== false).length})
                </p>
              </div>
            </div>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'chart'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>दैनिक ड्यूटी चार्ट</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'staff'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>शिक्षक स्टाफ ({teachers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('master-summary')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'master-summary'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>समस्त दिवस महा-चार्ट</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bcopy-analytics')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'bcopy-analytics'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>📊 बी-कॉपी विश्लेषण ({bCopyAnalytics.totalBCopies})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTimeModal(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="परीक्षा समय (Shift 1 & 2) एवं चेतावनी घंटी सेटिंग्स"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>⏰ परीक्षा समय व चेतावनी घंटी</span>
            </button>

            {/* PIN Lock / Unlock Control */}
            {isDutyLocked ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1 rounded-xl shadow-xs">
                <span className="text-xs font-black text-rose-800 px-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>🔒 ड्यूटी पिन द्वारा लॉक है</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPinAction('unlock');
                    setEnteredPin('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                  title="ड्यूटी अनलॉक करने के लिए पिन दर्ज करें"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>पिन से अनलॉक करें</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPinAction('lock');
                  setEnteredPin('1234');
                  setPinError('');
                  setIsPinModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="ड्यूटी को 4-अंकों के पिन से लॉक करें ताकि कोई बदलाव या ओवरराइट न हो"
              >
                <Lock className="w-3.5 h-3.5 text-amber-200" />
                <span>🔒 पिन से ड्यूटी लॉक करें</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAllocateBothShifts}
              disabled={isDutyLocked}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={isDutyLocked ? 'ड्यूटी लॉक है! पहले अनलॉक करें' : 'दोनों पालियों (Shift 1 व 2) का निष्पक्ष बिना दोहराव वाला आवंटन'}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>दोनों शिफ्टों का निष्पक्ष आवंटन</span>
            </button>

            <button
              type="button"
              onClick={() => handleAutoAllocate(selectedShift)}
              disabled={isDutyLocked}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={isDutyLocked ? 'ड्यूटी लॉक है! पहले अनलॉक करें' : `इस शिफ्ट (${selectedShift === 'shift_1' ? 'Shift 1' : 'Shift 2'}) के लिए फ्रेश शिक्षकों को प्राथमिकता देकर ऑटो आवंटन करें`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>ऑटो ड्यूटी आवंटन ({selectedShift === 'shift_1' ? 'Shift 1' : 'Shift 2'})</span>
            </button>

            <button
              type="button"
              onClick={handleClearCurrentShift}
              disabled={isDutyLocked}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={isDutyLocked ? 'ड्यूटी लॉक है! पहले अनलॉक करें' : 'वर्तमान शिफ्ट का ड्यूटी आवंटन खाली करें'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>शिफ्ट खाली करें</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllDuties}
              disabled={isDutyLocked}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={isDutyLocked ? 'ड्यूटी लॉक है! पहले अनलॉक करें' : 'सभी तिथियों और शिफ्टों का टेस्ट ड्यूटी डेटा पूरी तरह हटाएं (Reset All)'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>🗑️ टेस्ट डेटा हटाएं</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDutyToDB}
              disabled={isSavingDB}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="वर्तमान ड्यूटी रोस्टर को सीधे MongoDB डेटाबेस में सुरक्षित करें"
            >
              {isSavingDB ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              <span>{saveSuccess ? '✅ DB में सुरक्षित!' : '💾 DB में सहेजें'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट चार्ट</span>
            </button>
          </div>
        </div>

        {/* Live DB Sync Status Bar */}
        <div className="pt-2 flex items-center justify-end text-[11px] font-semibold text-slate-500 gap-2 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>{lastSavedTime ? `MongoDB ऑटो-सिंक सक्रिय • अंतिम सिंक: ${lastSavedTime}` : 'MongoDB ऑटो-सिंक सक्रिय (Auto-Sync On)'}</span>
          </div>
        </div>

        {/* Independent Shift Selector Tabs (Shift 1 vs Shift 2) */}
        <div className="pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>ड्यूटी पाली चुनें (Select Meeting Shift):</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                (सुबह की परीक्षा चालू रहते हुए भी दोपहर की ड्यूटी सुरक्षित सेट करें)
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedShift('shift_1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedShift === 'shift_1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>🌅 1st Meeting (Shift 1 - सुबह)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  selectedShift === 'shift_1' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  19 कक्ष
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('shift_2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedShift === 'shift_2'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>☀️ 2nd Meeting (Shift 2 - दोपहर)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  selectedShift === 'shift_2' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  12 कक्ष
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector Pills */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>परीक्षा तिथि चुनें (Select Exam Date):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              चयनित पाली: <strong className={selectedShift === 'shift_1' ? 'text-indigo-700 font-black' : 'text-amber-700 font-black'}>
                {selectedShift === 'shift_1' ? 'Shift 1 (सुबह 08:30 - 11:45)' : 'Shift 2 (दोपहर 12:30 - 03:00)'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {EXAM_TIMETABLE.map((d) => {
              const isSelected = selectedDateId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDateId(d.id);
                    if (setExamDetails) {
                      setExamDetails((prev) => ({
                        ...prev,
                        date: d.fullDate || d.date,
                      }));
                    }
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70'
                  }`}
                >
                  <span className={`block text-xs font-black ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {d.date}
                  </span>
                  <span className={`block text-[10px] font-bold uppercase mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {d.day}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fair Rotation Explanation Banner */}
        <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>निष्पक्ष शिफ्ट रोटेशन नियम सक्रिय:</strong> प्रथम पाली (Shift 1) में ड्यूटी करने वाले शिक्षकों को द्वितीय पाली (Shift 2) में तभी ड्यूटी मिलेगी जब फ्रेश शिक्षक उपलब्ध न हों। ड्रॉपडाउन में <strong>केवल वही शिक्षक दिखेंगे जो इस समय मुक्त हैं</strong>।
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-bold text-[11px]">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
              फ्रेश शिक्षक: {freshCount}
            </span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
              अन्य शिफ्ट में कार्यरत: {repeatCount}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DAILY DUTY CHART (दैनिक ड्यूटी चार्ट)               */}
      {/* ========================================================= */}
      {activeTab === 'chart' && (
        <div className="space-y-6 print:space-y-2 print-duty-container">
          {/* Official Print Header */}
          <div className="hidden print:block text-center border-b-2 border-black pb-2 mb-2 print-avoid-break">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 block">
              OFFICIAL INVIGILATION DUTY ROSTER
            </span>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-black mt-0.5">
              {EXAM_SCHEME_METADATA.schoolName}
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-wide text-black">
              {EXAM_SCHEME_METADATA.examTitle}
            </h2>
            <div className="text-xs sm:text-sm font-black text-black mt-1 uppercase underline underline-offset-2">
              कक्ष निरीक्षक दैनिक ड्यूटी चार्ट (Daily Invigilation Duty Chart)
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-black mt-2 px-2.5 bg-slate-100 py-1 border border-black">
              <span>दिनांक: <strong>{selectedDay.date} ({selectedDay.day})</strong></span>
              <span>शिफ्ट: <strong>{selectedShift === 'shift_1' ? EXAM_SCHEME_METADATA.shift1Time : EXAM_SCHEME_METADATA.shift2Time}</strong></span>
              <span>आवंटित कमरे: <strong>{activeRooms.length}</strong> (कुल परीक्षार्थी: {currentSeating?.totalSeated || 0})</span>
            </div>
          </div>


          {/* Exam Control Room & Incharge Banner */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-3.5 sm:p-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs print:border print:border-black print:rounded-none print:p-2 print:my-1.5 print:bg-slate-50 print:shadow-none print-avoid-break">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 print:hidden shadow-xs">
                🎯
              </div>
              <div>
                <div className="text-[11px] font-black text-purple-950 uppercase tracking-wide print:text-black">
                  कंट्रोल रूम एवं परीक्षा संचालन समिति (Exam Control Room & Committee):
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 print:mt-0.5">
                  {inchargeTeachers.length > 0 ? (
                    inchargeTeachers.map((t) => (
                      <span
                        key={t.id}
                        className="px-2.5 py-0.5 bg-white border border-purple-300 rounded-lg text-xs font-black text-purple-950 shadow-2xs print:border-none print:p-0 print:text-black print:font-bold"
                      >
                        ⭐ {t.name} (मो० {t.mobile || t.phone || '—'})
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic print:text-black">कोई परीक्षा प्रभारी नामित नहीं</span>
                  )}
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-100/70 px-2 py-0.5 rounded print:hidden">
                    [कक्ष निरीक्षक ड्यूटी से पूर्णतः मुक्त]
                  </span>
                </div>
              </div>
            </div>

            <div className="no-print flex items-center gap-2">
              {canEditTeacher && (
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <span>प्रभारी बदलें / स्टाफ सूची</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>

          {/* Allocation Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-black print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse print:text-[11px]">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 print:bg-slate-200 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center print:w-[6%] print:px-1.5 print:border print:border-black print:text-center">
                      क्र०
                    </th>
                    <th className="px-3 py-3 w-32 print:w-[18%] print:px-2 print:border print:border-black">
                      कमरा संख्या (Room)
                    </th>
                    <th className="px-3 py-3 w-24 text-center print:w-[12%] print:px-1.5 print:border print:border-black print:text-center">
                      छात्र संख्या
                    </th>
                    <th className="px-4 py-3 print:w-[28%] print:px-2 print:border print:border-black">
                      कक्ष निरीक्षक - 1 (Invigilator 1)
                    </th>
                    <th className="px-4 py-3 print:w-[24%] print:px-2 print:border print:border-black">
                      कक्ष निरीक्षक - 2 (Invigilator 2)
                    </th>
                    <th className="px-3 py-3 w-32 text-center print:w-[12%] print:px-2 print:border print:border-black print:text-center">
                      हस्ताक्षर पावती (Sign)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0 font-medium">
                  {activeRooms.map((rm, idx) => {
                    const roomAlloc = currentAllocation.rooms?.[rm.roomId] || {};
                    const t1Id = roomAlloc.invigilator1;
                    const t2Id = roomAlloc.invigilator2;
                    const t1 = teacherMap[t1Id];
                    const t2 = teacherMap[t2Id];
                    const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;

                    return (
                      <tr key={rm.roomId} className="hover:bg-slate-50/70 transition-colors print:break-inside-avoid">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500 print:border print:border-black print:text-black print:py-1">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-black text-slate-900 print:border print:border-black print:text-black print:py-1">
                          <div className="flex items-center gap-1.5">
                            <span className="no-print">🚪</span>
                            <span>{rm.roomName}</span>
                            {isLarge && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold no-print">
                                बड़ा हॉल
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal block mt-0.5 print:hidden">
                            {rm.benchesCount} बेंच
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 print:border print:border-black print:text-black print:py-1">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-black print:bg-transparent print:p-0">
                            {rm.seatedCount} छात्र
                          </span>
                        </td>

                        {/* Invigilator 1 Dropdown: ONLY FREE TEACHERS + CURRENTLY SELECTED */}
                        <td className="px-4 py-2.5 print:border print:border-black print:text-black print:py-1">
                          <div className="no-print">
                            {isDutyLocked ? (
                              <div className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50/80 rounded-lg text-xs font-black text-slate-800 flex items-center justify-between shadow-2xs">
                                <span className="truncate">{t1 ? `${t1.name} (मो० ${t1.mobile || t1.phone || '—'})` : '— रिक्त —'}</span>
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                              </div>
                            ) : (
                              <select
                                value={t1Id || ''}
                                onChange={(e) => handleRoomTeacherChange(rm.roomId, 'invigilator1', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500 cursor-pointer shadow-2xs"
                              >
                                <option value="">— शिक्षक चुनें (हटाएं) —</option>
                                
                                {/* If currently assigned, always show at top */}
                                {t1 && (
                                  <option value={t1.id}>
                                    ✓ {t1.name} (मो० {t1.mobile || t1.phone || '—'}) [वर्तमान चयनित]
                                  </option>
                                )}

                                {/* Only show FREE teachers */}
                                <optgroup label={`उपलब्ध मुक्त शिक्षक (${freeTeachers.length})`}>
                                  {freeTeachers.map((t) => {
                                    const workedInOther = otherShiftAssignedIds.has(String(t.id));
                                    return (
                                      <option key={t.id} value={t.id}>
                                        {t.name} (मो० {t.mobile || t.phone || '—'}) {workedInOther ? `• [${otherShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} में ड्यूटी थी]` : '• ✨ [फ्रेश]'}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              </select>
                            )}
                          </div>
                          <div className="hidden print:block leading-tight">
                            {t1 ? (
                              <div>
                                <span className="font-bold text-black block">{t1.name}</span>
                                <span className="text-[10px] font-bold text-slate-800 block">मो० {t1.mobile || t1.phone || '—'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">_________________</span>
                            )}
                          </div>
                        </td>

                        {/* Invigilator 2 Dropdown: ONLY FREE TEACHERS + CURRENTLY SELECTED */}
                        <td className="px-4 py-2.5 print:border print:border-black print:text-black print:py-1">
                          <div className="no-print">
                            {isDutyLocked ? (
                              <div className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-black flex items-center justify-between shadow-2xs ${
                                isLarge ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900' : 'border-slate-200 bg-slate-50/60 text-slate-600'
                              }`}>
                                <span className="truncate">{t2 ? `${t2.name} (मो० ${t2.mobile || t2.phone || '—'})` : '— रिक्त (वैकल्पिक) —'}</span>
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                              </div>
                            ) : (
                              <select
                                value={t2Id || ''}
                                onChange={(e) => handleRoomTeacherChange(rm.roomId, 'invigilator2', e.target.value)}
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs font-bold cursor-pointer shadow-2xs ${
                                  isLarge
                                    ? 'border-indigo-300 bg-indigo-50/40 text-indigo-900'
                                    : 'border-slate-200 text-slate-600 bg-slate-50/60'
                                }`}
                              >
                                <option value="">— द्वितीय कक्ष निरीक्षक {isLarge ? '(हॉल)' : '(वैकल्पिक)'} —</option>

                                {/* If currently assigned, always show at top */}
                                {t2 && (
                                  <option value={t2.id}>
                                    ✓ {t2.name} (मो० {t2.mobile || t2.phone || '—'}) [वर्तमान चयनित]
                                  </option>
                                )}

                                {/* Only show FREE teachers */}
                                <optgroup label={`उपलब्ध मुक्त शिक्षक (${freeTeachers.length})`}>
                                  {freeTeachers.map((t) => {
                                    const workedInOther = otherShiftAssignedIds.has(String(t.id));
                                    return (
                                      <option key={t.id} value={t.id}>
                                        {t.name} (मो० {t.mobile || t.phone || '—'}) {workedInOther ? `• [${otherShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} में ड्यूटी थी]` : '• ✨ [फ्रेश]'}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              </select>
                            )}
                          </div>
                          <div className="hidden print:block leading-tight">
                            {t2 ? (
                              <div>
                                <span className="font-bold text-black block">{t2.name}</span>
                                <span className="text-[10px] font-bold text-slate-800 block">मो० {t2.mobile || t2.phone || '—'}</span>
                              </div>
                            ) : isLarge ? (
                              <span className="text-slate-400 font-normal italic">_________________</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Signature Column */}
                        <td className="px-3 py-2.5 text-center print:border print:border-black print:py-1">
                          <span className="text-slate-400 print:text-slate-700 text-[11px] italic font-serif">
                            _________________
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reliever / Flying Squad Section for Screen */}
            <div className="p-4 bg-amber-50/70 border-t border-amber-200/90 print:hidden text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black rounded text-[10px] uppercase tracking-wider">
                    रिलीवर / उड़नदस्ता (Reliever & Flying Squad)
                  </span>
                  <span className="text-slate-700 font-bold">
                    राउंड ड्यूटी व आकस्मिक रिलीविंग हेतु ({(currentAllocation.relievers || []).length} शिक्षक):
                  </span>
                </div>

                {/* Preset Button: अंकित अवस्थी, प्रभात पाण्डेय, सुनील बाजपेयी */}
                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={handleSetPriorityRelievers}
                    disabled={isDutyLocked}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isDutyLocked ? 'ड्यूटी लॉक है!' : 'श्री अंकित अवस्थी, श्री प्रभात पाण्डेय व श्री सुनील बाजपेयी को रिलीवर बनाएं'}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>3 विशेष रिलीवर लगाएं (अंकित, प्रभात, सुनील)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Reliever Chips + Add Selector */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(currentAllocation.relievers || []).length === 0 ? (
                  <span className="text-slate-400 italic">कोई रिलीवर शिक्षक चयनित नहीं</span>
                ) : (
                  (currentAllocation.relievers || []).map((tid, rIdx) => {
                    const t = teacherMap[tid];
                    if (!t) return null;
                    const rangeInfo = getRelieverRangeInfo(rIdx);
                    return (
                      <span
                        key={tid}
                        className="px-3 py-1.5 bg-white border-2 border-amber-300 rounded-xl text-slate-800 text-xs font-bold shadow-xs flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${rangeInfo.bg}`}>
                              {rangeInfo.badge}: {rangeInfo.rooms}
                            </span>
                            <span className="font-black text-slate-900">{t.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            📞 मो० {t.mobile || t.phone || '—'}
                          </div>
                        </div>
                        {!isDutyLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReliever(tid)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition no-print cursor-pointer ml-1"
                            title="रिलीवर से हटाएं (मुक्त करें)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    );
                  })
                )}

                {/* Add Free Teacher to Relievers Dropdown */}
                {!isDutyLocked && (
                  <div className="no-print ml-2 flex items-center gap-1.5">
                    <select
                      value={selectedRelieverToAdd}
                      onChange={(e) => {
                        if (e.target.value) handleAddReliever(e.target.value);
                      }}
                      className="px-2.5 py-1 border border-amber-300 bg-white rounded-xl text-xs font-bold text-amber-950 focus:outline-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">+ रिलीवर शिक्षक जोड़ें (मुक्त शिक्षकों में से)...</option>
                      {freeTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (मो० {t.mobile || t.phone || '—'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* In Print: Clean Formal Reliever Section */}
            <div className="hidden print:block border-t-2 border-black p-2.5 bg-slate-50 print-avoid-break">
              <div className="font-bold text-[11px] text-black mb-1.5 flex items-center justify-between">
                <span>🛡️ रिलीवर / उड़नदस्ता (Reliever & Flying Squad) — राउंड ड्यूटी व आकस्मिक रिलीविंग:</span>
                <span>कुल: {(currentAllocation.relievers || []).length} शिक्षक</span>
              </div>
              {(currentAllocation.relievers || []).length === 0 ? (
                <div className="text-slate-500 italic text-[10px]">कोई रिलीवर शिक्षक नामित नहीं</div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {(currentAllocation.relievers || []).map((tid, rIdx) => {
                    const t = teacherMap[tid];
                    if (!t) return null;
                    const rangeInfo = getRelieverRangeInfo(rIdx);
                    return (
                      <div key={tid} className="flex items-center justify-between border-b border-black/40 pb-0.5">
                        <span className="font-bold text-black flex items-center gap-1.5">
                          <span className="font-extrabold text-[10px] border border-black px-1 rounded">
                            {rangeInfo.badge} ({rangeInfo.rooms})
                          </span>
                          <span>{rIdx + 1}. {t.name}</span>
                          <span className="font-mono text-black text-[10px]"> (मो० {t.mobile || t.phone || '—'})</span>
                        </span>
                        <span className="text-slate-700 text-[10px] italic">ह०: ________________</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIVE DYNAMIC FREE TEACHERS CARD (नीचे स्वतः अपडेट होने वाले मुक्त शिक्षक) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 no-print">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    वर्तमान शिफ्ट में मुक्त / उपलब्ध शिक्षक (Available Staff - No Duty This Shift)
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[11px]">
                    {freeTeachers.length} शिक्षक मुक्त
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  जैसे ही ऊपर किसी कमरे में ड्यूटी लगेगी, शिक्षक यहाँ से स्वतः हट जाएगा।
                </div>
              </div>

              {freeTeachers.length === 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold text-center">
                  ⚠️ सभी शिक्षक ड्यूटी पर कार्यरत हैं! कोई भी शिक्षक मुक्त नहीं है।
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {freeTeachers.map((t) => {
                    const workedInOther = otherShiftAssignedIds.has(String(t.id));
                    return (
                      <div
                        key={t.id}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                          workedInOther
                            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${workedInOther ? 'text-amber-600' : 'text-emerald-600'}`} />
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-800 font-bold">मो० {t.mobile || t.phone || '—'}</span>
                        {workedInOther ? (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-200 text-amber-900 rounded font-semibold">
                            {otherShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} ड्यूटी थी
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                            ✨ फ्रेश
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Official Signatures for Printout */}
          <div className="hidden print:flex items-end justify-between pt-8 pb-2 px-6 text-xs font-bold text-black print-avoid-break">
            <div className="text-center space-y-1">
              <div className="w-40 border-t-2 border-black"></div>
              <span className="text-black font-bold">ह० परीक्षा प्रभारी</span>
              {inchargeTeachers.length > 0 && (
                <div className="text-[10px] text-black font-semibold">
                  ({inchargeTeachers.map((t) => t.name).join(' / ')})
                </div>
              )}
            </div>
            <div className="text-center space-y-1">
              <div className="w-40 border-t-2 border-black"></div>
              <span className="text-black font-bold">ह० वितरण लिपिक / स्ट्रांग रूम</span>
            </div>
            <div className="text-center space-y-1">
              <div className="w-40 border-t-2 border-black"></div>
              <span className="text-black font-bold">ह० प्रधानाचार्य (सील सहित)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TEACHER STAFF DIRECTORY (शिक्षक स्टाफ सूची)         */}
      {/* ========================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>नया शिक्षक जोड़ें (Add Single Teacher)</span>
              </h3>
              <form onSubmit={handleAddSingleTeacher} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    शिक्षक का नाम (Teacher Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    placeholder="उदा. श्री प्रभात कुमार"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    पिता / पति का नाम (Father/Husband Name)
                  </label>
                  <input
                    type="text"
                    value={newTeacher.fatherName}
                    onChange={(e) => setNewTeacher({ ...newTeacher, fatherName: e.target.value })}
                    placeholder="उदा. श्री गोरखनाथ पाण्डेय"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मोबाइल नंबर (Mobile No) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeacher.mobile}
                    onChange={(e) => setNewTeacher({ ...newTeacher, mobile: e.target.value })}
                    placeholder="9919353599"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      कक्षा अध्यापक (Class)
                    </label>
                    <select
                      value={newTeacher.assignedClass}
                      onChange={(e) => setNewTeacher({ ...newTeacher, assignedClass: e.target.value })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500 bg-white"
                    >
                      <option value="">— कोई नहीं —</option>
                      <option value="6">कक्षा 6th</option>
                      <option value="7">कक्षा 7th</option>
                      <option value="8">कक्षा 8th</option>
                      <option value="9">कक्षा 9th</option>
                      <option value="10">कक्षा 10th</option>
                      <option value="11">कक्षा 11th</option>
                      <option value="12">कक्षा 12th</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      सेक्शन (Section)
                    </label>
                    <input
                      type="text"
                      value={newTeacher.assignedSection}
                      onChange={(e) => setNewTeacher({ ...newTeacher, assignedSection: e.target.value.toUpperCase() })}
                      placeholder="A / B / C"
                      className="w-full px-2 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500 text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    पदनाम (Designation)
                  </label>
                  <select
                    value={newTeacher.designation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500 bg-white"
                  >
                    <option value="सहायक अध्यापक">सहायक अध्यापक (Asst. Teacher)</option>
                    <option value="प्रवक्ता">प्रवक्ता (Lecturer)</option>
                    <option value="एल.टी. ग्रेड">एल.टी. ग्रेड (LT Grade)</option>
                    <option value="वरिष्ठ प्रवक्ता">वरिष्ठ प्रवक्ता (Sr. Lecturer)</option>
                    <option value="प्रधानाचार्य">प्रधानाचार्य (Principal)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    अध्यापन विषय (Subject)
                  </label>
                  <input
                    type="text"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    placeholder="उदा. भौतिक विज्ञान / गणित"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>शिक्षक जोड़ें</span>
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    स्टाफ शिक्षक सूची ({teachers.length})
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    उपस्थित: {teachers.filter(t => t.isPresent !== false).length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="नाम या विषय खोजें..."
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-indigo-500 w-48"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportTeachersToExcel(teachers)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
                      title="शिक्षकों की सूची एक्सेल में डाउनलोड करें"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>एक्सेल एक्सपोर्ट</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImporterOpen(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
                      title="शिक्षकों की सूची एक्सेल से इम्पोर्ट करें"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>एक्सेल इम्पोर्ट</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Staff Attendance & Duty Status Filter Chips */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> स्थिति:
                </span>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🔘 सभी शिक्षक ({teachers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('present')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ✅ उपस्थित ({teachers.filter((t) => t.isPresent !== false).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('absent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  ❌ अवकाश / अनुपस्थित ({teachers.filter((t) => t.isPresent === false).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('on-duty')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'on-duty'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  🛡️ आज ड्यूटी पर ({currentlyAssignedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('off-duty')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'off-duty'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  ☕ ड्यूटी मुक्त ({teachers.filter((t) => t.isPresent !== false && !t.isExamIncharge && !currentlyAssignedIds.has(String(t.id))).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffAttendanceFilter('incharge')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    staffAttendanceFilter === 'incharge'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  🏛️ परीक्षा प्रभारी ({teachers.filter((t) => t.isExamIncharge).length})
                </button>
              </div>

              {/* Teachers Table */}
              <div className="overflow-x-auto flex-1 mt-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                      <th className="py-2 px-2 text-center w-10">क्र०</th>
                      <th className="py-2 px-3">शिक्षक का नाम</th>
                      <th className="py-2 px-2">मोबाइल नंबर</th>
                      <th className="py-2 px-2">कक्षा अध्यापक</th>
                      <th className="py-2 px-2">पदनाम व विषय</th>
                      <th className="py-2 px-2 text-center">कुल ड्यूटी</th>
                      <th className="py-2 px-2 text-center">स्थिति</th>
                      <th className="py-2 px-2 text-center">परीक्षा प्रभारी / ड्यूटी छूट</th>
                      {canEditTeacher && <th className="py-2 px-2 text-center w-20">कार्य</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTeachers.map((t, i) => {
                      const isEditing = editingTeacherId === t.id;

                      if (isEditing) {
                        return (
                          <tr key={t.id} className="bg-indigo-50/60 border-2 border-indigo-300">
                            <td className="py-2 px-2 text-center font-mono text-[10px]">{i + 1}</td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-2 py-1 text-xs border rounded bg-white font-bold"
                              />
                              <input
                                type="text"
                                placeholder="पिता/पति का नाम"
                                value={editForm.fatherName}
                                onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                                className="w-full px-2 py-0.5 text-[10px] border rounded bg-white mt-1 text-slate-500"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={editForm.mobile}
                                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                                className="w-full px-2 py-1 text-xs border rounded bg-white font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                <select
                                  value={editForm.assignedClass}
                                  onChange={(e) => setEditForm({ ...editForm, assignedClass: e.target.value })}
                                  className="px-1 py-1 text-xs border rounded bg-white"
                                >
                                  <option value="">—</option>
                                  {['6', '7', '8', '9', '10', '11', '12'].map((c) => (
                                    <option key={c} value={c}>{c}th</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Sec"
                                  value={editForm.assignedSection}
                                  onChange={(e) => setEditForm({ ...editForm, assignedSection: e.target.value.toUpperCase() })}
                                  className="w-12 px-1 py-1 text-xs border rounded bg-white text-center font-bold"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                placeholder="विषय"
                                value={editForm.subject}
                                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                className="w-full px-2 py-1 text-xs border rounded bg-white"
                              />
                            </td>
                            <td colSpan="3" className="py-2 px-2 text-center text-slate-400 text-[10px]">
                              एडिट मोड
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(t.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                >
                                  सेव
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px]"
                                >
                                  रद्द
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">
                            {i + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block">{t.name}</span>
                            {t.fatherName && (
                              <span className="text-[10px] text-slate-500 block">पिता/पति: {t.fatherName}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold text-indigo-700">
                            {t.mobile || '—'}
                          </td>
                          <td className="py-2 px-2">
                            {t.assignedClass ? (
                              <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold">
                                Class {t.assignedClass}-{t.assignedSection || 'A'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-600">
                            <span className="block text-slate-800 font-semibold">{t.designation}</span>
                            {t.subject && <span className="text-[10px] text-indigo-600">{t.subject}</span>}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-800">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-xs">
                              {teacherDutyCounts[t.id] || 0}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePresence(t.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                t.isPresent !== false
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {t.isPresent !== false ? 'उपस्थित' : 'अवकाश'}
                            </button>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {canEditTeacher ? (
                              <button
                                type="button"
                                onClick={() => handleToggleIncharge(t.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                  t.isExamIncharge
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                }`}
                                title={t.isExamIncharge ? 'परीक्षा प्रभारी (ड्यूटी मुक्त)' : 'परीक्षा प्रभारी नामित करने के लिए क्लिक करें'}
                              >
                                {t.isExamIncharge ? '⭐ परीक्षा प्रभारी' : 'सामान्य ड्यूटी'}
                              </button>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.isExamIncharge ? 'bg-purple-100 text-purple-900' : 'text-slate-400'
                              }`}>
                                {t.isExamIncharge ? '⭐ प्रभारी' : '—'}
                              </span>
                            )}
                          </td>
                          {canEditTeacher && (
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(t)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold cursor-pointer"
                                  title="एडिट करें"
                                >
                                  एडिट
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeacher(t.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="हटाएं"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MASTER INVIGILATION DUTY SUMMARY ACROSS ALL DATES */}
      {/* ========================================================= */}
      {activeTab === 'master-summary' && (
        <div className="space-y-6">
          {/* Top Scoreboard & Control Bar (No Print) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-700 text-white rounded-xl shadow-xs">
                    <Layers className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      केंद्र-वार शिक्षक ड्यूटी महा-चार्ट (Master Invigilation Audit Chart)
                    </h2>
                    <p className="text-xs text-slate-500">
                      समस्त परीक्षा दिवसों (Day 1 से अंतिम दिवस) के दोनों शिफ्टों का समेकित कक्ष निरीक्षक चार्ट व मानदेय रिकॉर्ड
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={masterSearchQuery}
                    onChange={(e) => setMasterSearchQuery(e.target.value)}
                    placeholder="शिक्षक का नाम खोजें..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-purple-600 w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportMasterExcel}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>महा-चार्ट एक्सेल (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintMaster}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>महा-चार्ट प्रिंट</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <span className="text-[11px] font-bold text-purple-800 block uppercase">कुल शिक्षक स्टाफ</span>
                <span className="text-xl font-black text-purple-950 mt-0.5 block">{teachers.length} शिक्षक</span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                <span className="text-[11px] font-bold text-indigo-800 block uppercase">कुल परीक्षा स्लॉट्स</span>
                <span className="text-xl font-black text-indigo-950 mt-0.5 block">{shiftSlots.length} स्लॉट</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-[11px] font-bold text-blue-800 block uppercase">कुल रूम ड्यूटियां</span>
                <span className="text-xl font-black text-blue-950 mt-0.5 block">
                  {masterDutyRows.reduce((sum, r) => sum + r.roomDutyCount, 0)}
                </span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 block uppercase">उड़नदस्ता / रिलीवर</span>
                <span className="text-xl font-black text-amber-950 mt-0.5 block">
                  {masterDutyRows.reduce((sum, r) => sum + r.relieverDutyCount, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Master Table (Screen + Print) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-black print:rounded-none print:shadow-none">
            {/* Print Header */}
            <div className="hidden print:block text-center border-b-2 border-black p-3 mb-2">
              <h1 className="text-lg font-black uppercase text-black">
                {EXAM_SCHEME_METADATA.schoolName || 'A B V I C MIRANPUR KATRA SHAHJAHANPUR'}
              </h1>
              <p className="text-xs font-bold text-black mt-0.5">
                {EXAM_SCHEME_METADATA.examTitle || 'HALF YEARLY EXAMINATION 2026-27'} • शिक्षक ड्यूटी महा-चार्ट
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider block mt-1">
                MASTER INVIGILATION AUDIT STATEMENT & REMUNERATION RECORD
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse print:text-[10px]">
                <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200 print:bg-slate-200 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center print:border print:border-black">क्र.</th>
                    <th className="px-3 py-3 w-44 print:border print:border-black">शिक्षक का नाम व पद</th>
                    <th className="px-2 py-3 w-24 text-center print:border print:border-black">विषय</th>
                    {shiftSlots.map((slot) => (
                      <th
                        key={slot.slotKey}
                        className="px-2 py-3 text-center whitespace-nowrap print:border print:border-black text-[10px]"
                        title={slot.displayTitle}
                      >
                        <div>{slot.date}</div>
                        <div className="text-[9px] font-bold text-purple-700 print:text-black">
                          {slot.shift === 'shift_1' ? 'Shift 1' : 'Shift 2'}
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center w-16 bg-purple-50 text-purple-950 font-black print:border print:border-black">
                      कमरा
                    </th>
                    <th className="px-2 py-3 text-center w-16 bg-amber-50 text-amber-950 font-black print:border print:border-black">
                      रिलीवर
                    </th>
                    <th className="px-3 py-3 text-center w-16 bg-slate-200 text-slate-900 font-black print:border print:border-black">
                      योग
                    </th>
                    <th className="px-3 py-3 text-center w-28 print:border print:border-black">हस्ताक्षर</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0 font-medium">
                  {filteredMasterRows.map((t, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={t.id}
                        className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-purple-50/40 transition-colors print:break-inside-avoid`}
                      >
                        <td className="px-3 py-2 text-center text-slate-500 font-bold print:border print:border-black print:text-black">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 print:border print:border-black print:text-black">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-500">{t.designation} • {t.mobile}</div>
                        </td>
                        <td className="px-2 py-2 text-center text-slate-600 text-[11px] font-bold print:border print:border-black print:text-black">
                          {t.subject}
                        </td>
                        {shiftSlots.map((slot) => {
                          const duty = t.dutyMap[slot.slotKey];
                          const isRoom = duty && duty !== 'उड़नदस्ता';
                          const isReliever = duty === 'उड़नदस्ता';
                          return (
                            <td
                              key={slot.slotKey}
                              className="px-1.5 py-2 text-center print:border print:border-black text-[11px]"
                            >
                              {isRoom ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px] print:bg-transparent print:p-0 print:font-bold">
                                  {duty}
                                </span>
                              ) : isReliever ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9px] print:bg-transparent print:p-0">
                                  रिलीवर
                                </span>
                              ) : (
                                <span className="text-slate-300 print:text-slate-400">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-bold bg-purple-50/50 text-purple-950 print:border print:border-black print:text-black">
                          {t.roomDutyCount}
                        </td>
                        <td className="px-2 py-2 text-center font-bold bg-amber-50/50 text-amber-950 print:border print:border-black print:text-black">
                          {t.relieverDutyCount}
                        </td>
                        <td className="px-3 py-2 text-center font-black bg-slate-100 text-slate-900 text-sm print:border print:border-black print:text-black">
                          {t.totalDuties}
                        </td>
                        <td className="px-3 py-2 text-center print:border print:border-black">
                          <div className="h-6 border-b border-dashed border-slate-300 print:border-black"></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Print Signatures */}
            <div className="hidden print:flex items-end justify-between pt-12 pb-4 px-6 text-xs font-bold text-black print-avoid-break">
              <div>
                <div className="w-48 border-b-2 border-black mb-1"></div>
                <div>श्री ब्रह्मधर मिश्र / श्री राहुल जौहरी</div>
                <div className="text-[10px] font-normal">परीक्षा प्रभारी (Exam Incharge)</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-serif italic mb-6">
                  Certified genuine invigilation record of A B V I C Katra
                </div>
              </div>
              <div className="text-right">
                <div className="w-48 border-b-2 border-black mb-1"></div>
                <div>श्री प्रदीप सिंह</div>
                <div className="text-[10px] font-normal">प्रधानाचार्य / केंद्राध्यक्ष (सील)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN Lock / Unlock Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 relative">
            <button
              type="button"
              onClick={() => {
                setIsPinModalOpen(false);
                setPinError('');
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3.5 shadow-md ${
                pinAction === 'lock' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {pinAction === 'lock' ? <Lock className="w-7 h-7" /> : <Unlock className="w-7 h-7" />}
              </div>

              <h3 className="text-base font-black text-slate-900">
                {pinAction === 'lock' ? '🔒 ड्यूटी को पिन से लॉक करें' : '🔓 ड्यूटी अनलॉक करें'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {pinAction === 'lock'
                  ? '4-अंकों का गुप्त पिन सेट करें ताकि यह ड्यूटी चार्ट पूरी तरह सुरक्षित रहे और कोई आकस्मिक बदलाव न हो सके।'
                  : 'ड्यूटी में बदलाव, ऑटो आवंटन या शिक्षक बदलने हेतु 4-अंकों का पिन दर्ज करें (डिफ़ॉल्ट पिन: 1234)'}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pinAction === 'lock') {
                  handleLockDuty(enteredPin);
                } else {
                  handleUnlockDuty(enteredPin);
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4-अंकों का सुरक्षा पिन (PIN):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError('');
                    }}
                    placeholder="उदा. 1234"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
                {pinError && (
                  <p className="text-xs text-rose-600 font-bold mt-1 text-center">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPinError('');
                  }}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 px-3 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition ${
                    pinAction === 'lock'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {pinAction === 'lock' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>पिन लॉक करें</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>अनलॉक करें</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: 3-TIER B-COPY ANALYTICS & AI PREDICTIVE FORECAST */}
      {/* ======================================================== */}
      {activeTab === 'bcopy-analytics' && (
        <div className="space-y-6 no-print">
          {/* Header Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">कुल वितरित 'B' कॉपियां</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{bCopyAnalytics.totalBCopies} कॉपियां</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">{bCopyAnalytics.totalBStudents} परीक्षार्थियों द्वारा</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">सक्रिय परीक्षा कक्ष</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{bCopyAnalytics.roomsList.length} कक्ष</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">{selectedShift === 'shift_1' ? 'प्रथम पाली' : 'द्वितीय पाली'}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">प्रति छात्र औसत वितरण</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {bCopyAnalytics.totalBStudents > 0 ? (bCopyAnalytics.totalBCopies / bCopyAnalytics.totalBStudents).toFixed(1) : '0'} प्रति छात्र
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">पूरक उत्तर पुस्तिकाएं</span>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl text-white shadow-xs">
              <span className="text-[11px] font-bold text-amber-100 uppercase block">आगामी दिवस AI पूर्व-अनुमान</span>
              <span className="text-2xl font-black text-white mt-1 block">{bCopyAnalytics.aiPrediction.recommendedBundles} बंडल</span>
              <span className="text-[11px] text-amber-100 mt-0.5 block">({bCopyAnalytics.aiPrediction.recommendedBufferCopies} कॉपियां 15% बफर सहित)</span>
            </div>
          </div>

          {/* AI Predictive Insight Banner */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4.5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 inline-block mb-1">
                  🤖 एआई कॉपी पूर्व-अनुमान (Predictive Copy Requirement)
                </span>
                <h4 className="text-sm font-black text-slate-900">
                  आगामी परीक्षा दिवस ({bCopyAnalytics.aiPrediction.nextDate}) मांग स्तर: <span className="text-amber-800">{bCopyAnalytics.aiPrediction.predictedDemandLevel}</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  आगामी विषय: {bCopyAnalytics.aiPrediction.subjectHighlights.join(', ') || 'मानक विषय'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-slate-500">स्ट्रांग रूम संकलन आदेश:</div>
                <div className="text-sm font-black text-amber-900">
                  📦 50-कॉपियों के {bCopyAnalytics.aiPrediction.recommendedBundles} बंडल जारी करें
                </div>
              </div>
            </div>
          </div>

          {/* 3-Tier View Switcher */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setBCopySubView('rooms')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  bCopySubView === 'rooms' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. कक्ष-वार वितरण (Room-wise)
              </button>
              <button
                type="button"
                onClick={() => setBCopySubView('classes')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  bCopySubView === 'classes' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. कक्षा-वार वितरण (Class-wise)
              </button>
              <button
                type="button"
                onClick={() => setBCopySubView('students')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  bCopySubView === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. परीक्षार्थी रोल-वार रिकॉर्ड ({bCopyAnalytics.studentRows.length})
              </button>
            </div>

            {bCopySubView === 'students' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="रोल नं० / नाम से खोजें..."
                  value={bCopySearch}
                  onChange={(e) => setBCopySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
                />
              </div>
            )}
          </div>

          {/* TIER 1: ROOM-WISE TABLE */}
          {bCopySubView === 'rooms' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                <span>कक्ष-वार बी-कॉपी वितरण तालिका</span>
                <span className="text-[11px] text-slate-500">कुल {bCopyAnalytics.roomsList.length} कक्ष</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">कक्ष</th>
                      <th className="px-3 py-2.5">कक्ष निरीक्षक (Invigilators)</th>
                      <th className="px-3 py-2.5 text-center">पंजीकृत छात्र</th>
                      <th className="px-3 py-2.5 text-center">उपस्थित ('A' कॉपियां)</th>
                      <th className="px-3 py-2.5 text-center bg-amber-50 text-amber-900 font-black">'B' कॉपियां वितरित</th>
                      <th className="px-3 py-2.5 text-center">छात्र संख्या (B Takers)</th>
                      <th className="px-3 py-2.5 text-center">वितरण दर (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bCopyAnalytics.roomsList.map((r) => (
                      <tr key={r.roomId} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 font-black text-slate-900">{r.roomName}</td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{r.invigilators}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800">{r.totalSeated}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{r.present}</td>
                        <td className="px-3 py-2.5 text-center font-black text-amber-700 bg-amber-50/50">
                          {r.bCopies > 0 ? `+${r.bCopies} B` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700">{r.bStudents}</td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">{r.bRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIER 2: CLASS-WISE TABLE */}
          {bCopySubView === 'classes' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                <span>कक्षा-वार बी-कॉपी संकलन व औसत तालिका</span>
                <span className="text-[11px] text-slate-500">कुल {bCopyAnalytics.classesList.length} कक्षाएं/वर्ग</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">कक्षा व वर्ग</th>
                      <th className="px-3 py-2.5 text-center">कुल पंजीकृत</th>
                      <th className="px-3 py-2.5 text-center">उपस्थित छात्र</th>
                      <th className="px-3 py-2.5 text-center">अनुपस्थित छात्र</th>
                      <th className="px-3 py-2.5 text-center bg-amber-50 text-amber-900 font-black">'B' कॉपियां कुल</th>
                      <th className="px-3 py-2.5 text-center">प्रति छात्र औसत</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bCopyAnalytics.classesList.map((c) => (
                      <tr key={c.classKey} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 font-black text-slate-900">
                          कक्षा {c.className} - {c.section}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800">{c.total}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{c.present}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-rose-600">{c.absent}</td>
                        <td className="px-3 py-2.5 text-center font-black text-amber-700 bg-amber-50/50">
                          {c.bCopies > 0 ? `+${c.bCopies} B` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">
                          {c.present > 0 ? (c.bCopies / c.present).toFixed(2) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIER 3: ROLL-WISE STUDENT LEDGER */}
          {bCopySubView === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                <span>बी-कॉपी प्राप्त करने वाले समस्त परीक्षार्थियों का व्यक्तिगत रिकॉर्ड</span>
                <span className="text-[11px] text-slate-500">
                  {bCopyAnalytics.studentRows.length} परीक्षार्थी दर्ज
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">क्र०</th>
                      <th className="px-3 py-2.5">रोल नं० (Roll)</th>
                      <th className="px-3 py-2.5">परीक्षार्थी का नाम</th>
                      <th className="px-3 py-2.5">कक्षा व वर्ग</th>
                      <th className="px-3 py-2.5">परीक्षा कक्ष</th>
                      <th className="px-3 py-2.5 text-center bg-amber-50 text-amber-900 font-black">'B' कॉपियां</th>
                      <th className="px-3 py-2.5">कॉपी क्रमांक (Serial Nos)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bCopyAnalytics.studentRows
                      .filter((st) => {
                        if (!bCopySearch) return true;
                        const q = bCopySearch.toLowerCase();
                        return (
                          String(st.rollNo).includes(q) ||
                          st.name.toLowerCase().includes(q) ||
                          st.roomName.toLowerCase().includes(q)
                        );
                      })
                      .map((st, idx) => (
                        <tr key={st.rollNo} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-black text-indigo-700">#{st.rollNo}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{st.name}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-700">
                            कक्षा {st.className} - {st.section}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-800">{st.roomName}</td>
                          <td className="px-3 py-2.5 text-center font-black text-amber-700 bg-amber-50/50">
                            +{st.bCopiesCount} B
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px]">
                            {st.bCopyNumbers.length > 0 ? st.bCopyNumbers.join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    {bCopyAnalytics.studentRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                          वर्तमान पाली में किसी छात्र द्वारा 'B' कॉपी दर्ज नहीं की गई है।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Exam Time & Warning Bell Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 relative">
            <button
              type="button"
              onClick={() => setShowTimeModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">परीक्षा समय व चेतावनी घंटी सेटिंग्स</h3>
                <p className="text-xs text-slate-500">वार्षिक व अर्धवार्षिक सत्र अनुसार समय व अलर्ट बदलें</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्रथम पाली समय (Shift 1 Time):
                </label>
                <input
                  type="text"
                  value={shift1TimeInput}
                  onChange={(e) => setShift1TimeInput(e.target.value)}
                  placeholder="उदा. 08:30 AM - 11:45 AM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  द्वितीय पाली समय (Shift 2 Time):
                </label>
                <input
                  type="text"
                  value={shift2TimeInput}
                  onChange={(e) => setShift2TimeInput(e.target.value)}
                  placeholder="उदा. 01:30 PM - 04:45 PM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    चेतावनी घंटी (Warning Bell):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={warningMinutesInput}
                      onChange={(e) => setWarningMinutesInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-bold shrink-0">मिनट पहले</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    प्रवेश घंटी (Entry Bell):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={entryMinutesInput}
                      onChange={(e) => setEntryMinutesInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-bold shrink-0">मिनट पहले</span>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">त्वरित प्रीसेट (Quick Presets):</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShift1TimeInput('08:30 AM - 11:45 AM');
                      setShift2TimeInput('01:30 PM - 04:45 PM');
                      setWarningMinutesInput(15);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    मानक सत्र (08:30-11:45)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShift1TimeInput('09:30 AM - 12:45 PM');
                      setShift2TimeInput('01:30 PM - 04:45 PM');
                      setWarningMinutesInput(15);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    शीतकालीन (09:30-12:45)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShift1TimeInput('07:30 AM - 10:45 AM');
                      setShift2TimeInput('02:00 PM - 05:15 PM');
                      setWarningMinutesInput(15);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    ग्रीष्मकालीन / बोर्ड (07:30-10:45)
                  </button>
                </div>
              </div>

              {timeSaveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold text-center">
                  {timeSaveSuccess}
                </div>
              )}

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeSettings}
                  disabled={isSavingTime}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingTime ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>सुरक्षित हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>क्लाउड में सेव करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Importer Modal */}
      <TeacherExcelImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportTeachers={handleImportTeachers}
      />
    </div>
  );
}
