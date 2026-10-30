import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  Save
} from 'lucide-react';
import { EXAM_SCHEME_METADATA, EXAM_TIMETABLE } from '../data/examSchemeData';
import TeacherExcelImporterModal from './TeacherExcelImporterModal';
import { saveDutyRosterToDB, updateTeacherAPI } from '../services/api';
import { exportTeachersToExcel } from '../utils/excelExport';
import { useAuth } from '../context/AuthContext';

export default function TeacherDutyManager({
  teachers = [],
  setTeachers,
  seatingResult,
  activeShift = 'shift_1',
  dutyRoster = {},
  setDutyRoster,
  examDetails
}) {
  const [selectedDateId, setSelectedDateId] = useState('d1');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'staff', 'print'
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const { isPrincipal, isSuperAdmin } = useAuth();
  const canEditTeacher = isPrincipal || isSuperAdmin;
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  // Active rooms from seating result
  const activeRooms = useMemo(() => {
    if (!seatingResult || !seatingResult.rooms) return [];
    return seatingResult.rooms.filter((r) => (r.students && r.students.length > 0) || r.seatedCount > 0);
  }, [seatingResult]);

  // Current duty allocation for selected day & shift: { [roomId]: { invigilator1: teacherId, invigilator2: teacherId }, relievers: [teacherId...] }
  const currentAllocKey = `${selectedDay.id}_${activeShift}`;
  const currentAllocation = useMemo(() => {
    return dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
  }, [dutyRoster, currentAllocKey]);

  // Other shift key on the same day (e.g. shift_2 if activeShift is shift_1)
  const otherShift = activeShift === 'shift_1' ? 'shift_2' : 'shift_1';
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
  const handleAutoAllocate = (targetShift = activeShift) => {
    const targetKey = `${selectedDay.id}_${targetShift}`;
    const targetOtherShift = targetShift === 'shift_1' ? 'shift_2' : 'shift_1';
    const targetOtherKey = `${selectedDay.id}_${targetOtherShift}`;
    const targetOtherAlloc = dutyRoster[targetOtherKey] || { rooms: {}, relievers: [] };

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
    const usedIds = new Set();

    // Check if preferred relievers are in candidate pool and fresh
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

    // Allocate rooms from remaining candidates (Fresh first)
    const roomCandidates = candidatePool.filter((t) => !usedIds.has(String(t.id)));
    let tIdx = 0;
    const roomAssignments = {};

    activeRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      
      const inv1 = roomCandidates[tIdx % roomCandidates.length]?.id || null;
      if (inv1) usedIds.add(String(inv1));
      tIdx++;

      let inv2 = null;
      if (isLarge && roomCandidates.length > activeRooms.length) {
        inv2 = roomCandidates[tIdx % roomCandidates.length]?.id || null;
        if (inv2) usedIds.add(String(inv2));
        tIdx++;
      }

      roomAssignments[rm.roomId] = {
        invigilator1: inv1,
        invigilator2: inv2,
      };
    });

    setDutyRoster((prev) => ({
      ...prev,
      [targetKey]: {
        rooms: roomAssignments,
        relievers: chosenRelievers,
      },
    }));
  };

  // Smart allocation for BOTH Shifts (Shift 1 & Shift 2) in one click with zero overlaps
  const handleAllocateBothShifts = () => {
    const available = teachers.filter((t) => t.isPresent !== false && !t.isExamIncharge && !t.exemptDuty);
    if (available.length < activeRooms.length) {
      alert(`कुल उपस्थित शिक्षक (${available.length}) कमरों की संख्या (${activeRooms.length}) से कम हैं!`);
      return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);

    // Half for Shift 1, Half for Shift 2
    const mid = Math.ceil(shuffled.length / 2);
    const poolShift1 = shuffled.slice(0, mid);
    const poolShift2 = shuffled.slice(mid);

    // Shift 1
    const s1Used = new Set();
    const s1Relievers = [];
    // User requested preferred relievers for Shift 1
    ['t19', 't13', 't2'].forEach((pid) => {
      const m = poolShift1.find((t) => String(t.id) === String(pid));
      if (m) {
        s1Relievers.push(m.id);
        s1Used.add(String(m.id));
      }
    });
    for (const t of poolShift1) {
      if (s1Relievers.length >= 3) break;
      if (!s1Used.has(String(t.id))) {
        s1Relievers.push(t.id);
        s1Used.add(String(t.id));
      }
    }

    const s1RoomCand = poolShift1.filter((t) => !s1Used.has(String(t.id)));
    let s1Idx = 0;
    const s1Rooms = {};
    activeRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      const inv1 = s1RoomCand[s1Idx % s1RoomCand.length]?.id || null;
      s1Idx++;
      let inv2 = null;
      if (isLarge && s1RoomCand.length > activeRooms.length) {
        inv2 = s1RoomCand[s1Idx % s1RoomCand.length]?.id || null;
        s1Idx++;
      }
      s1Rooms[rm.roomId] = { invigilator1: inv1, invigilator2: inv2 };
    });

    // Shift 2 (Completely Fresh teachers from poolShift2!)
    const s2Used = new Set();
    const s2Relievers = [];
    for (const t of poolShift2) {
      if (s2Relievers.length >= 3) break;
      s2Relievers.push(t.id);
      s2Used.add(String(t.id));
    }

    const s2RoomCand = poolShift2.filter((t) => !s2Used.has(String(t.id)));
    let s2Idx = 0;
    const s2Rooms = {};
    activeRooms.forEach((rm) => {
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      // If poolShift2 runs out, gracefully fallback to poolShift1
      const candidateList = s2RoomCand.length >= activeRooms.length ? s2RoomCand : [...s2RoomCand, ...poolShift1];
      const inv1 = candidateList[s2Idx % candidateList.length]?.id || null;
      s2Idx++;
      let inv2 = null;
      if (isLarge) {
        inv2 = candidateList[s2Idx % candidateList.length]?.id || null;
        s2Idx++;
      }
      s2Rooms[rm.roomId] = { invigilator1: inv1, invigilator2: inv2 };
    });

    const k1 = `${selectedDay.id}_shift_1`;
    const k2 = `${selectedDay.id}_shift_2`;

    setDutyRoster((prev) => ({
      ...prev,
      [k1]: { rooms: s1Rooms, relievers: s1Relievers },
      [k2]: { rooms: s2Rooms, relievers: s2Relievers },
    }));

    alert(`✅ दोनों पालियों का निष्पक्ष आवंटन पूर्ण हुआ!\n• Shift 1 (सुबह): ${poolShift1.length} शिक्षक\n• Shift 2 (दोपहर): ${poolShift2.length} फ्रेश शिक्षक (बिना किसी दोहराव के)`);
  };

  // If allocation is empty, auto-allocate once on initial load
  useEffect(() => {
    const key = `${selectedDay.id}_${activeShift}`;
    if (!dutyRoster[key] && teachers.length > 0 && activeRooms.length > 0) {
      handleAutoAllocate();
    }
  }, [selectedDay.id, activeShift, teachers.length, activeRooms.length]);

  // Handle manual dropdown change for a room
  // When a teacher is selected, remove them from relievers or other room if previously assigned
  const handleRoomTeacherChange = (roomId, slot, teacherId) => {
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

    setDutyRoster((prev) => ({
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

    setDutyRoster((prev) => ({
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
    const curr = dutyRoster[currentAllocKey] || { rooms: {}, relievers: [] };
    const currRelievers = (curr.relievers || []).filter((tid) => String(tid) !== String(teacherId));

    setDutyRoster((prev) => ({
      ...prev,
      [currentAllocKey]: {
        ...curr,
        relievers: currRelievers,
      },
    }));
  };

  // Set User's Requested 3 Relievers: श्री अंकित अवस्थी (t19), श्री प्रभात कुमार पाण्डेय (t13), श्री सुनील कुमार बाजपेयी (t2)
  const handleSetPriorityRelievers = () => {
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

    setDutyRoster((prev) => ({
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
        activeShift,
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
        activeShift,
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
  }, [dutyRoster, examDetails?.examName, activeShift]);


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

  // Add single teacher
  const handleAddSingleTeacher = (e) => {
    e.preventDefault();
    if (!newTeacher.name.trim()) return;

    const teacherObj = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    setTeachers((prev) => [...prev, teacherObj]);
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

  // Save inline edit
  const handleSaveEdit = (teacherId) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              name: editForm.name.trim(),
              englishName: editForm.name.trim().toUpperCase(),
              fatherName: editForm.fatherName.trim(),
              mobile: editForm.mobile.trim(),
              designation: editForm.designation.trim(),
              subject: editForm.subject.trim(),
              assignedClass: editForm.assignedClass.trim(),
              assignedSection: editForm.assignedSection.trim().toUpperCase(),
              isClassTeacher: !!editForm.assignedClass.trim(),
            }
          : t
      )
    );
    setEditingTeacherId(null);
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
  };

  // Delete teacher
  const handleDeleteTeacher = (teacherId) => {
    if (window.confirm('क्या आप इस शिक्षक को सूची से हटाना चाहते हैं?')) {
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    }
  };

  // Handle Excel import
  const handleImportTeachers = (importedList, strategy) => {
    if (strategy === 'replace') {
      setTeachers(importedList);
    } else {
      setTeachers((prev) => {
        const existingNames = new Set(prev.map((t) => t.name.toLowerCase().trim()));
        const toAdd = importedList.filter((t) => !existingNames.has(t.name.toLowerCase().trim()));
        return [...prev, ...toAdd];
      });
    }
    setTimeout(() => {
      handleAutoAllocate();
    }, 100);
  };

  const handlePrint = () => {
    window.print();
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

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.englishName && t.englishName.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.designation && t.designation.toLowerCase().includes(q))
    );
  }, [teachers, searchQuery]);

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
            </div>

            <button
              type="button"
              onClick={handleAllocateBothShifts}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="दोनों पालियों (Shift 1 व 2) का निष्पक्ष बिना दोहराव वाला आवंटन"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>दोनों शिफ्टों का निष्पक्ष आवंटन</span>
            </button>

            <button
              type="button"
              onClick={() => handleAutoAllocate(activeShift)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="इस शिफ्ट के लिए फ्रेश शिक्षकों को प्राथमिकता देकर ऑटो आवंटन करें"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>ऑटो ड्यूटी आवंटन</span>
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

        {/* Date Selector Pills */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>परीक्षा तिथि चुनें (Select Exam Date):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              सक्रिय शिफ्ट: <strong className="text-indigo-700">{activeShift === 'shift_1' ? 'Shift 1 (सुबह)' : 'Shift 2 (दोपहर)'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {EXAM_TIMETABLE.map((d) => {
              const isSelected = selectedDateId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDateId(d.id)}
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
        <div className="space-y-6">
          {/* Official Print Header */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">
              OFFICIAL INVIGILATION DUTY ROSTER
            </span>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 mt-0.5">
              {EXAM_SCHEME_METADATA.schoolName}
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              {EXAM_SCHEME_METADATA.examTitle}
            </h2>
            <div className="text-xs sm:text-sm font-black text-indigo-950 mt-1 uppercase underline underline-offset-2">
              कक्ष निरीक्षक दैनिक ड्यूटी चार्ट (Daily Invigilation Duty Chart)
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mt-2 px-2 bg-slate-50 py-1 rounded border border-slate-300">
              <span>दिनांक: <strong>{selectedDay.date} ({selectedDay.day})</strong></span>
              <span>शिफ्ट: <strong>{activeShift === 'shift_1' ? EXAM_SCHEME_METADATA.shift1Time : EXAM_SCHEME_METADATA.shift2Time}</strong></span>
              <span>आवंटित कमरे: <strong>{activeRooms.length}</strong> (कुल परीक्षार्थी: {seatingResult?.totalSeated || 0})</span>
            </div>
          </div>


          {/* Exam Control Room & Incharge Banner */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-3.5 sm:p-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs print:border print:border-slate-400 print:rounded-none print:py-1.5 print:my-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 print:hidden shadow-xs">
                🎯
              </div>
              <div>
                <div className="text-[11px] font-black text-purple-950 uppercase tracking-wide">
                  कंट्रोल रूम एवं परीक्षा संचालन समिति (Exam Control Room & Committee)
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {inchargeTeachers.length > 0 ? (
                    inchargeTeachers.map((t) => (
                      <span
                        key={t.id}
                        className="px-2.5 py-0.5 bg-white border border-purple-300 rounded-lg text-xs font-black text-purple-950 shadow-2xs print:border-none print:p-0 print:text-black"
                      >
                        ⭐ {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">कोई परीक्षा प्रभारी नामित नहीं</span>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-400 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse print:text-[11px]">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 print:bg-slate-200/80 print:text-black print:border-b-2 print:border-slate-500">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center print:w-[6%] print:px-1 print:border-r print:border-slate-300">
                      क्र०
                    </th>
                    <th className="px-3 py-3 w-32 print:w-[16%] print:px-2 print:border-r print:border-slate-300">
                      कमरा संख्या (Room)
                    </th>
                    <th className="px-3 py-3 w-24 text-center print:w-[10%] print:px-1 print:border-r print:border-slate-300">
                      छात्र संख्या
                    </th>
                    <th className="px-4 py-3 print:w-[26%] print:px-2 print:border-r print:border-slate-300">
                      कक्ष निरीक्षक - 1 (Invigilator 1)
                    </th>
                    <th className="px-4 py-3 print:w-[26%] print:px-2 print:border-r print:border-slate-300">
                      कक्ष निरीक्षक - 2 (Invigilator 2)
                    </th>
                    <th className="px-3 py-3 w-32 text-center print:w-[16%] print:px-2">
                      हस्ताक्षर पावती (Sign)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300 font-medium">
                  {activeRooms.map((rm, idx) => {
                    const roomAlloc = currentAllocation.rooms?.[rm.roomId] || {};
                    const t1Id = roomAlloc.invigilator1;
                    const t2Id = roomAlloc.invigilator2;
                    const t1 = teacherMap[t1Id];
                    const t2 = teacherMap[t2Id];
                    const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;

                    return (
                      <tr key={rm.roomId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500 print:px-1 print:border-r print:border-slate-300 print:text-black">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-black text-slate-900 print:px-2 print:border-r print:border-slate-300">
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
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 print:px-1 print:border-r print:border-slate-300 print:text-black">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-black print:bg-transparent print:p-0">
                            {rm.seatedCount} छात्र
                          </span>
                        </td>

                        {/* Invigilator 1 Dropdown: ONLY FREE TEACHERS + CURRENTLY SELECTED */}
                        <td className="px-4 py-2.5 print:px-2 print:border-r print:border-slate-300">
                          <div className="no-print">
                            <select
                              value={t1Id || ''}
                              onChange={(e) => handleRoomTeacherChange(rm.roomId, 'invigilator1', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500 cursor-pointer shadow-2xs"
                            >
                              <option value="">— शिक्षक चुनें (हटाएं) —</option>
                              
                              {/* If currently assigned, always show at top */}
                              {t1 && (
                                <option value={t1.id}>
                                  ✓ {t1.name} ({t1.designation}) [वर्तमान चयनित]
                                </option>
                              )}

                              {/* Only show FREE teachers */}
                              <optgroup label={`उपलब्ध मुक्त शिक्षक (${freeTeachers.length})`}>
                                {freeTeachers.map((t) => {
                                  const workedInOther = otherShiftAssignedIds.has(String(t.id));
                                  return (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.designation}) {workedInOther ? `• [${otherShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} में ड्यूटी थी]` : '• ✨ [फ्रेश]'}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            </select>
                          </div>
                          <div className="hidden print:block">
                            {t1 ? (
                              <div>
                                <span className="font-bold text-slate-900 block">{t1.name}</span>
                                <span className="text-[9px] text-slate-600 block">{t1.designation} • {t1.subject}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">_________________</span>
                            )}
                          </div>
                        </td>

                        {/* Invigilator 2 Dropdown: ONLY FREE TEACHERS + CURRENTLY SELECTED */}
                        <td className="px-4 py-2.5 print:px-2 print:border-r print:border-slate-300">
                          <div className="no-print">
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
                                  ✓ {t2.name} ({t2.designation}) [वर्तमान चयनित]
                                </option>
                              )}

                              {/* Only show FREE teachers */}
                              <optgroup label={`उपलब्ध मुक्त शिक्षक (${freeTeachers.length})`}>
                                {freeTeachers.map((t) => {
                                  const workedInOther = otherShiftAssignedIds.has(String(t.id));
                                  return (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.designation}) {workedInOther ? `• [${otherShift === 'shift_1' ? 'Shift 1' : 'Shift 2'} में ड्यूटी थी]` : '• ✨ [फ्रेश]'}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            </select>
                          </div>
                          <div className="hidden print:block">
                            {t2 ? (
                              <div>
                                <span className="font-bold text-slate-900 block">{t2.name}</span>
                                <span className="text-[9px] text-slate-600 block">{t2.designation} • {t2.subject}</span>
                              </div>
                            ) : isLarge ? (
                              <span className="text-slate-400 font-normal italic">_________________</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Signature Column */}
                        <td className="px-3 py-2.5 text-center print:px-2">
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

            {/* Reliever / Flying Squad Section with Dynamic Add/Remove and Preset Buttons */}
            <div className="p-4 bg-amber-50/70 border-t border-amber-200/90 print:bg-slate-50 print:border-slate-400 text-xs">
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
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                    title="श्री अंकित अवस्थी, श्री प्रभात पाण्डेय व श्री सुनील बाजपेयी को रिलीवर बनाएं"
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
                  (currentAllocation.relievers || []).map((tid) => {
                    const t = teacherMap[tid];
                    if (!t) return null;
                    return (
                      <span
                        key={tid}
                        className="px-2.5 py-1.5 bg-white border-2 border-amber-300 rounded-xl text-slate-800 text-xs font-bold shadow-xs flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {t.name} <span className="text-[10px] text-slate-500 font-normal">({t.designation})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReliever(tid)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition no-print cursor-pointer"
                          title="रिलीवर से हटाएं (मुक्त करें)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })
                )}

                {/* Add Free Teacher to Relievers Dropdown */}
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
                        {t.name} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                        <span className="text-[10px] text-slate-500 font-normal">({t.designation})</span>
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
          <div className="hidden print:flex items-end justify-between pt-12 pb-2 px-6 text-xs font-bold text-slate-800">
            <div className="text-center space-y-1">
              <div className="w-36 border-t border-slate-800"></div>
              <span>ह० परीक्षा प्रभारी</span>
              {inchargeTeachers.length > 0 && (
                <div className="text-[10px] text-slate-700 font-semibold">
                  ({inchargeTeachers.map((t) => t.name).join(' / ')})
                </div>
              )}
            </div>
            <div className="text-center space-y-1">
              <div className="w-36 border-t border-slate-800"></div>
              <span>ह० वितरण लिपिक / स्ट्रांग रूम</span>
            </div>
            <div className="text-center space-y-1">
              <div className="w-36 border-t border-slate-800"></div>
              <span>ह० प्रधानाचार्य (सील सहित)</span>
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

      {/* Excel Importer Modal */}
      <TeacherExcelImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportTeachers={handleImportTeachers}
      />
    </div>
  );
}
