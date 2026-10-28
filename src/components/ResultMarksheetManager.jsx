import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  seatingResult
}) {
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

  // Available distinct grades from classes in current state
  const availableGrades = useMemo(() => {
    const set = new Set();
    classes.forEach((c) => {
      if (c.name) set.add(String(c.name).trim());
    });
    return Array.from(set).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [classes]);

  // Set default grade on mount or shift change
  useEffect(() => {
    if (availableGrades.length > 0 && (!selectedGrade || !availableGrades.includes(selectedGrade))) {
      setSelectedGrade(availableGrades[0]);
    }
  }, [availableGrades, selectedGrade]);

  // Available sections for the selected grade
  const availableSections = useMemo(() => {
    const list = classes
      .filter((c) => String(c.name).trim() === selectedGrade)
      .map((c) => String(c.section).toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [classes, selectedGrade]);

  useEffect(() => {
    if (availableSections.length > 0 && (!selectedSection || !availableSections.includes(selectedSection))) {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, selectedSection]);

  // Get active class entry object
  const currentClassObj = useMemo(() => {
    return classes.find(
      (c) => String(c.name).trim() === selectedGrade && String(c.section).toUpperCase().trim() === selectedSection
    );
  }, [classes, selectedGrade, selectedSection]);

  // Dynamically extract subjects for the selected grade & section
  const gradeSubjects = useMemo(() => {
    const subjectsSet = new Map();

    // 1. Check EXAM_TIMETABLE for this grade across all dates
    EXAM_TIMETABLE.forEach((day) => {
      const shiftSubs = day[activeShift] || {};
      const subsForGrade = shiftSubs[selectedGrade] || [];
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

    // 2. Filter subjects relevant to section stream
    // For 6th to 8th:
    // - Section A: Computer
    // - Section B: Commerce, Art
    // - Section C: English Medium (Computer)
    if (['6', '7', '8'].includes(selectedGrade)) {
      if (selectedSection === 'A') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('ART');
      } else if (selectedSection === 'B') {
        // Section B has Commerce and Art, but not Computer
        subjectsSet.delete('COMPUTER');
      } else if (selectedSection === 'C') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('ART');
      }
    } else if (['9', '10'].includes(selectedGrade)) {
      if (selectedSection === 'A' || selectedSection === 'E') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('ART');
      } else if (selectedSection === 'B') {
        subjectsSet.delete('COMMERCE');
        subjectsSet.delete('COMPUTER');
      } else if (selectedSection === 'C') {
        subjectsSet.delete('ART');
        subjectsSet.delete('COMPUTER');
      }
    } else if (['11', '12'].includes(selectedGrade)) {
      if (selectedSection === 'A' || selectedSection === 'E') {
        subjectsSet.delete('BIOLOGY');
        subjectsSet.delete('ACCOUNTANCY');
        subjectsSet.delete('BUSS. STUDY');
      } else if (selectedSection === 'B') {
        subjectsSet.delete('MATH');
        subjectsSet.delete('ACCOUNTANCY');
        subjectsSet.delete('BUSS. STUDY');
      } else if (selectedSection === 'C') {
        subjectsSet.delete('MATH');
        subjectsSet.delete('BIOLOGY');
        subjectsSet.delete('PHYSICS');
        subjectsSet.delete('CHEMISTRY');
      }
    }

    // Also include any custom subjects configured in subjectConfig
    Object.keys(subjectConfig).forEach((customSub) => {
      const up = customSub.toUpperCase();
      if (!subjectsSet.has(up)) {
        subjectsSet.set(up, { name: up, code: '', hindiName: up });
      }
    });

    return Array.from(subjectsSet.values());
  }, [selectedGrade, selectedSection, activeShift, subjectConfig]);

  // Set default subject on grade/section change
  useEffect(() => {
    if (gradeSubjects.length > 0 && (!selectedSubject || !gradeSubjects.some((s) => s.name === selectedSubject))) {
      setSelectedSubject(gradeSubjects[0].name);
    }
  }, [gradeSubjects, selectedSubject]);

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

  // Update marks for a student in state
  const handleUpdateMarks = (studentKey, subjectName, field, value) => {
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

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट (Print)</span>
            </button>
            <button
              onClick={handleExportToExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>एक्सेल पंजी डाउनलोड</span>
            </button>
          </div>
        </div>

        {/* Dynamic Class, Section & Subject Selector Bar */}
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
              {availableGrades.map((g) => (
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
              {availableSections.map((sec) => (
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
                {gradeSubjects.map((sub) => (
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

        {/* Module Sub-tabs */}
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
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MARKS ENTRY GRID (अंक प्रविष्टि ग्रिड)
         ========================================================================= */}
      {activeSubTab === 'marks-entry' && (
        <div className="space-y-4 no-print">
          {/* Quick Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                वर्तमान विषय: <span className="text-indigo-600 font-black">{selectedSubject}</span>
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                थ्योरी: {currentSubjectConfig.maxTheory} अंक
              </span>
              {currentSubjectConfig.maxPractical > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                  प्रोजेक्ट/प्रायोगिक: {currentSubjectConfig.maxPractical} अंक
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateDemoMarks}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
                title="परीक्षण हेतु सभी विषयों में डेमो अंक भरें"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>डेमो अंक भरें (Auto Demo)</span>
              </button>

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

              <button
                onClick={handleClearCurrentClassMarks}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                title="अंक मिटाएं"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                            className="w-20 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-center font-mono font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                              className="w-20 px-2 py-1.5 bg-white border border-emerald-200 rounded-lg text-center font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
      )}

      {/* =========================================================================
          TAB 2: CLASS RESULT SHEET / TABULATION REGISTER (परीक्षाफल पंजी)
         ========================================================================= */}
      {activeSubTab === 'result-sheet' && (
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
      {activeSubTab === 'marksheet' && (
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
      {activeSubTab === 'config' && (
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
    </div>
  );
}
