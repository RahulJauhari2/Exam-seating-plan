import { useAuth } from '../context/AuthContext';
import { saveMarksToDB, saveEvaluationAllotmentAPI } from '../services/api';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Lock,
  Unlock,
  ShieldCheck,
  Award, 
  FileText, 
  Edit3, 
  Printer, 
  Download, 
  Upload, 
  Sparkles, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BookOpen, 
  Settings, 
  Trophy, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Plus,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EXAM_TIMETABLE, UP_BOARD_SUBJECT_CODES } from '../data/examSchemeData';

// Grade calculation helper
export function calculateGrade(percentage) {
  if (percentage >= 91) return { grade: 'A1', points: 10, remark: 'उत्कृष्ट (Outstanding)' };
  if (percentage >= 81) return { grade: 'A2', points: 9, remark: 'अति उत्तम (Excellent)' };
  if (percentage >= 71) return { grade: 'B1', points: 8, remark: 'बहुत अच्छा (Very Good)' };
  if (percentage >= 61) return { grade: 'B2', points: 7, remark: 'अच्छा (Good)' };
  if (percentage >= 51) return { grade: 'C1', points: 6, remark: 'संतोषजनक (Above Average)' };
  if (percentage >= 41) return { grade: 'C2', points: 5, remark: 'औसत (Average)' };
  if (percentage >= 33) return { grade: 'D', points: 4, remark: 'उत्तीर्ण (Passing)' };
  return { grade: 'E', points: 0, remark: 'सुधार अपेक्षित (Needs Improvement)' };
}

// Division calculation
export function calculateDivision(percentage, isPassed) {
  if (!isPassed) return 'अनुत्तीर्ण (FAIL)';
  if (percentage >= 60) return 'प्रथम श्रेणी (I Division)';
  if (percentage >= 45) return 'द्वितीय श्रेणी (II Division)';
  if (percentage >= 33) return 'तृतीय श्रेणी (III Division)';
  return 'अनुत्तीर्ण (FAIL)';
}

export default function ResultMarksheetManager({
  classes = [],
  activeShift = 'shift_1',
  examDetails = {},
  seatingResult,
  teachers = [],
  evaluationAllotment: parentEvaluationAllotment,
  setEvaluationAllotment: parentSetEvaluationAllotment,
  marksLocks: parentMarksLocks,
  setMarksLocks: parentSetMarksLocks,
  initialTarget = null,
}) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'principal' || currentUser?.role === 'coordinator' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isTeacher = currentUser?.role === 'teacher';
  const canToggleLock = isAdmin;

  // Storage key for locks
  const STORAGE_KEY_LOCKS = 'dynamic_exam_marks_locks_v1';
  const [marksLocks, setMarksLocks] = useState(() => {
    if (parentMarksLocks && Object.keys(parentMarksLocks).length > 0) {
      return parentMarksLocks;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCKS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Storage key for Evaluation Allotment (Teacher -> Class Subject)
  const STORAGE_KEY_ALLOTMENT = 'dynamic_exam_evaluation_allotment_v1';
  const [evaluationAllotment, setEvaluationAllotment] = useState(() => {
    if (parentEvaluationAllotment && Object.keys(parentEvaluationAllotment).length > 0) {
      return parentEvaluationAllotment;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ALLOTMENT);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Synchronize from parent / MongoDB if updated
  useEffect(() => {
    if (parentEvaluationAllotment && Object.keys(parentEvaluationAllotment).length > 0) {
      setEvaluationAllotment(parentEvaluationAllotment);
    }
  }, [parentEvaluationAllotment]);

  useEffect(() => {
    if (parentMarksLocks && Object.keys(parentMarksLocks).length > 0) {
      setMarksLocks(parentMarksLocks);
    }
  }, [parentMarksLocks]);

  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudSaveMessage, setCloudSaveMessage] = useState('');
  const [allotmentSearch, setAllotmentSearch] = useState('');
  const [allotmentClassFilter, setAllotmentClassFilter] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(marksLocks));
    } catch (e) {
      console.error('Failed to save marks locks', e);
    }
    if (parentSetMarksLocks) {
      parentSetMarksLocks(marksLocks);
    }
  }, [marksLocks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ALLOTMENT, JSON.stringify(evaluationAllotment));
    } catch (e) {
      console.error('Failed to save evaluation allotment', e);
    }
    if (parentSetEvaluationAllotment) {
      parentSetEvaluationAllotment(evaluationAllotment);
    }
  }, [evaluationAllotment]);
  // Navigation tabs inside result manager
  const [activeSubTab, setActiveSubTab] = useState('marks-entry'); // 'marks-entry', 'result-sheet', 'marksheet', 'config'

  // Selected class and section for viewing/editing
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudentRoll, setSelectedStudentRoll] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkPrintMode, setBulkPrintMode] = useState(false);

  // Storage key
  const STORAGE_KEY_MARKS = 'dynamic_exam_marks_data_v1';
  const STORAGE_KEY_CONFIG = 'dynamic_exam_subject_config_v1';

  // Marks data structure: { [studentKey]: { [subjectName]: { theory: number, practical: number } } }
  const [marksData, setMarksData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Dynamic Subject Configuration: { [subjectName]: { maxTheory: number, maxPractical: number, minPassPercent: number } }
  const [subjectConfig, setSubjectConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to LocalStorage whenever marksData or subjectConfig changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MARKS, JSON.stringify(marksData));
    } catch (e) {
      console.error('Failed to save marks data', e);
    }
  }, [marksData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(subjectConfig));
    } catch (e) {
      console.error('Failed to save subject config', e);
    }
  }, [subjectConfig]);

  // Helper to dynamically extract subjects for any grade & section
  const getSubjectsForGradeSection = (grade, section, shift = activeShift) => {
    const subjectsSet = new Map();

    EXAM_TIMETABLE.forEach((day) => {
      const shiftSubs = day[shift] || {};
      const subsForGrade = shiftSubs[grade] || [];
      subsForGrade.forEach((sub) => {
        const sName = (sub.name || '').trim().toUpperCase();
        if (sName && !subjectsSet.has(sName)) {
          subjectsSet.set(sName, {
            name: sName,
            code: sub.code || '',
            hindiName: sub.code && UP_BOARD_SUBJECT_CODES[sub.code] ? UP_BOARD_SUBJECT_CODES[sub.code].name : sName
          });
        }
      });
    });

    if (['6', '7', '8'].includes(grade)) {
      if (section === 'A' || section === 'C') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('ART');
      } else if (section === 'B') {
        subjectsSet.delete('COMPUTER');
      }
    } else if (['9', '10'].includes(grade)) {
      if (section === 'A' || section === 'E') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('ART');
      } else if (section === 'B') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('COMPUTER');
      } else if (section === 'C') {
        subjectsSet.delete('ART');
        subjectsSet.delete('COMPUTER');
      }
    } else if (['11', '12'].includes(grade)) {
      if (section === 'A' || section === 'E') {
        subjectsSet.delete('BIOLOGY');
        subjectsSet.delete('ACCOUNTANCY');
        subjectsSet.delete('BUSS. STUDY');
      } else if (section === 'B') {
        subjectsSet.delete('MATH');
        subjectsSet.delete('ACCOUNTANCY');
        subjectsSet.delete('BUSS. STUDY');
      } else if (section === 'C') {
        subjectsSet.delete('MATH');
        subjectsSet.delete('BIOLOGY');
        subjectsSet.delete('PHYSICS');
        subjectsSet.delete('CHEMISTRY');
      }
    }

    Object.keys(subjectConfig).forEach((customSub) => {
      const up = customSub.toUpperCase();
      if (!subjectsSet.has(up)) {
        subjectsSet.set(up, { name: up, code: '', hindiName: up });
      }
    });

    return Array.from(subjectsSet.values());
  };

  // Comprehensive list of all evaluation bundles across all classes
  const allSchoolBundles = useMemo(() => {
    const list = [];
    classes.forEach((c) => {
      const g = String(c.name).trim();
      const s = String(c.section).toUpperCase().trim();
      const subs = getSubjectsForGradeSection(g, s, activeShift);
      const studentCount = Number(c.totalStudents) || (c.studentList ? c.studentList.length : 0) || 0;

      subs.forEach((sub) => {
        const bKey = `${g}_${s}_${sub.name}`;
        const allot = evaluationAllotment[bKey] || null;
        const lock = marksLocks[bKey] || null;

        let enteredCount = 0;
        if (c.studentList && c.studentList.length > 0) {
          c.studentList.forEach((st) => {
            const roll = st.rollNo;
            const m = marksData[`${g}_${s}_${roll}`]?.[sub.name];
            if (m && (m.theory !== '' || m.practical !== '')) enteredCount++;
          });
        } else {
          const start = Number(c.startRoll) || 1;
          for (let i = 0; i < studentCount; i++) {
            const roll = start + i;
            const m = marksData[`${g}_${s}_${roll}`]?.[sub.name];
            if (m && (m.theory !== '' || m.practical !== '')) enteredCount++;
          }
        }

        list.push({
          key: bKey,
          grade: g,
          section: s,
          subject: sub.name,
          hindiName: sub.hindiName || sub.name,
          totalStudents: studentCount,
          enteredCount,
          progressPercent: studentCount > 0 ? Math.round((enteredCount / studentCount) * 100) : 0,
          allotment: allot,
          assignedTeacherName: allot?.teacherName || '',
          assignedTeacherPhone: allot?.teacherPhone || '',
          assignedTeacherId: allot?.teacherId || '',
          isLocked: Boolean(lock?.isLocked),
          lockedBy: lock?.lockedBy || '',
          lockedAt: lock?.lockedAt || '',
          roleLocked: lock?.role || (lock?.isLocked ? 'teacher' : ''),
        });
      });
    });
    return list;
  }, [classes, activeShift, subjectConfig, evaluationAllotment, marksLocks, marksData]);

  // Robust Phone & Name normalizers for teacher matching
  const normalizePhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  const cleanName = (n) => String(n || '').replace(/^(श्री|श्रीमती|डॉ०|डॉ\.|डा०|डा\.|shri|mr|mrs|dr)\s+/i, '').trim().toLowerCase();

  // Evaluator's own assigned bundles when logged in as teacher
  const myAssignedBundles = useMemo(() => {
    if (!currentUser) return [];
    const uPhone = normalizePhone(currentUser.phone || currentUser.mobile || '');
    const uName = cleanName(currentUser.name || '');
    const uId = String(currentUser.assignedTeacherId || currentUser.id || currentUser._id || '');

    return allSchoolBundles.filter((b) => {
      if (!b.allotment) return false;
      const tPhone = normalizePhone(b.assignedTeacherPhone || '');
      const tName = cleanName(b.assignedTeacherName || '');
      const tId = String(b.assignedTeacherId || '');

      return (
        (uPhone && tPhone && uPhone === tPhone) ||
        (uId && tId && uId === tId) ||
        (uName && tName && (uName.includes(tName) || tName.includes(uName)))
      );
    });
  }, [allSchoolBundles, currentUser]);

  // If navigated from TeacherRoomPortal with a specific target subject
  useEffect(() => {
    if (initialTarget && initialTarget.grade) {
      setSelectedGrade(String(initialTarget.grade).trim());
      if (initialTarget.section) setSelectedSection(String(initialTarget.section).toUpperCase().trim());
      if (initialTarget.subject) setSelectedSubject(String(initialTarget.subject).trim());
      setActiveSubTab('marks-entry');
    }
  }, [initialTarget]);

  // Available distinct grades from classes in current state
  const availableGrades = useMemo(() => {
    const set = new Set();
    classes.forEach((c) => {
      if (c.name) set.add(String(c.name).trim());
    });
    return Array.from(set).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [classes]);

  // Grades strictly displayed to the active user (Teacher only sees assigned classes)
  const displayedGrades = useMemo(() => {
    if (isAdmin) return availableGrades;
    const set = new Set();
    myAssignedBundles.forEach((b) => set.add(b.grade));
    return Array.from(set).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [isAdmin, availableGrades, myAssignedBundles]);

  // Set default grade on mount or change
  useEffect(() => {
    if (displayedGrades.length > 0 && (!selectedGrade || !displayedGrades.includes(selectedGrade))) {
      setSelectedGrade(displayedGrades[0]);
    } else if (displayedGrades.length === 0) {
      setSelectedGrade('');
    }
  }, [displayedGrades, selectedGrade]);

  // Available sections for the selected grade (All for Admin)
  const availableSections = useMemo(() => {
    const list = classes
      .filter((c) => String(c.name).trim() === selectedGrade)
      .map((c) => String(c.section).toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [classes, selectedGrade]);

  // Sections strictly displayed to active user (Teacher only sees assigned sections)
  const displayedSections = useMemo(() => {
    if (isAdmin) return availableSections;
    const set = new Set();
    myAssignedBundles
      .filter((b) => b.grade === selectedGrade)
      .forEach((b) => set.add(b.section));
    return Array.from(set).sort();
  }, [isAdmin, availableSections, myAssignedBundles, selectedGrade]);

  useEffect(() => {
    if (displayedSections.length > 0 && (!selectedSection || !displayedSections.includes(selectedSection))) {
      setSelectedSection(displayedSections[0]);
    } else if (displayedSections.length === 0) {
      setSelectedSection('');
    }
  }, [displayedSections, selectedSection]);

  // Get active class entry object
  const currentClassObj = useMemo(() => {
    return classes.find(
      (c) => String(c.name).trim() === selectedGrade && String(c.section).toUpperCase().trim() === selectedSection
    );
  }, [classes, selectedGrade, selectedSection]);

  // Dynamically extract subjects for the selected grade & section (All for Admin)
  const gradeSubjects = useMemo(() => {
    return getSubjectsForGradeSection(selectedGrade, selectedSection, activeShift);
  }, [selectedGrade, selectedSection, activeShift, subjectConfig]);

  // Subjects strictly displayed to active user (Teacher only sees assigned subjects)
  const displayedSubjects = useMemo(() => {
    if (isAdmin) return gradeSubjects;
    return myAssignedBundles
      .filter((b) => b.grade === selectedGrade && b.section === selectedSection)
      .map((b) => ({
        name: b.subject,
        code: '',
        hindiName: b.hindiName || b.subject,
      }));
  }, [isAdmin, gradeSubjects, myAssignedBundles, selectedGrade, selectedSection]);

  // Set default subject on grade/section change
  useEffect(() => {
    if (displayedSubjects.length > 0 && (!selectedSubject || !displayedSubjects.some((s) => s.name === selectedSubject))) {
      setSelectedSubject(displayedSubjects[0].name);
    } else if (displayedSubjects.length === 0) {
      setSelectedSubject('');
    }
  }, [displayedSubjects, selectedSubject]);

  // Enforce role-based tab restriction: regular teachers only access 'marks-entry'
  useEffect(() => {
    if (!isAdmin && activeSubTab !== 'marks-entry') {
      setActiveSubTab('marks-entry');
    }
  }, [isAdmin, activeSubTab]);

  // Get max marks configuration for a specific subject
  const getSubjectMaxMarks = (subName) => {
    const sUpper = (subName || '').toUpperCase().trim();
    if (subjectConfig[sUpper]) {
      return subjectConfig[sUpper];
    }
    // UP Board standard defaults:
    // High School (9th-10th): Theory 70, Practical/Project 30
    // Intermediate Science: Theory 70, Practical 30
    // Junior High School (6th-8th): Theory 50, Internal 50 (or Theory 70, Practical 30)
    // Non-practical subjects (e.g. Hindi, English, Math in 11th-12th): Theory 100, Practical 0
    const nonPractical1112 = ['HINDI', 'ENGLISH', 'MATH', 'ACCOUNTANCY', 'BUSS. STUDY'];
    if (['11', '12'].includes(selectedGrade) && nonPractical1112.some((np) => sUpper.includes(np))) {
      return { maxTheory: 100, maxPractical: 0, minPassPercent: 33 };
    }
    return { maxTheory: 70, maxPractical: 30, minPassPercent: 33 };
  };

  // Build full students list for the selected class/section
  const studentsList = useMemo(() => {
    if (!currentClassObj) return [];
    if (currentClassObj.studentList && Array.isArray(currentClassObj.studentList) && currentClassObj.studentList.length > 0) {
      return currentClassObj.studentList.map((st, idx) => {
        const roll = st.rollNo || (currentClassObj.startRoll + idx);
        const sr = st.srNo || st.formNumber || st.boardRollNo || `${selectedGrade}${String(roll).padStart(4, '0')}`;
        return {
          id: st.id || `st_${selectedGrade}_${selectedSection}_${roll}`,
          srNo: sr,
          rollNo: roll,
          name: st.name || `Student ${roll}`,
          fatherName: st.fatherName || '—',
          motherName: st.motherName || '—',
          nameHindi: st.nameHindi || '',
          medium: st.medium || currentClassObj.medium || (selectedSection === 'E' || (['6', '7', '8'].includes(selectedGrade) && selectedSection === 'C') ? 'English' : 'Hindi'),
          gender: st.gender || 'M',
          dob: st.dob || '—',
          className: selectedGrade,
          section: selectedSection,
        };
      });
    }

    // Default generated students if no Excel uploaded
    const count = Number(currentClassObj.totalStudents) || 0;
    const start = Number(currentClassObj.startRoll) || 1;
    const list = [];
    const isEng = currentClassObj.medium === 'English' || selectedSection === 'E' || (['6', '7', '8'].includes(selectedGrade) && selectedSection === 'C');

    for (let i = 0; i < count; i++) {
      const roll = start + i;
      const sr = `${selectedGrade}${String(roll).padStart(4, '0')}`;
      list.push({
        id: `st_${selectedGrade}_${selectedSection}_${roll}`,
        srNo: sr,
        rollNo: roll,
        name: `छात्र ${roll}`,
        fatherName: `अभिभावक ${roll}`,
        motherName: '—',
        nameHindi: `छात्र ${roll}`,
        medium: isEng ? 'English' : 'Hindi',
        gender: i % 3 === 0 ? 'F' : 'M',
        dob: '01/01/2012',
        className: selectedGrade,
        section: selectedSection,
      });
    }
    return list;
  }, [currentClassObj, selectedGrade, selectedSection]);

  // Set default student roll for Marksheet tab
  useEffect(() => {
    if (studentsList.length > 0 && (!selectedStudentRoll || !studentsList.some((s) => s.rollNo === Number(selectedStudentRoll)))) {
      setSelectedStudentRoll(studentsList[0].rollNo);
    }
  }, [studentsList, selectedStudentRoll]);

  // Current subject lock status & metadata
  const currentLockKey = `${selectedGrade}_${selectedSection}_${selectedSubject}`;
  const currentLockInfo = marksLocks[currentLockKey] || null;
  const isCurrentSubjectLocked = Boolean(currentLockInfo?.isLocked);
  const isLockedByTeacher = isCurrentSubjectLocked && currentLockInfo?.role === 'teacher';
  const isLockedByAdmin = isCurrentSubjectLocked && currentLockInfo?.role !== 'teacher';

  // Current allotment info for the selected bundle
  const currentBundleAllotment = evaluationAllotment[currentLockKey] || null;

  // Toggle lock handler (Admin / Master)
  const handleToggleLock = async () => {
    if (!canToggleLock) return;
    const nowLocked = !isCurrentSubjectLocked;
    const updated = {
      ...marksLocks,
      [currentLockKey]: {
        isLocked: nowLocked,
        lockedBy: currentUser?.name || 'Admin',
        role: 'admin',
        lockedAt: new Date().toISOString(),
      },
    };
    setMarksLocks(updated);

    setIsCloudSaving(true);
    try {
      await saveMarksToDB(examDetails?.examName || 'HALF YEARLY EXAMINATION 2026-27', activeShift, marksData);
      await saveEvaluationAllotmentAPI(examDetails?.examName || 'Half_Yearly_2026_27', activeShift, evaluationAllotment, updated);
      setCloudSaveMessage('डेटा लॉक एवं सुरक्षित किया गया!');
      setTimeout(() => setCloudSaveMessage(''), 4000);
    } catch (err) {
      console.error('Error saving locked marks to MongoDB:', err);
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Teacher Submit & Lock
  const handleTeacherSubmitAndLock = async () => {
    if (!window.confirm(`क्या आप कक्षा ${selectedGrade}-${selectedSection} के विषय [${selectedSubject}] के सभी प्राप्तांक सबमिट और लॉक करना चाहते हैं?\n\nलॉक होने के बाद आप इसमें कोई बदलाव नहीं कर सकेंगे (केवल प्रधानाचार्य ही संसोधन हेतु अनलॉक कर सकेंगे)।`)) {
      return;
    }
    const updated = {
      ...marksLocks,
      [currentLockKey]: {
        isLocked: true,
        lockedBy: currentUser?.name || 'शिक्षक',
        role: 'teacher',
        lockedAt: new Date().toISOString(),
      },
    };
    setMarksLocks(updated);
    setIsCloudSaving(true);
    try {
      await saveMarksToDB(examDetails?.examName || 'HALF YEARLY EXAMINATION 2026-27', activeShift, marksData);
      await saveEvaluationAllotmentAPI(examDetails?.examName || 'Half_Yearly_2026_27', activeShift, evaluationAllotment, updated);
      setCloudSaveMessage('अंक सफलतापूर्वक सबमिट व लॉक किए गए!');
      setTimeout(() => setCloudSaveMessage(''), 4000);
      alert('अंक सफलतापूर्वक सबमिट और लॉक कर दिए गए हैं!');
    } catch (err) {
      console.error('Error saving locked marks to MongoDB:', err);
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Admin Unlock (to let teacher edit again)
  const handleAdminUnlock = async () => {
    if (!window.confirm(`क्या आप कक्षा ${selectedGrade}-${selectedSection} के विषय [${selectedSubject}] को संसोधन हेतु अनलॉक करना चाहते हैं?`)) {
      return;
    }
    const updated = {
      ...marksLocks,
      [currentLockKey]: {
        isLocked: false,
        unlockedBy: currentUser?.name || 'Admin',
        unlockedAt: new Date().toISOString(),
      },
    };
    setMarksLocks(updated);
    setIsCloudSaving(true);
    try {
      await saveMarksToDB(examDetails?.examName || 'HALF YEARLY EXAMINATION 2026-27', activeShift, marksData);
      await saveEvaluationAllotmentAPI(examDetails?.examName || 'Half_Yearly_2026_27', activeShift, evaluationAllotment, updated);
      setCloudSaveMessage('विषय अनलॉक किया गया!');
      setTimeout(() => setCloudSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Teacher Assignment Handler (by Admin)
  const handleAssignTeacher = async (bundleKey, teacherId) => {
    if (!isAdmin) return;
    const tObj = teachers.find((t) => String(t._id || t.id || t.teacherCode) === String(teacherId));
    const updated = { ...evaluationAllotment };
    if (tObj) {
      updated[bundleKey] = {
        teacherId: tObj._id ? tObj._id.toString() : tObj.id,
        teacherName: tObj.name,
        teacherPhone: tObj.mobile || tObj.phone || '',
        assignedAt: new Date().toISOString(),
      };
    } else {
      delete updated[bundleKey];
    }
    setEvaluationAllotment(updated);

    // Save to MongoDB Atlas immediately
    try {
      await saveEvaluationAllotmentAPI(examDetails?.examName || 'Half_Yearly_2026_27', activeShift, updated, marksLocks);
    } catch (err) {
      console.error('Error saving allotment to MongoDB:', err);
    }
  };

  // Smart 1-click Auto Allot
  const handleAutoAllotTeachers = async () => {
    if (!teachers || teachers.length === 0) {
      alert('कोई शिक्षक सूची उपलब्ध नहीं है।');
      return;
    }
    if (!window.confirm('क्या आप उपलब्ध शिक्षकों के आधार पर सभी विषयों का 1-क्लिक ऑटो-आवंटन करना चाहते हैं?')) {
      return;
    }

    const newAllotment = { ...evaluationAllotment };
    let assignedCount = 0;

    allSchoolBundles.forEach((b, idx) => {
      if (!newAllotment[b.key]) {
        const subUpper = b.subject.toUpperCase();
        const matchedTeacher = teachers.find((t) => {
          const tSub = (t.subject || '').toUpperCase();
          return tSub && (subUpper.includes(tSub) || tSub.includes(subUpper));
        }) || teachers[idx % teachers.length];

        if (matchedTeacher) {
          newAllotment[b.key] = {
            teacherId: matchedTeacher._id ? matchedTeacher._id.toString() : matchedTeacher.id,
            teacherName: matchedTeacher.name,
            teacherPhone: matchedTeacher.mobile || matchedTeacher.phone || '',
            assignedAt: new Date().toISOString(),
          };
          assignedCount++;
        }
      }
    });

    setEvaluationAllotment(newAllotment);

    // Save to MongoDB Atlas immediately
    try {
      await saveEvaluationAllotmentAPI(examDetails?.examName || 'Half_Yearly_2026_27', activeShift, newAllotment, marksLocks);
    } catch (err) {
      console.error('Error saving auto allotment to MongoDB:', err);
    }

    alert(`सफलतापूर्वक ${assignedCount} विषय बंडलों का शिक्षकों को आवंटन किया गया और डेटाबेस में सुरक्षित हो गया!`);
  };

  // Export Allotment Report to Excel
  const handleExportAllotmentReport = () => {
    const data = allSchoolBundles.map((b, idx) => ({
      'क्र० सं०': idx + 1,
      'कक्षा': b.grade,
      'सेक्शन': b.section,
      'विषय (Subject)': b.subject,
      'विषय (हिन्दी)': b.hindiName || b.subject,
      'कुल कॉपियां (Total Copies)': b.totalStudents,
      'जांची गई (Checked)': b.enteredCount,
      'प्रगति (%)': `${b.progressPercent}%`,
      'आवंटित परीक्षक (Assigned Teacher)': b.assignedTeacherName || 'आवंटित नहीं',
      'शिक्षक का फोन': b.assignedTeacherPhone || '—',
      'स्थिति (Status)': b.isLocked ? `लॉक (${b.roleLocked === 'admin' ? 'प्रधानाचार्य' : 'शिक्षक'})` : (b.enteredCount > 0 ? 'प्रगति पर' : 'लंबित'),
      'लॉक कर्ता': b.lockedBy || '—',
      'लॉक समय': b.lockedAt ? new Date(b.lockedAt).toLocaleString('hi-IN') : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluation_Allotment');
    XLSX.writeFile(wb, `Evaluation_Duty_Allotment_Report_${Date.now()}.xlsx`);
  };

  // Manual save to cloud handler
  const handleSaveToCloud = async () => {
    setIsCloudSaving(true);
    try {
      await saveMarksToDB(examDetails?.examName || 'HALF YEARLY EXAMINATION 2026-27', activeShift, marksData);
      setCloudSaveMessage('क्लाउड पर सुरक्षित!');
      setTimeout(() => setCloudSaveMessage(''), 3000);
    } catch (err) {
      console.error('Cloud save error:', err);
      setCloudSaveMessage('सेव करने में त्रुटि!');
      setTimeout(() => setCloudSaveMessage(''), 3000);
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Update marks for a student in state
  const handleUpdateMarks = (studentKey, subjectName, field, value) => {
    if (isCurrentSubjectLocked && !isAdmin) return;

    // Strict RBAC: regular teachers can only enter marks for their assigned bundles
    if (!isAdmin) {
      const sUpper = (subjectName || '').toUpperCase().trim();
      const isAllowed = myAssignedBundles.some(
        (b) => b.grade === selectedGrade && b.section === selectedSection && b.subject.toUpperCase() === sUpper
      );
      if (!isAllowed) {
        alert('अनधिकृत: केवल अधिकृत शिक्षक ही इस विषय के अंक भर सकते हैं।');
        return;
      }
    }

    const sName = subjectName.toUpperCase().trim();
    const cfg = getSubjectMaxMarks(sName);
    const maxVal = field === 'theory' ? cfg.maxTheory : cfg.maxPractical;
    let numVal = value === '' ? '' : Math.max(0, Math.min(maxVal, Number(value) || 0));

    setMarksData((prev) => {
      const stMarks = prev[studentKey] || {};
      const currentSubMarks = stMarks[sName] || { theory: '', practical: '' };
      return {
        ...prev,
        [studentKey]: {
          ...stMarks,
          [sName]: {
            ...currentSubMarks,
            [field]: numVal,
          },
        },
      };
    });
  };

  // Generate realistic demo marks in 1-click for testing
  const handleGenerateDemoMarks = () => {
    if (isCurrentSubjectLocked && !isAdmin) {
      alert('यह विषय लॉक है, अंक नहीं बदले जा सकते।');
      return;
    }
    if (!window.confirm(`क्या आप कक्षा ${selectedGrade}-${selectedSection} के सभी छात्रों के लिए डेमो अंक भरना चाहते हैं?`)) {
      return;
    }

    setMarksData((prev) => {
      const updated = { ...prev };
      studentsList.forEach((st) => {
        const key = `${selectedGrade}_${selectedSection}_${st.rollNo}`;
        const stMarks = updated[key] || {};

        gradeSubjects.forEach((sub) => {
          const cfg = getSubjectMaxMarks(sub.name);
          // Realistic distribution: mostly passing scores with a few toppers and average
          const theoryRatio = 0.5 + Math.random() * 0.45; // 50% to 95%
          const pracRatio = 0.7 + Math.random() * 0.28;   // 70% to 98%

          const tMarks = Math.round(cfg.maxTheory * theoryRatio);
          const pMarks = cfg.maxPractical > 0 ? Math.round(cfg.maxPractical * pracRatio) : 0;

          stMarks[sub.name] = {
            theory: tMarks,
            practical: pMarks,
          };
        });

        updated[key] = stMarks;
      });
      return updated;
    });
  };

  // Clear marks for current class
  const handleClearCurrentClassMarks = () => {
    if (isCurrentSubjectLocked && !isAdmin) {
      alert('यह विषय लॉक है, अंक मिटाए नहीं जा सकते।');
      return;
    }
    if (!window.confirm(`क्या आप कक्षा ${selectedGrade}-${selectedSection} के सभी अंक मिटाना चाहते हैं?`)) {
      return;
    }
    setMarksData((prev) => {
      const updated = { ...prev };
      studentsList.forEach((st) => {
        const key = `${selectedGrade}_${selectedSection}_${st.rollNo}`;
        delete updated[key];
      });
      return updated;
    });
  };

  // Calculate full results for all students in current class
  const classResults = useMemo(() => {
    let grandMaxMarksAllSubs = 0;
    gradeSubjects.forEach((sub) => {
      const cfg = getSubjectMaxMarks(sub.name);
      grandMaxMarksAllSubs += (cfg.maxTheory + cfg.maxPractical);
    });

    const results = studentsList.map((st) => {
      const key = `${selectedGrade}_${selectedSection}_${st.rollNo}`;
      const stMarks = marksData[key] || {};

      let totalObtained = 0;
      let totalMaxMarks = 0;
      let failedSubjectCount = 0;
      const subjectDetails = [];

      gradeSubjects.forEach((sub) => {
        const cfg = getSubjectMaxMarks(sub.name);
        const subMarks = stMarks[sub.name] || {};
        const theory = subMarks.theory !== '' && subMarks.theory !== undefined ? Number(subMarks.theory) : null;
        const practical = subMarks.practical !== '' && subMarks.practical !== undefined ? Number(subMarks.practical) : null;
        
        const subMax = cfg.maxTheory + cfg.maxPractical;
        const hasEntry = theory !== null || practical !== null;
        const subTotal = (theory || 0) + (practical || 0);

        const subPercentage = subMax > 0 ? (subTotal / subMax) * 100 : 0;
        const minPass = Math.round((subMax * (cfg.minPassPercent || 33)) / 100);
        const isSubPassed = subTotal >= minPass;

        if (hasEntry && !isSubPassed) {
          failedSubjectCount++;
        }

        if (hasEntry) {
          totalObtained += subTotal;
          totalMaxMarks += subMax;
        }

        const gradeInfo = calculateGrade(subPercentage);

        subjectDetails.push({
          subjectName: sub.name,
          hindiName: sub.hindiName || sub.name,
          maxTheory: cfg.maxTheory,
          maxPractical: cfg.maxPractical,
          maxTotal: subMax,
          minPass: minPass,
          theory: theory,
          practical: practical,
          total: hasEntry ? subTotal : '—',
          percentage: subPercentage,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
          isPassed: isSubPassed,
          hasEntry,
        });
      });

      const effectiveMax = totalMaxMarks > 0 ? totalMaxMarks : grandMaxMarksAllSubs;
      const overallPercentage = effectiveMax > 0 ? (totalObtained / effectiveMax) * 100 : 0;
      const isPassed = failedSubjectCount === 0 && totalObtained > 0;
      const division = calculateDivision(overallPercentage, isPassed);
      const overallGrade = calculateGrade(overallPercentage);

      return {
        student: st,
        key,
        subjectDetails,
        totalObtained,
        totalMaxMarks: effectiveMax,
        overallPercentage: Math.round(overallPercentage * 10) / 10,
        isPassed,
        failedSubjectCount,
        division,
        overallGrade: overallGrade.grade,
        remark: overallGrade.remark,
      };
    });

    // Assign Class Rank based on Percentage (only for passed students)
    const sorted = [...results].sort((a, b) => b.overallPercentage - a.overallPercentage);
    let currentRank = 1;
    sorted.forEach((item, idx) => {
      if (item.isPassed && item.totalObtained > 0) {
        if (idx > 0 && item.overallPercentage < sorted[idx - 1].overallPercentage) {
          currentRank = idx + 1;
        }
        item.rank = currentRank;
      } else {
        item.rank = '—';
      }
    });

    return results;
  }, [studentsList, gradeSubjects, marksData, selectedGrade, selectedSection, subjectConfig]);

  // Section Summary Statistics
  const sectionStats = useMemo(() => {
    const total = classResults.length;
    const appeared = classResults.filter((r) => r.totalObtained > 0).length;
    const passed = classResults.filter((r) => r.isPassed && r.totalObtained > 0).length;
    const failed = appeared - passed;
    const passPercentage = appeared > 0 ? Math.round((passed / appeared) * 1000) / 10 : 0;

    let firstDiv = 0;
    let secondDiv = 0;
    let thirdDiv = 0;
    classResults.forEach((r) => {
      if (r.isPassed && r.totalObtained > 0) {
        if (r.overallPercentage >= 60) firstDiv++;
        else if (r.overallPercentage >= 45) secondDiv++;
        else thirdDiv++;
      }
    });

    const topper = classResults
      .filter((r) => r.isPassed && r.totalObtained > 0)
      .sort((a, b) => b.overallPercentage - a.overallPercentage)[0];

    return {
      total,
      appeared,
      passed,
      failed,
      passPercentage,
      firstDiv,
      secondDiv,
      thirdDiv,
      topper,
    };
  }, [classResults]);

  // Current student selected for individual marksheet
  const currentMarksheetResult = useMemo(() => {
    return classResults.find((r) => r.student.rollNo === Number(selectedStudentRoll)) || classResults[0];
  }, [classResults, selectedStudentRoll]);

  // Export Tabulation Register to Excel
  const handleExportToExcel = () => {
    const dataRows = [];

    classResults.forEach((r, idx) => {
      const row = {
        'क्र० सं०': idx + 1,
        'प्रवेशांक (S.R. No)': r.student.srNo,
        'अनुक्रमांक (Roll No)': r.student.rollNo,
        'छात्र का नाम (English)': r.student.name,
        'छात्र का नाम (हिन्दी)': r.student.nameHindi || '',
        'पिता का नाम': r.student.fatherName,
        'माता का नाम': r.student.motherName || '',
        'माध्यम': r.student.medium,
      };

      r.subjectDetails.forEach((sub) => {
        row[`${sub.subjectName} (लिखित)`] = sub.theory !== null ? sub.theory : '—';
        if (sub.maxPractical > 0) {
          row[`${sub.subjectName} (प्रोजेक्ट/प्रायोगिक)`] = sub.practical !== null ? sub.practical : '—';
        }
        row[`${sub.subjectName} (कुल)`] = sub.total;
        row[`${sub.subjectName} (ग्रेड)`] = sub.grade;
      });

      row['कुल पूर्णांक'] = r.totalMaxMarks;
      row['कुल प्राप्तांक'] = r.totalObtained;
      row['प्रतिशत (%)'] = `${r.overallPercentage}%`;
      row['श्रेणी (Division)'] = r.division;
      row['परिणाम (Result)'] = r.isPassed ? 'उत्तीर्ण (PASS)' : 'अनुत्तीर्ण (FAIL)';
      row['कक्षा रैंक (Rank)'] = r.rank;

      dataRows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Class_${selectedGrade}_${selectedSection}`);
    XLSX.writeFile(wb, `Class_Result_Sheet_${selectedGrade}_${selectedSection}_${Date.now()}.xlsx`);
  };

  // Handle Excel Import for marks
  const handleImportMarksExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

        if (!Array.isArray(rows) || rows.length === 0) {
          alert('एक्सेल शीट में कोई डेटा नहीं मिला।');
          return;
        }

        let updatedCount = 0;
        setMarksData((prev) => {
          const updated = { ...prev };

          rows.forEach((row) => {
            // Find roll number
            const rollVal = row['RollNo'] || row['Roll'] || row['अनुक्रमांक'] || row['रोल नंबर'] || row['Roll No'];
            if (!rollVal) return;
            const rollNum = parseInt(rollVal);
            if (isNaN(rollNum)) return;

            const key = `${selectedGrade}_${selectedSection}_${rollNum}`;
            const stMarks = updated[key] || {};

            // Check columns matching subjects
            gradeSubjects.forEach((sub) => {
              const sName = sub.name;
              // Check direct total, theory, or practical
              const tVal = row[`${sName}_Theory`] || row[`${sName}_लिखित`] || row[`${sName}_T`];
              const pVal = row[`${sName}_Prac`] || row[`${sName}_प्रोजेक्ट`] || row[`${sName}_P`];
              const totalVal = row[sName] || row[sub.hindiName];

              const cfg = getSubjectMaxMarks(sName);

              if (tVal !== undefined && tVal !== '') {
                stMarks[sName] = {
                  theory: Math.min(cfg.maxTheory, Number(tVal) || 0),
                  practical: pVal !== undefined && pVal !== '' ? Math.min(cfg.maxPractical, Number(pVal) || 0) : 0,
                };
                updatedCount++;
              } else if (totalVal !== undefined && totalVal !== '') {
                const tot = Number(totalVal) || 0;
                stMarks[sName] = {
                  theory: Math.min(cfg.maxTheory, tot),
                  practical: 0,
                };
                updatedCount++;
              }
            });

            updated[key] = stMarks;
          });

          return updated;
        });

        alert(`सफलतापूर्वक आयात हुआ! ${updatedCount} प्रविष्टियां अपडेट की गईं।`);
      } catch (err) {
        alert(`फ़ाइल पढ़ने में त्रुटि: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Keyboard navigation for fast marks entry (Enter / Down moves to next student)
  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`input_${field}_${index + 1}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input_${field}_${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const currentSubjectConfig = getSubjectMaxMarks(selectedSubject);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  परीक्षा परिणाम व अंकतालिका (Marksheet & Result Manager)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700">
                  Dynamic 100%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                कक्षा-वार अंक प्रविष्टि, गजट/परीक्षाफल पंजी (Tabulation Register) एवं सुंदर प्रिंट मार्कशीट
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Admin Only for full excel download) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट (Print)</span>
            </button>
            {isAdmin && (
              <button
                onClick={handleExportToExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>एक्सेल पंजी डाउनलोड</span>
              </button>
            )}
          </div>
        </div>

        {/* If teacher has no assigned bundles */}
        {!isAdmin && myAssignedBundles.length === 0 ? (
          <div className="mt-6 p-8 bg-amber-50/70 border border-amber-200 rounded-2xl text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-amber-950">
              कोई उत्तर पुस्तिका (कॉपी) आवंटित नहीं है
            </h3>
            <p className="text-xs text-amber-800 mt-2 leading-relaxed">
              नमस्ते <strong>{currentUser?.name || 'शिक्षक'}</strong>! आपको अभी तक प्रधानाचार्य या एग्जाम कोऑर्डिनेटर द्वारा किसी कक्षा या विषय की कॉपी जांचने हेतु आवंटित नहीं की गई है।
            </p>
            <p className="text-[11px] text-amber-700/90 mt-2 font-medium">
              जब प्रधानाचार्य / एडमिन आपको कॉपियां आवंटित करेंगे, केवल वही कक्षाएं और विषय आपके खाते में स्वतः दिखाई देंगे।
            </p>
          </div>
        ) : (
          /* Dynamic Class, Section & Subject Selector Bar */
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                कक्षा (Class)
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer transition-all"
              >
                {displayedGrades.map((g) => (
                  <option key={g} value={g}>
                    Class {g}th
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                सेक्शन (Section)
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer transition-all"
              >
                {displayedSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector (for Marks Entry Tab) */}
            {activeSubTab === 'marks-entry' && (
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  प्रविष्टि हेतु विषय (Subject for Marks Entry)
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-indigo-500 cursor-pointer transition-all"
                >
                  {displayedSubjects.map((sub) => (
                    <option key={sub.name} value={sub.name}>
                      {sub.name} {sub.hindiName && sub.hindiName !== sub.name ? `(${sub.hindiName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student Selector (for Marksheet Tab) */}
            {activeSubTab === 'marksheet' && (
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  छात्र चुनें (Select Student)
                </label>
                <select
                  value={selectedStudentRoll}
                  onChange={(e) => setSelectedStudentRoll(e.target.value)}
                  disabled={bulkPrintMode}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer disabled:opacity-50"
                >
                  {studentsList.map((st) => (
                    <option key={st.rollNo} value={st.rollNo}>
                      Roll {st.rollNo} • {st.name} ({st.medium})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info Badge */}
            <div className="flex items-end pb-1">
              <span className="text-xs font-medium text-slate-500">
                कुल छात्र: <strong className="text-slate-800">{studentsList.length}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Module Sub-tabs - Only accessible for Principal / Admin */}
        {isAdmin && (
          <div className="mt-5 flex items-center gap-2 border-b border-slate-200 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('marks-entry')}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'marks-entry'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>1. अंक प्रविष्टि ग्रिड (Marks Entry)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('result-sheet')}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'result-sheet'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. कक्षा परीक्षाफल पंजी (Tabulation Register)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('marksheet')}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'marksheet'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>3. छात्र अंकतालिका (Report Card / Marksheet)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('config')}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'config'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>4. पूर्णांक व सेटिंग्स (Subject Config)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('allotment')}
              className={`pb-3 px-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'allotment'
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>5. कॉपी मूल्यांकन आवंटन व प्रगति (Evaluation Allotment)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-black">
                Master
              </span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: MARKS ENTRY GRID (अंक प्रविष्टि ग्रिड)
         ========================================================================= */}
      {activeSubTab === 'marks-entry' && (
        !isAdmin && myAssignedBundles.length === 0 ? null : (
        <div className="space-y-4 no-print">
          {/* Admin Master Control Notice */}
          {isAdmin && (
            <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-amber-400/30">
                  👑
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-300 text-xs sm:text-sm tracking-wide">
                      प्रधानाचार्य / कोऑर्डिनेटर मास्टर कंट्रोल (Master Access)
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      सार्वभौमिक अधिकार
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    आप किसी भी कक्षा व विषय के अंक भर सकते हैं, संसोधन कर सकते हैं तथा किसी भी शिक्षक हेतु विषय को अनलॉक अथवा फाइनल लॉक कर सकते हैं।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('allotment')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                <span>कॉपी आवंटन व लाइव प्रगति</span>
              </button>
            </div>
          )}

          {/* Teacher Assigned Bundles Quick Access (When Teacher logs in) */}
          {isTeacher && myAssignedBundles.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 border border-indigo-200 rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    आपकी आवंटित उत्तर पुस्तिकाएं (Your Assigned Copies)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-black">
                    {myAssignedBundles.length} बंडल
                  </span>
                </div>
                <span className="text-xs text-slate-600">
                  परीक्षक: <strong className="text-slate-900">{currentUser?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {myAssignedBundles.map((b) => {
                  const isSelected = selectedGrade === b.grade && selectedSection === b.section && selectedSubject === b.subject;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        setSelectedGrade(b.grade);
                        setSelectedSection(b.section);
                        setSelectedSubject(b.subject);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-400/30 shadow-sm'
                          : 'bg-white/80 hover:bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-slate-900">
                          कक्षा {b.grade}-{b.section}
                        </span>
                        {b.isLocked ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> सबमिट
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {b.enteredCount}/{b.totalStudents} जांची
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-indigo-700 truncate">
                        {b.subject} {b.hindiName && b.hindiName !== b.subject ? `(${b.hindiName})` : ''}
                      </div>
                      <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            b.isLocked ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${b.progressPercent}%` }}
                        ></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700">
                विषय: <span className="text-indigo-600 font-black">{selectedSubject}</span>
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                थ्योरी: {currentSubjectConfig.maxTheory} अंक
              </span>
              {currentSubjectConfig.maxPractical > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                  प्रायोगिक: {currentSubjectConfig.maxPractical} अंक
                </span>
              )}
              {currentBundleAllotment && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 font-bold text-indigo-800">
                  परीक्षक: {currentBundleAllotment.teacherName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <button
                  onClick={handleGenerateDemoMarks}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
                  title="परीक्षण हेतु सभी विषयों में डेमो अंक भरें"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>डेमो अंक भरें (Auto Demo)</span>
                </button>
              )}

              {isAdmin && (
                <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>एक्सेल से अंक भरें</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportMarksExcel}
                    className="hidden"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={handleSaveToCloud}
                disabled={isCloudSaving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                title="प्राप्तांक क्लाउड पर सुरक्षित करें"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isCloudSaving ? 'सेविंग...' : cloudSaveMessage || 'क्लाउड सेव'}</span>
              </button>

              {/* Teacher Submit & Lock Button (When logged in as regular teacher) */}
              {isTeacher && !isAdmin && (
                isCurrentSubjectLocked ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>सबमिट व लॉक है</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleTeacherSubmitAndLock}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    title="कॉपी चेकिंग पूर्ण होने पर सबमिट व लॉक करें"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>सबमिट व लॉक करें (Submit & Freeze)</span>
                  </button>
                )
              )}

              {/* Admin Lock / Unlock Controls */}
              {isAdmin && (
                isCurrentSubjectLocked ? (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-rose-700" />
                      <span>{isLockedByTeacher ? 'शिक्षक द्वारा सबमिट' : 'एडमिन द्वारा लॉक'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAdminUnlock}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1"
                      title="शिक्षक को संसोधन की अनुमति देने हेतु अनलॉक करें"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>अनलॉक करें</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>प्रविष्टि खुली है</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleLock}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                      title="कॉपी चेकिंग उपरांत डेटा लॉक करें"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>डाटा लॉक करें</span>
                    </button>
                  </div>
                )
              )}

              {isAdmin && (
                <button
                  onClick={handleClearCurrentClassMarks}
                  disabled={isCurrentSubjectLocked && !isAdmin}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                  title="अंक मिटाएं"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Locked Notice Banner */}
          {isCurrentSubjectLocked && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-bold shadow-2xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  🔒 <strong>डेटा लॉक (Frozen):</strong> कक्षा {selectedGrade} ({selectedSection}) के <strong>{selectedSubject}</strong> के अंक <strong>{currentLockInfo?.lockedBy || 'परीक्षक'}</strong> द्वारा {currentLockInfo?.lockedAt ? new Date(currentLockInfo.lockedAt).toLocaleDateString('hi-IN') : ''} को लॉक कर दिए गए हैं। {isAdmin ? ' (प्रधानाचार्य मास्टर मोड में आप अभी भी नंबर बदल सकते हैं या अनलॉक कर सकते हैं)' : 'यदि कोई संशोधन करना है तो कृपया प्रधानाचार्य / कोऑर्डिनेटर से अनलॉक कराएं।'}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAdminUnlock}
                  className="ml-3 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black shadow-xs shrink-0 cursor-pointer"
                >
                  अनलॉक करें (Unlock)
                </button>
              )}
            </div>
          )}

          {/* Students Marks Input Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black text-[11px] tracking-wider">
                    <th className="px-4 py-3 w-16 text-center">क्र०</th>
                    <th className="px-4 py-3 w-28 text-center">रोल नंबर</th>
                    <th className="px-4 py-3 w-28 text-center">SR No</th>
                    <th className="px-4 py-3">छात्र का नाम (Student Name)</th>
                    <th className="px-4 py-3">पिता का नाम (Father Name)</th>
                    <th className="px-4 py-3 w-24 text-center">माध्यम</th>
                    <th className="px-4 py-3 w-36 text-center bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                      लिखित / Theory (Max: {currentSubjectConfig.maxTheory})
                    </th>
                    {currentSubjectConfig.maxPractical > 0 && (
                      <th className="px-4 py-3 w-36 text-center bg-emerald-50/50 text-emerald-900 border-r border-emerald-100">
                        प्रोजेक्ट / Practical (Max: {currentSubjectConfig.maxPractical})
                      </th>
                    )}
                    <th className="px-4 py-3 w-24 text-center">कुल प्राप्तांक</th>
                    <th className="px-4 py-3 w-20 text-center">ग्रेड</th>
                    <th className="px-4 py-3 w-24 text-center">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsList.map((st, idx) => {
                    const key = `${selectedGrade}_${selectedSection}_${st.rollNo}`;
                    const stMarks = marksData[key]?.[selectedSubject] || {};
                    const tVal = stMarks.theory !== undefined ? stMarks.theory : '';
                    const pVal = stMarks.practical !== undefined ? stMarks.practical : '';
                    const totalVal = (tVal !== '' ? Number(tVal) : 0) + (pVal !== '' ? Number(pVal) : 0);
                    const hasEntry = tVal !== '' || pVal !== '';
                    const subMax = currentSubjectConfig.maxTheory + currentSubjectConfig.maxPractical;
                    const percent = subMax > 0 ? (totalVal / subMax) * 100 : 0;
                    const gradeInfo = calculateGrade(percent);
                    const minPass = Math.round((subMax * (currentSubjectConfig.minPassPercent || 33)) / 100);
                    const isPass = totalVal >= minPass;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-black text-slate-700">
                          {st.rollNo}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600">
                          {st.srNo}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {st.name}
                          {st.nameHindi && st.nameHindi !== st.name && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              {st.nameHindi}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {st.fatherName}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              st.medium === 'English'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            {st.medium === 'English' ? 'English' : 'हिन्दी'}
                          </span>
                        </td>
                        {/* Theory Marks Input */}
                        <td className="px-4 py-2.5 text-center bg-indigo-50/30 border-x border-indigo-100">
                          <input
                            id={`input_theory_${idx}`}
                            type="number"
                            min="0"
                            max={currentSubjectConfig.maxTheory}
                            value={tVal}
                            placeholder="0"
                            onChange={(e) => handleUpdateMarks(key, selectedSubject, 'theory', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'theory')}
                            disabled={isCurrentSubjectLocked && !isAdmin}
                            className={`w-20 px-2 py-1.5 rounded-lg text-center font-mono font-black focus:ring-2 focus:outline-none ${
                              isCurrentSubjectLocked && !isAdmin
                                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                : 'bg-white border border-indigo-200 text-indigo-950 focus:ring-indigo-500'
                            }`}
                          />
                        </td>
                        {/* Practical Marks Input */}
                        {currentSubjectConfig.maxPractical > 0 && (
                          <td className="px-4 py-2.5 text-center bg-emerald-50/30 border-r border-emerald-100">
                            <input
                              id={`input_practical_${idx}`}
                              type="number"
                              min="0"
                              max={currentSubjectConfig.maxPractical}
                              value={pVal}
                              placeholder="0"
                              onChange={(e) => handleUpdateMarks(key, selectedSubject, 'practical', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'practical')}
                              disabled={isCurrentSubjectLocked && !isAdmin}
                            className={`w-20 px-2 py-1.5 rounded-lg text-center font-mono font-black focus:ring-2 focus:outline-none ${
                              isCurrentSubjectLocked && !isAdmin
                                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                : 'bg-white border border-emerald-200 text-emerald-950 focus:ring-emerald-500'
                            }`}
                            />
                          </td>
                        )}
                        {/* Total Marks */}
                        <td className="px-4 py-2.5 text-center font-mono font-black text-slate-800">
                          {hasEntry ? totalVal : '—'}
                        </td>
                        {/* Grade */}
                        <td className="px-4 py-2.5 text-center">
                          {hasEntry ? (
                            <span className="px-2 py-0.5 rounded font-black text-xs bg-slate-100 text-slate-800">
                              {gradeInfo.grade}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-2.5 text-center">
                          {hasEntry ? (
                            isPass ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                उत्तीर्ण
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                अनुत्तीर्ण
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-medium">अपेक्षित</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* =========================================================================
          TAB 2: CLASS RESULT SHEET / TABULATION REGISTER (परीक्षाफल पंजी)
         ========================================================================= */}
      {isAdmin && activeSubTab === 'result-sheet' && (
        <div className="space-y-6">
          {/* Summary KPI Badges (No Print) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 no-print">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">कुल पंजीकृत छात्र</span>
              <span className="text-xl font-black text-slate-800 mt-0.5 block">{sectionStats.total}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">प्रविष्ट / उपस्थित</span>
              <span className="text-xl font-black text-blue-700 mt-0.5 block">{sectionStats.appeared}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">उत्तीर्ण छात्र (Pass)</span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block">{sectionStats.passed}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">उत्तीर्ण प्रतिशत (%)</span>
              <span className="text-xl font-black text-indigo-700 mt-0.5 block">{sectionStats.passPercentage}%</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">I / II / III श्रेणी</span>
              <span className="text-sm font-black text-slate-700 mt-1 block">
                {sectionStats.firstDiv} / {sectionStats.secondDiv} / {sectionStats.thirdDiv}
              </span>
            </div>
            <div className="bg-gradient-to-tr from-amber-50 to-amber-100/70 p-3.5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-800 uppercase">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>कक्षा टॉपर (Rank 1)</span>
              </div>
              <span className="text-xs font-black text-amber-950 mt-1 block truncate">
                {sectionStats.topper ? `${sectionStats.topper.student.name} (${sectionStats.topper.overallPercentage}%)` : '—'}
              </span>
            </div>
          </div>

          {/* Printable Tabulation Register */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print-sheet">
            {/* School Header */}
            <div className="text-center pb-5 mb-5 border-b-2 border-slate-800">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                {examDetails.schoolName || 'A B V I C MIRANPUR KATRA SHAHJAHANPUR'}
              </h2>
              <h3 className="text-sm sm:text-base font-bold text-slate-700 uppercase mt-1">
                कक्षा परीक्षाफल पंजी (CLASS TABULATION REGISTER) • सत्र 2026-27
              </h3>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs font-bold text-slate-600">
                <span>कक्षा (Class): <strong>{selectedGrade}th</strong></span>
                <span>सेक्शन (Section): <strong>{selectedSection}</strong></span>
                <span>परीक्षा: <strong>{examDetails.examName || 'अर्धवार्षिक परीक्षा (Half Yearly Exam)'}</strong></span>
              </div>
            </div>

            {/* Tabulation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black text-center border-b border-slate-400">
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-10">क्र०</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-20">प्रवेशांक (S.R.)</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-16">रोल नं०</th>
                    <th rowSpan="2" className="border border-slate-400 px-3 py-1.5 text-left w-36">छात्र का नाम</th>
                    <th rowSpan="2" className="border border-slate-400 px-3 py-1.5 text-left w-32">पिता का नाम</th>
                    {gradeSubjects.map((sub) => (
                      <th
                        key={sub.name}
                        colSpan={getSubjectMaxMarks(sub.name).maxPractical > 0 ? 3 : 2}
                        className="border border-slate-400 px-2 py-1 bg-slate-50 font-bold"
                      >
                        {sub.name}
                        <span className="block text-[9px] font-normal text-slate-600">
                          (पूर्णांक: {getSubjectMaxMarks(sub.name).maxTheory + getSubjectMaxMarks(sub.name).maxPractical})
                        </span>
                      </th>
                    ))}
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-14">पूर्णांक</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-14 bg-indigo-50 font-black">प्राप्तांक</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-12 bg-indigo-50 font-black">%</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-20">श्रेणी</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-16">परिणाम</th>
                    <th rowSpan="2" className="border border-slate-400 px-2 py-1.5 w-12">रैंक</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-center font-bold text-slate-600">
                    {gradeSubjects.map((sub) => {
                      const cfg = getSubjectMaxMarks(sub.name);
                      return (
                        <React.Fragment key={sub.name}>
                          <th className="border border-slate-400 px-1 py-0.5">थ्योरी</th>
                          {cfg.maxPractical > 0 && <th className="border border-slate-400 px-1 py-0.5">प्रोजेक्ट</th>}
                          <th className="border border-slate-400 px-1 py-0.5 bg-slate-100 font-bold">योग</th>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {classResults.map((r, idx) => (
                    <tr key={r.student.id} className="hover:bg-slate-50 text-center font-mono text-[11px]">
                      <td className="border border-slate-300 px-1.5 py-1 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="border border-slate-300 px-1.5 py-1 font-mono font-bold text-slate-700">{r.student.srNo}</td>
                      <td className="border border-slate-300 px-1.5 py-1 font-black">{r.student.rollNo}</td>
                      <td className="border border-slate-300 px-2 py-1 text-left font-sans font-bold text-slate-900">
                        {r.student.name}
                        {r.student.nameHindi && r.student.nameHindi !== r.student.name && (
                          <span className="block text-[10px] font-normal text-indigo-900">
                            {r.student.nameHindi}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-left font-sans text-slate-600 text-[10px]">
                        {r.student.fatherName}
                      </td>

                      {/* Subject Marks Columns */}
                      {r.subjectDetails.map((sub) => (
                        <React.Fragment key={sub.subjectName}>
                          <td className="border border-slate-300 px-1 py-1">
                            {sub.theory !== null ? sub.theory : '—'}
                          </td>
                          {sub.maxPractical > 0 && (
                            <td className="border border-slate-300 px-1 py-1">
                              {sub.practical !== null ? sub.practical : '—'}
                            </td>
                          )}
                          <td className="border border-slate-300 px-1 py-1 font-black bg-slate-50/70">
                            {sub.total}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* Totals & Results */}
                      <td className="border border-slate-300 px-1.5 py-1 text-slate-600 font-bold">{r.totalMaxMarks}</td>
                      <td className="border border-slate-300 px-1.5 py-1 font-black bg-indigo-50/50 text-indigo-900">
                        {r.totalObtained > 0 ? r.totalObtained : '—'}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-black bg-indigo-50/50 text-indigo-900">
                        {r.totalObtained > 0 ? `${r.overallPercentage}%` : '—'}
                      </td>
                      <td className="border border-slate-300 px-1 py-1 font-sans text-[10px] font-bold">
                        {r.division}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-sans">
                        {r.totalObtained > 0 ? (
                          r.isPassed ? (
                            <span className="text-emerald-700 font-black">PASS</span>
                          ) : (
                            <span className="text-rose-700 font-black">FAIL</span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="border border-slate-300 px-1 py-1 font-black text-amber-700 font-sans">
                        {r.rank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signatures Footer */}
            <div className="mt-12 pt-6 border-t border-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs font-bold text-slate-800">
              <div>
                <p className="mt-8 border-t border-slate-400 pt-1.5 inline-block min-w-32">
                  हस्ताक्षर कक्षाध्यापक (Class Teacher)
                </p>
              </div>
              <div>
                <p className="mt-8 border-t border-slate-400 pt-1.5 inline-block min-w-32">
                  हस्ताक्षर जाँचकर्ता (Checker)
                </p>
              </div>
              <div>
                <p className="mt-8 border-t border-slate-400 pt-1.5 inline-block min-w-32">
                  हस्ताक्षर परीक्षा प्रभारी (Exam Incharge)
                </p>
              </div>
              <div>
                <p className="mt-8 border-t border-slate-400 pt-1.5 inline-block min-w-32">
                  हस्ताक्षर प्रधानाचार्य (Principal)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: STUDENT MARKSHEET / REPORT CARD (अंकतालिका)
         ========================================================================= */}
      {isAdmin && activeSubTab === 'marksheet' && (
        <div className="space-y-6">
          {/* Marksheet Controls Bar (No Print) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs no-print">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={bulkPrintMode}
                  onChange={(e) => setBulkPrintMode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span>सभी छात्रों की मार्कशीट एक साथ प्रिंट करें (Bulk Print All)</span>
              </label>
              {bulkPrintMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                  {classResults.length} छात्र प्रिंट होंगे
                </span>
              )}
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>मार्कशीट प्रिंट करें (Print Marksheet)</span>
            </button>
          </div>

          {/* Marksheets View Container */}
          <div className="space-y-8">
            {(bulkPrintMode ? classResults : [currentMarksheetResult]).map((resultItem, itemIdx) => {
              if (!resultItem) return null;
              const { student, subjectDetails, totalObtained, totalMaxMarks, overallPercentage, division, isPassed, rank } = resultItem;

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-2xl border-2 border-slate-800 p-6 sm:p-8 max-w-4xl mx-auto shadow-sm relative ${
                    itemIdx > 0 ? 'break-before-page' : ''
                  }`}
                  style={{ minHeight: '1000px' }}
                >
                  {/* Decorative Border Corner Ornaments */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-slate-800" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-slate-800" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-slate-800" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-slate-800" />

                  {/* Marksheet Header */}
                  <div className="text-center pb-4 border-b-2 border-slate-800">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md mb-2">
                      UP BOARD PATTERN PROGRESS REPORT
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight">
                      {examDetails.schoolName || 'A B V I C MIRANPUR KATRA SHAHJAHANPUR'}
                    </h2>
                    <h3 className="text-sm font-bold text-slate-600 uppercase mt-1">
                      {examDetails.examName || 'अर्धवार्षिक परीक्षा (HALF YEARLY EXAMINATION)'} • सत्र 2026-27
                    </h3>
                    <div className="inline-block mt-3 px-6 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-black text-amber-900 tracking-wider">
                      अंकतालिका / प्रगति पत्रक (STUDENT MARKSHEET)
                    </div>
                  </div>

                  {/* Student Credentials Grid */}
                  <div className="mt-5 p-4 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">छात्र का नाम (Name)</span>
                      <strong className="text-sm text-slate-900 font-black block">{student.name}</strong>
                      {student.nameHindi && student.nameHindi !== student.name && (
                        <span className="text-xs font-bold text-indigo-900 block mt-0.5">
                          {student.nameHindi}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">पिता का नाम (Father)</span>
                      <strong className="text-slate-800">{student.fatherName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">माता का नाम (Mother)</span>
                      <strong className="text-slate-800">{student.motherName || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">कक्षा व वर्ग (Class & Sec)</span>
                      <strong className="text-indigo-900 font-black">कक्षा {student.className} - {student.section}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">प्रवेशांक (S.R. No.)</span>
                      <strong className="text-slate-900 font-mono font-black text-sm text-indigo-950">{student.srNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">अनुक्रमांक (Roll No)</span>
                      <strong className="text-slate-900 font-mono font-black text-sm">{student.rollNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">जन्म तिथि (DOB)</span>
                      <strong className="text-slate-800">{student.dob || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">माध्यम (Medium)</span>
                      <strong className="text-slate-800">{student.medium === 'English' ? 'English Medium' : 'हिन्दी माध्यम'}</strong>
                    </div>
                  </div>

                  {/* Subject Marks Table */}
                  <div className="mt-5">
                    <table className="w-full text-left text-xs border-collapse border border-slate-800">
                      <thead>
                        <tr className="bg-slate-800 text-white font-black text-center text-[11px] uppercase">
                          <th className="border border-slate-800 px-3 py-2 text-left">विषय (Subject)</th>
                          <th className="border border-slate-800 px-2 py-2 w-16">पूर्णांक (Max)</th>
                          <th className="border border-slate-800 px-2 py-2 w-16">उत्तीर्णांक (Min)</th>
                          <th className="border border-slate-800 px-2 py-2 w-20">लिखित (Theory)</th>
                          <th className="border border-slate-800 px-2 py-2 w-20">प्रोजेक्ट (Prac)</th>
                          <th className="border border-slate-800 px-3 py-2 w-20 bg-slate-900">प्राप्तांक (Total)</th>
                          <th className="border border-slate-800 px-2 py-2 w-14">ग्रेड (Grade)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectDetails.map((sub, sIdx) => (
                          <tr key={sIdx} className="border-b border-slate-300 text-center font-mono">
                            <td className="border border-slate-300 px-3 py-2 text-left font-sans font-bold text-slate-900">
                              {sub.subjectName}
                              {sub.hindiName && sub.hindiName !== sub.subjectName && (
                                <span className="text-[10px] font-normal text-slate-500 ml-1.5">
                                  ({sub.hindiName})
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 text-slate-600 font-bold">{sub.maxTotal}</td>
                            <td className="border border-slate-300 px-2 py-2 text-slate-500">{sub.minPass}</td>
                            <td className="border border-slate-300 px-2 py-2 font-bold">{sub.theory !== null ? sub.theory : '—'}</td>
                            <td className="border border-slate-300 px-2 py-2 text-slate-600">{sub.maxPractical > 0 ? (sub.practical !== null ? sub.practical : '—') : '—'}</td>
                            <td className="border border-slate-300 px-3 py-2 font-black bg-slate-50 text-slate-900">
                              {sub.total}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 font-black font-sans text-xs">
                              {sub.grade}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-center text-xs border-t-2 border-slate-800">
                          <td className="border border-slate-800 px-3 py-2.5 text-left font-sans uppercase">
                            कुल योग (GRAND TOTAL):
                          </td>
                          <td className="border border-slate-800 px-2 py-2.5 font-mono">{totalMaxMarks}</td>
                          <td className="border border-slate-800 px-2 py-2.5 text-slate-400 font-mono">—</td>
                          <td colSpan="2" className="border border-slate-800 px-2 py-2.5 text-slate-400 font-mono">—</td>
                          <td className="border border-slate-800 px-3 py-2.5 font-mono text-sm bg-indigo-100 text-indigo-950">
                            {totalObtained}
                          </td>
                          <td className="border border-slate-800 px-2 py-2.5 text-indigo-900 font-sans">
                            {calculateGrade(overallPercentage).grade}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Performance Summary Box */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">प्रतिशत (Percentage)</span>
                      <strong className="text-base text-slate-900 font-black">{overallPercentage}%</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">श्रेणी (Division)</span>
                      <strong className="text-xs text-slate-900 font-bold block mt-1">{division}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">परीक्षाफल (Result)</span>
                      <strong className={`text-sm font-black ${isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isPassed ? 'उत्तीर्ण (PASSED)' : 'अनुत्तीर्ण (FAILED)'}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">कक्षा रैंक (Class Rank)</span>
                      <strong className="text-base text-amber-700 font-black">{rank}</strong>
                    </div>
                  </div>

                  {/* Grading Key & Remarks */}
                  <div className="mt-5 p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-[10px] text-slate-600 flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <strong>ग्रेडिंग स्केल (Grading Scale):</strong> A1 (91-100), A2 (81-90), B1 (71-80), B2 (61-70), C1 (51-60), C2 (41-50), D (33-40 Pass), E (Failed)
                    </div>
                    <div>
                      <strong>कक्षाध्यापक की टिप्पणी:</strong> {isPassed ? (overallPercentage >= 75 ? 'उत्कृष्ट प्रदर्शन (Outstanding)' : 'सराहनीय प्रयास (Good Job)') : 'कठिन परिश्रम अपेक्षित (Needs More Effort)'}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="mt-14 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs font-bold text-slate-800">
                    <div>
                      <p className="border-t border-slate-800 pt-1 inline-block min-w-28">
                        हस्ताक्षर कक्षाध्यापक (Class Teacher)
                      </p>
                    </div>
                    <div>
                      <p className="border-t border-slate-800 pt-1 inline-block min-w-28">
                        हस्ताक्षर जाँचकर्ता (Checker)
                      </p>
                    </div>
                    <div>
                      <p className="border-t border-slate-800 pt-1 inline-block min-w-28">
                        हस्ताक्षर परीक्षा प्रभारी (Exam Incharge)
                      </p>
                    </div>
                    <div>
                      <p className="border-t border-slate-800 pt-1 inline-block min-w-28">
                        हस्ताक्षर प्रधानाचार्य (Principal)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CONFIGURATION & MAX MARKS (पूर्णांक व सेटिंग्स)
         ========================================================================= */}
      {isAdmin && activeSubTab === 'config' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 no-print">
          <div>
            <h3 className="text-base font-black text-slate-800">
              विषय पूर्णांक एवं उत्तीर्णांक सेटिंग्स (Subject Max Marks & Passing Configuration)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              प्रत्येक विषय के लिए लिखित (Theory) एवं प्रोजेक्ट/प्रायोगिक (Practical) के अधिकतम अंक सेट करें
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px]">
                  <th className="px-4 py-3">विषय (Subject)</th>
                  <th className="px-4 py-3 w-40">थ्योरी पूर्णांक (Max Theory)</th>
                  <th className="px-4 py-3 w-44">प्रोजेक्ट/प्रायोगिक (Max Practical)</th>
                  <th className="px-4 py-3 w-32">कुल पूर्णांक (Total)</th>
                  <th className="px-4 py-3 w-36">पासिंग % (Min Pass %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeSubjects.map((sub) => {
                  const sName = sub.name;
                  const cfg = getSubjectMaxMarks(sName);

                  const handleConfigChange = (field, val) => {
                    setSubjectConfig((prev) => ({
                      ...prev,
                      [sName]: {
                        ...cfg,
                        [field]: Number(val) || 0,
                      },
                    }));
                  };

                  return (
                    <tr key={sName} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {sub.name}
                        {sub.hindiName && sub.hindiName !== sub.name && (
                          <span className="text-slate-500 font-normal ml-2">
                            ({sub.hindiName})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={cfg.maxTheory}
                          onChange={(e) => handleConfigChange('maxTheory', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={cfg.maxPractical}
                          onChange={(e) => handleConfigChange('maxPractical', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-indigo-900">
                        {cfg.maxTheory + cfg.maxPractical} अंक
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={cfg.minPassPercent}
                          onChange={(e) => handleConfigChange('minPassPercent', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                        />
                        <span className="ml-1 text-slate-500 font-bold">%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              * सेटिंग्स स्वतः LocalStorage में सुरक्षित होती हैं और पेज रिफ्रेश करने पर भी बनी रहती हैं।
            </span>
            <button
              onClick={() => {
                if (window.confirm('क्या आप सभी विषयों के पूर्णांक को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) {
                  setSubjectConfig({});
                  localStorage.removeItem(STORAGE_KEY_CONFIG);
                }
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              डिफ़ॉल्ट पूर्णांक पर रीसेट करें
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: EVALUATION ALLOTMENT & LIVE TRACKING (कॉपी आवंटन व लाइव प्रगति)
         ========================================================================= */}
      {isAdmin && activeSubTab === 'allotment' && (
        <div className="space-y-5 no-print">
          {/* Header & Metrics Cards */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    कॉपी मूल्यांकन आवंटन व लाइव प्रगति ट्रैकिंग (Evaluation Duty Allotment)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700">
                    Master Console
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  प्रधानाचार्य / कोऑर्डिनेटर द्वारा विषय अध्यापकों को कॉपियां आवंटित करें, लाइव जांच प्रगति देखें और डाटा लॉक प्रबंधित करें।
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoAllotTeachers}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="शिक्षकों के विषय अनुसार स्वतः आवंटन करें"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ 1-क्लिक ऑटो आवंटन (Auto Allot)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAllotmentReport}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="एक्सेल में पूरी रिपोर्ट डाउनलोड करें"
                >
                  <Download className="w-4 h-4" />
                  <span>आवंटन रिपोर्ट (Excel)</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-500 block">कुल विषय बंडल (Bundles)</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {allSchoolBundles.length}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">समस्त कक्षा 6 से 12</span>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-indigo-700 block">आवंटित बंडल (Assigned)</span>
                <span className="text-2xl font-black text-indigo-900 mt-1 block">
                  {allSchoolBundles.filter((b) => b.allotment).length}
                </span>
                <span className="text-[10px] text-indigo-600 mt-0.5 block">
                  {allSchoolBundles.length > 0 ? Math.round((allSchoolBundles.filter((b) => b.allotment).length / allSchoolBundles.length) * 100) : 0}% कवर्ड
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-emerald-700 block">जांच पूर्ण व लॉक (Locked)</span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {allSchoolBundles.filter((b) => b.isLocked).length}
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">अंक फ्रीज एवं सुरक्षित</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-amber-700 block">प्रगति पर / बाकी (Pending)</span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">
                  {allSchoolBundles.filter((b) => !b.isLocked).length}
                </span>
                <span className="text-[10px] text-amber-600 mt-0.5 block">जांच कार्य जारी</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-600">कक्षा फ़िल्टर:</label>
                <select
                  value={allotmentClassFilter}
                  onChange={(e) => setAllotmentClassFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="all">सभी कक्षाएं (All Classes)</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      Class {g}th
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={allotmentSearch}
                  onChange={(e) => setAllotmentSearch(e.target.value)}
                  placeholder="विषय या शिक्षक का नाम खोजें..."
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 w-full sm:w-64 focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Allotment & Tracking Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                    <th className="px-4 py-3 w-14 text-center">क्र०</th>
                    <th className="px-4 py-3 w-28 text-center">कक्षा व सेक्शन</th>
                    <th className="px-4 py-3">विषय (Subject Name)</th>
                    <th className="px-4 py-3 w-28 text-center">कुल कॉपियां</th>
                    <th className="px-4 py-3 w-40 text-center">जांच प्रगति (Progress)</th>
                    <th className="px-4 py-3 w-64">आवंटित परीक्षक शिक्षक (Evaluator)</th>
                    <th className="px-4 py-3 w-32 text-center">स्थिति</th>
                    <th className="px-4 py-3 w-40 text-center">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSchoolBundles
                    .filter((b) => {
                      if (allotmentClassFilter !== 'all' && b.grade !== allotmentClassFilter) return false;
                      if (allotmentSearch.trim()) {
                        const q = allotmentSearch.toLowerCase().trim();
                        const sMatch = b.subject.toLowerCase().includes(q) || (b.hindiName && b.hindiName.toLowerCase().includes(q));
                        const tMatch = b.assignedTeacherName && b.assignedTeacherName.toLowerCase().includes(q);
                        if (!sMatch && !tMatch) return false;
                      }
                      return true;
                    })
                    .map((b, idx) => (
                      <tr key={b.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            Class {b.grade}-{b.section}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {b.subject}
                          {b.hindiName && b.hindiName !== b.subject && (
                            <span className="block text-[11px] font-normal text-slate-500">
                              {b.hindiName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                          {b.totalStudents}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-600 mb-1">
                            <span>{b.enteredCount}/{b.totalStudents}</span>
                            <span className={b.progressPercent === 100 ? 'text-emerald-700' : 'text-indigo-700'}>
                              {b.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                b.isLocked ? 'bg-emerald-500' : b.progressPercent === 100 ? 'bg-blue-600' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${b.progressPercent}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={b.allotment?.teacherId || ''}
                            onChange={(e) => handleAssignTeacher(b.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer focus:outline-indigo-500"
                          >
                            <option value="">— शिक्षक चुनें (Unassigned) —</option>
                            {teachers.map((t) => {
                              const tId = t._id ? t._id.toString() : t.id;
                              return (
                                <option key={tId} value={tId}>
                                  {t.name} {t.subject ? `[${t.subject}]` : ''}
                                </option>
                              );
                            })}
                          </select>
                          {b.assignedTeacherPhone && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              📞 {b.assignedTeacherPhone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {b.isLocked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>{b.roleLocked === 'admin' ? 'फाइनल लॉक' : 'शिक्षक लॉक'}</span>
                            </span>
                          ) : b.enteredCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              प्रगति पर
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              शुरू नहीं
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGrade(b.grade);
                                setSelectedSection(b.section);
                                setSelectedSubject(b.subject);
                                setActiveSubTab('marks-entry');
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="इस विषय के प्राप्तांक भरें अथवा देखें"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>अंक भरें</span>
                            </button>

                            {b.isLocked ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGrade(b.grade);
                                  setSelectedSection(b.section);
                                  setSelectedSubject(b.subject);
                                  handleAdminUnlock();
                                }}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                                title="अनलॉक करें"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGrade(b.grade);
                                  setSelectedSection(b.section);
                                  setSelectedSubject(b.subject);
                                  handleToggleLock();
                                }}
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                                title="डेटा लॉक करें"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
