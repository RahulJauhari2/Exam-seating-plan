import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  BookOpen, 
  Printer, 
  FileText, 
  Package, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Hash, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building,
  Layers
} from 'lucide-react';
import { 
  UP_BOARD_SUBJECT_CODES, 
  EXAM_SCHEME_METADATA, 
  EXAM_TIMETABLE 
} from '../data/examSchemeData';

// Helper to check if a class/section or student is English medium
function isSectionEnglish(c) {
  if (!c) return false;
  if (c.medium === 'English') return true;
  if (c.medium === 'Hindi') return false;
  const sec = String(c.section || '').toUpperCase().trim();
  const grade = String(c.name || c.className || c.grade || c.class || '').trim();
  if (sec === 'E') return true;
  if (['6', '7', '8'].includes(grade) && sec === 'C') return true;
  return false;
}

// Helper to match a student to the correct subject among multiple optional subjects
function matchSubjectForStudent(student, subs) {
  if (!student || !subs || subs.length === 0) return null;

  // 1. Check registered UP Board subject codes (e.g. from Excel import)
  if (student.subjects && Array.isArray(student.subjects) && student.subjects.length > 0) {
    for (const sub of subs) {
      if (sub.code && student.subjects.includes(String(sub.code).trim())) {
        return sub;
      }
      const sName = (sub.name || '').toUpperCase().trim();
      if (student.subjects.some((sj) => {
        const sjStr = String(sj).toUpperCase().trim();
        return sjStr === sName || sjStr.includes(sName) || sName.includes(sjStr);
      })) {
        return sub;
      }
    }
  }

  // 2. Check student's class subject string (from Class Manager input or student record)
  const subStr = String(student.subject || '').toLowerCase().trim();
  if (subStr) {
    for (const sub of subs) {
      const sName = sub.name.toLowerCase();
      const sCode = String(sub.code || '');
      if (subStr.includes(sName) || sName.includes(subStr) || (sCode && subStr.includes(sCode))) {
        return sub;
      }
      const upInfo = sub.code ? UP_BOARD_SUBJECT_CODES[sub.code] : null;
      if (upInfo && (subStr.includes(upInfo.name) || subStr.includes(upInfo.englishName.toLowerCase()))) {
        return sub;
      }
    }
  }

  // 3. Match on section convention (UP Board standard stream sections)
  const sec = String(student.section || '').toUpperCase().trim();
  const grade = String(student.className || student.grade || student.name || '').trim();

  // For 6th to 8th: Section A = Computer, Section B = Commerce & Art, Section C = English Medium
  if (['6', '7', '8'].includes(grade)) {
    if (sec === 'A') {
      const compSub = subs.find((s) => s.name.toUpperCase().includes('COMPUTER') || s.code === '941' || s.code === '144');
      if (compSub) return compSub;
    } else if (sec === 'B') {
      const stSub = String(student.subject || '').toUpperCase();
      if (stSub.includes('ART')) {
        const artSub = subs.find((s) => s.name.toUpperCase().includes('ART') || s.code === '936');
        if (artSub) return artSub;
      }
      if (stSub.includes('COMMERCE')) {
        const comSub = subs.find((s) => s.name.toUpperCase().includes('COMMERCE') || s.code === '935');
        if (comSub) return comSub;
      }
      const comSub = subs.find((s) => s.name.toUpperCase().includes('COMMERCE') || s.code === '935');
      const artSub = subs.find((s) => s.name.toUpperCase().includes('ART') || s.code === '936');
      if (comSub && artSub) {
        return (Number(student.rollNo || 0) % 2 === 0) ? comSub : artSub;
      }
      if (comSub) return comSub;
      if (artSub) return artSub;
    } else if (sec === 'C') {
      const compSub = subs.find((s) => s.name.toUpperCase().includes('COMPUTER') || s.code === '941');
      if (compSub) return compSub;
      return subs[0];
    }
  }

  // For 9th to 12th:
  if (sec === 'A' || sec === 'E') {
    const compSub = subs.find((s) => s.name.toUpperCase().includes('COMPUTER') || s.code === '941');
    if (compSub) return compSub;
    const mathSub = subs.find((s) => s.name.toUpperCase().includes('MATH') || s.code === '131');
    if (mathSub) return mathSub;
    const phySub = subs.find((s) => s.name.toUpperCase().includes('PHYSICS') || s.code === '151' || s.name.toUpperCase().includes('CHEMISTRY') || s.code === '152');
    if (phySub) return phySub;
  } else if (sec === 'B') {
    const artSub = subs.find((s) => s.name.toUpperCase().includes('ART') || s.code === '936');
    if (artSub) return artSub;
    const bioSub = subs.find((s) => s.name.toUpperCase().includes('BIO') || s.code === '153');
    if (bioSub) return bioSub;
    const phySub = subs.find((s) => s.name.toUpperCase().includes('PHYSICS') || s.code === '151' || s.name.toUpperCase().includes('CHEMISTRY') || s.code === '152');
    if (phySub) return phySub;
  } else if (sec === 'C') {
    const comSub = subs.find((s) => s.name.toUpperCase().includes('COMMERCE') || s.code === '935');
    if (comSub) return comSub;
    const accSub = subs.find((s) => s.name.toUpperCase().includes('ACCOUNTANCY') || s.code === '156' || s.name.toUpperCase().includes('BUSS') || s.code === '157');
    if (accSub) return accSub;
  }

  return null;
}

// Calculate paper demand and medium breakdown for a specific subject
function getSubjectDemand(grade, sub, subList, gradeClasses, allGradeStudents, totalStudentsInGrade, customSplits, splitKey) {
  const countSubjects = subList.length;
  const sUpper = (sub.name || '').toUpperCase().trim();
  const sCode = String(sub.code || '').trim();

  let papers = 0;
  let hindiCount = 0;
  let englishCount = 0;
  let isExact = false;

  if (countSubjects === 1) {
    // 100% of the class takes this single common subject (e.g. Science, Hindi, English, SST, or COMMERCE / COMPUTER)
    papers = totalStudentsInGrade;
    isExact = true;
    if (allGradeStudents.length > 0) {
      allGradeStudents.forEach((st) => {
        if (isSectionEnglish(st)) englishCount++;
        else hindiCount++;
      });
    } else {
      gradeClasses.forEach((c) => {
        const isEng = isSectionEnglish(c);
        const cnt = Number(c.totalStudents) || 0;
        if (isEng) englishCount += cnt;
        else hindiCount += cnt;
      });
    }
  } else if (allGradeStudents.length > 0) {
    // Exact student matching from uploaded student records
    const matchingStudents = allGradeStudents.filter((st) => {
      if (sub.code && st.subjects && st.subjects.includes(String(sub.code).trim())) return true;
      const matched = matchSubjectForStudent(st, subList);
      return matched && (matched.code === sub.code && matched.name === sub.name);
    });

    if (matchingStudents.length > 0) {
      isExact = true;
      matchingStudents.forEach((st) => {
        if (isSectionEnglish(st)) englishCount++;
        else hindiCount++;
      });
      papers = matchingStudents.length;
      if (splitKey && customSplits && customSplits[splitKey] !== undefined) {
        papers = Number(customSplits[splitKey]) || 0;
        const tot = (hindiCount + englishCount) || 1;
        englishCount = Math.round((englishCount / tot) * papers);
        hindiCount = papers - englishCount;
      }
    } else {
      papers = 0;
    }
  } else {
    // Check section conventions or subject strings
    const matchingClasses = gradeClasses.filter((c) => {
      const cSub = String(c.subject || '').toUpperCase().trim();
      const sec = String(c.section || '').toUpperCase().trim();
      if (cSub && cSub !== 'GENERAL' && (cSub.includes(sUpper) || sUpper.includes(cSub) || (sCode && cSub.includes(sCode)))) {
        return true;
      }
      if (grade === '6' || grade === '7' || grade === '8') {
        if (sec === 'A' && (sUpper.includes('COMPUTER') || sCode === '941' || sCode === '144')) return true;
        if (sec === 'B' && (sUpper.includes('COMMERCE') || sUpper.includes('ART') || sCode === '935' || sCode === '936')) return true;
        if (sec === 'C' && (sUpper.includes('ENGLISH') || isSectionEnglish(c))) return true;
        if (sUpper.includes('COMPUTER') && (sUpper.includes('COMMERCE') || sUpper.includes('ART'))) return true;
      } else if (grade === '9' || grade === '10') {
        if ((sec === 'A' || sec === 'E') && (sUpper.includes('COMPUTER') || sCode === '941')) return true;
        if (sec === 'B' && (sUpper.includes('ART') || sUpper.includes('DRAWING') || sCode === '936')) return true;
        if (sec === 'C' && (sUpper.includes('COMMERCE') || sCode === '935')) return true;
      } else if (grade === '11' || grade === '12') {
        if ((sec === 'A' || sec === 'E') && (sUpper.includes('MATH') || sCode === '131')) return true;
        if ((sec === 'A' || sec === 'B' || sec === 'E') && (sUpper.includes('PHYSICS') || sCode === '151' || sUpper.includes('CHEMISTRY') || sCode === '152')) return true;
        if (sec === 'B' && (sUpper.includes('BIO') || sCode === '153')) return true;
        if (sec === 'C' && (sUpper.includes('COMMERCE') || sUpper.includes('ACC') || sUpper.includes('BUSS') || sCode === '156' || sCode === '157')) return true;
      }
      return false;
    });

    if (matchingClasses.length > 0) {
      isExact = true;
      matchingClasses.forEach((c) => {
        const isEng = isSectionEnglish(c);
        let cnt = Number(c.totalStudents) || 0;
        const sec = String(c.section || '').toUpperCase().trim();

        // If 6th-8th Section B is mixed Commerce and Art, split between them until individual student list is uploaded
        if (['6', '7', '8'].includes(grade) && sec === 'B') {
          const hasCommerce = subList.some((s) => (s.name || '').toUpperCase().includes('COMMERCE') || s.code === '935');
          const hasArt = subList.some((s) => (s.name || '').toUpperCase().includes('ART') || s.code === '936' || (s.name || '').toUpperCase().includes('DRAWING'));
          if (hasCommerce && hasArt) {
            if (sUpper.includes('COMMERCE') || sCode === '935') {
              cnt = Math.ceil(cnt / 2);
            } else if (sUpper.includes('ART') || sCode === '936') {
              cnt = Math.floor(cnt / 2);
            }
          }
        }

        if (isEng) englishCount += cnt;
        else hindiCount += cnt;
      });
      papers = hindiCount + englishCount;

      if (splitKey && customSplits && customSplits[splitKey] !== undefined) {
        papers = Number(customSplits[splitKey]) || 0;
        const tot = (hindiCount + englishCount) || 1;
        englishCount = Math.round((englishCount / tot) * papers);
        hindiCount = papers - englishCount;
      }
    } else {
      if (splitKey && customSplits && customSplits[splitKey] !== undefined) {
        papers = Number(customSplits[splitKey]) || 0;
      } else {
        papers = Math.round(totalStudentsInGrade / countSubjects);
      }
      let engTotal = 0;
      let hinTotal = 0;
      gradeClasses.forEach((c) => {
        const isEng = isSectionEnglish(c);
        if (isEng) engTotal += Number(c.totalStudents) || 0;
        else hinTotal += Number(c.totalStudents) || 0;
      });
      const tot = (engTotal + hinTotal) || 1;
      englishCount = Math.round((engTotal / tot) * papers);
      hindiCount = papers - englishCount;
    }
  }

  return {
    papers: Math.max(0, papers),
    hindiCount: Math.max(0, hindiCount),
    englishCount: Math.max(0, englishCount),
    isExact,
  };
}

export default function ExamSchemeManager({ 
  seatingResult, 
  activeShift = 'shift_1',
  classes = [],
  examDetails,
  setExamDetails,
  dutyRoster = {},
  teachers = []
}) {
  const [selectedDateId, setSelectedDateId] = useState('d1'); // Default to 31-10-26
  const [activeSubView, setActiveSubView] = useState('demand'); // 'demand', 'envelopes', 'full-scheme', 'codes'
  
  // Custom manual splits for optional multi-subjects on the selected day
  // Structure: { [dateId_class_subjectCode]: number }
  const [customSplits, setCustomSplits] = useState({});

  const selectedDay = useMemo(() => {
    return EXAM_TIMETABLE.find((d) => d.id === selectedDateId) || EXAM_TIMETABLE[0];
  }, [selectedDateId]);

  // Aggregate total students per class base number from current classes in state
  const classTotals = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      const grade = c.name;
      map[grade] = (map[grade] || 0) + (Number(c.totalStudents) || 0);
    });
    return map;
  }, [classes]);

  // Calculate paper requirements for selected day & shift
  const paperDemand = useMemo(() => {
    const daySubjects = selectedDay[activeShift] || {};
    const items = [];
    let grandTotal = 0;
    let grandHindiTotal = 0;
    let grandEnglishTotal = 0;

    Object.entries(daySubjects).forEach(([grade, subList]) => {
      const totalStudentsInGrade = classTotals[grade] || 0;
      const countSubjects = subList.length;

      const gradeClasses = classes.filter((c) => String(c.name).trim() === grade);
      const allGradeStudents = gradeClasses.flatMap((c) => c.studentList || []);

      subList.forEach((sub) => {
        const splitKey = `${selectedDay.id}_${grade}_${sub.code || sub.name}`;
        const demand = getSubjectDemand(
          grade,
          sub,
          subList,
          gradeClasses,
          allGradeStudents,
          totalStudentsInGrade,
          customSplits,
          splitKey
        );

        const upBoardInfo = sub.code ? UP_BOARD_SUBJECT_CODES[sub.code] : null;

        items.push({
          grade,
          subjectName: sub.name,
          hindiName: upBoardInfo ? upBoardInfo.name : sub.name,
          code: sub.code || '—',
          totalGradeStudents: totalStudentsInGrade,
          paperCount: demand.papers,
          hindiCount: demand.hindiCount,
          englishCount: demand.englishCount,
          isMultiple: countSubjects > 1,
          isExactFromData: demand.isExact,
          splitKey,
        });

        grandTotal += demand.papers;
        grandHindiTotal += demand.hindiCount;
        grandEnglishTotal += demand.englishCount;
      });
    });

    return { items, grandTotal, grandHindiTotal, grandEnglishTotal };
  }, [selectedDay, activeShift, classTotals, customSplits, classes]);

  // Aggregate college-wide medium breakdown per grade and overall
  const collegeMediumStats = useMemo(() => {
    let grandHindi = 0;
    let grandEnglish = 0;
    let grandTotal = 0;

    const gradeMap = {};

    classes.forEach((c) => {
      const g = String(c.name).trim();
      if (!gradeMap[g]) {
        gradeMap[g] = {
          grade: g,
          sections: [],
          hindiCount: 0,
          englishCount: 0,
          total: 0,
        };
      }

      const secName = c.section ? `${c.section}` : '';
      if (secName && !gradeMap[g].sections.includes(secName)) {
        gradeMap[g].sections.push(secName);
      }

      let h = 0;
      let e = 0;

      if (c.studentList && c.studentList.length > 0) {
        c.studentList.forEach((st) => {
          if (isSectionEnglish(st)) e++;
          else h++;
        });
      } else {
        const isEng = isSectionEnglish(c);
        const count = Number(c.totalStudents) || 0;
        if (isEng) e += count;
        else h += count;
      }

      gradeMap[g].hindiCount += h;
      gradeMap[g].englishCount += e;
      gradeMap[g].total += (h + e);

      grandHindi += h;
      grandEnglish += e;
      grandTotal += (h + e);
    });

    const list = Object.values(gradeMap).sort((a, b) => {
      return (parseInt(a.grade) || 0) - (parseInt(b.grade) || 0);
    });

    return {
      list,
      grandHindi,
      grandEnglish,
      grandTotal,
    };
  }, [classes]);

  // Overall schedule paper demand across every exam date for both mediums
  const overallTimetableDemand = useMemo(() => {
    return EXAM_TIMETABLE.map((d) => {
      const daySubjects = d[activeShift] || {};
      let dayTotal = 0;
      let dayHindi = 0;
      let dayEnglish = 0;
      const classSummaries = [];

      Object.entries(daySubjects).forEach(([grade, subList]) => {
        const gradeClasses = classes.filter((c) => String(c.name).trim() === grade);
        const allGradeStudents = gradeClasses.flatMap((c) => c.studentList || []);
        const totalStudentsInGrade = classTotals[grade] || 0;

        subList.forEach((sub) => {
          const splitKey = `${d.id}_${grade}_${sub.code || sub.name}`;
          const demand = getSubjectDemand(
            grade,
            sub,
            subList,
            gradeClasses,
            allGradeStudents,
            totalStudentsInGrade,
            customSplits,
            splitKey
          );

          dayTotal += demand.papers;
          dayHindi += demand.hindiCount;
          dayEnglish += demand.englishCount;
        });

        classSummaries.push({
          grade,
          subjects: subList.map((s) => s.name).join(' / '),
        });
      });

      return {
        id: d.id,
        date: d.date,
        day: d.day,
        total: dayTotal,
        hindi: dayHindi,
        english: dayEnglish,
        classSummaries,
      };
    });
  }, [classes, classTotals, activeShift, customSplits]);

  // Sync current exam date with the App's examDetails
  const handleApplyDateToApp = (dayObj) => {
    if (setExamDetails) {
      setExamDetails((prev) => ({
        ...prev,
        date: dayObj.fullDate,
      }));
    }
  };

  // Room-wise paper packets calculation
  // Computes how many papers of each subject are needed in each room for the selected date
  const roomPackets = useMemo(() => {
    if (!seatingResult || !seatingResult.rooms) return [];
    const daySubjects = selectedDay[activeShift] || {};

    return seatingResult.rooms
      .filter((room) => (room.students && room.students.length > 0) || (room.seatedCount > 0))
      .map((room) => {
        // Group students in this room by their className ('9', '10', '11', '12', etc.)
        const seatedClassesMap = {}; // { '9': studentCount, '10': studentCount, ... }
        (room.students || []).forEach((st) => {
          const g = String(st.className).trim();
          seatedClassesMap[g] = (seatedClassesMap[g] || 0) + 1;
        });

        // Map to subjects for this room based on selected day's timetable
        const packetSubjects = [];
        let totalRoomPapers = 0;
        let totalRoomHindi = 0;
        let totalRoomEnglish = 0;

        Object.entries(seatedClassesMap).forEach(([grade, seatedCount]) => {
          const subs = daySubjects[grade] || [];
          const studentsOfGrade = (room.students || []).filter((st) => String(st.className).trim() === grade);

          if (subs.length === 0) {
            let hCount = 0;
            let eCount = 0;
            studentsOfGrade.forEach((st) => {
              if (isSectionEnglish(st)) eCount++;
              else hCount++;
            });
            packetSubjects.push({
              grade,
              subjectName: 'General Exam',
              hindiName: 'सामान्य परीक्षा',
              code: '—',
              count: seatedCount,
              hindiCount: hCount,
              englishCount: eCount,
            });
            totalRoomPapers += seatedCount;
            totalRoomHindi += hCount;
            totalRoomEnglish += eCount;
          } else if (subs.length === 1) {
            const s = subs[0];
            const upBoardInfo = s.code ? UP_BOARD_SUBJECT_CODES[s.code] : null;
            let hCount = 0;
            let eCount = 0;
            studentsOfGrade.forEach((st) => {
              if (isSectionEnglish(st)) eCount++;
              else hCount++;
            });
            packetSubjects.push({
              grade,
              subjectName: s.name,
              hindiName: upBoardInfo ? upBoardInfo.name : s.name,
              code: s.code || '—',
              count: seatedCount,
              hindiCount: hCount,
              englishCount: eCount,
            });
            totalRoomPapers += seatedCount;
            totalRoomHindi += hCount;
            totalRoomEnglish += eCount;
          } else {
            // Multiple optional subjects in this room (e.g. Math vs Bio or Commerce/Computer/Art)
            const subjectCountMap = {};
            const subjectHindiMap = {};
            const subjectEngMap = {};

            subs.forEach((s) => {
              const k = s.code || s.name;
              subjectCountMap[k] = 0;
              subjectHindiMap[k] = 0;
              subjectEngMap[k] = 0;
            });

            let unmatchedStudents = [];

            studentsOfGrade.forEach((st) => {
              const matchedSub = matchSubjectForStudent(st, subs);
              if (matchedSub) {
                const key = matchedSub.code || matchedSub.name;
                subjectCountMap[key] = (subjectCountMap[key] || 0) + 1;
                if (isSectionEnglish(st)) subjectEngMap[key] = (subjectEngMap[key] || 0) + 1;
                else subjectHindiMap[key] = (subjectHindiMap[key] || 0) + 1;
              } else {
                unmatchedStudents.push(st);
              }
            });

            // If any student was unmatched, distribute remainder so sum === seatedCount
            if (unmatchedStudents.length > 0) {
              const subKeys = subs.map((s) => s.code || s.name);
              unmatchedStudents.forEach((st, idx) => {
                const k = subKeys[idx % subKeys.length];
                subjectCountMap[k]++;
                if (isSectionEnglish(st)) subjectEngMap[k]++;
                else subjectHindiMap[k]++;
              });
            }

            // Push each subject into packet ONLY if count > 0!
            subs.forEach((s) => {
              const k = s.code || s.name;
              const count = subjectCountMap[k] || 0;
              if (count > 0) {
                const upBoardInfo = s.code ? UP_BOARD_SUBJECT_CODES[s.code] : null;
                const hCount = subjectHindiMap[k] || 0;
                const eCount = subjectEngMap[k] || 0;
                packetSubjects.push({
                  grade,
                  subjectName: s.name,
                  hindiName: upBoardInfo ? upBoardInfo.name : s.name,
                  code: s.code || '—',
                  count: count,
                  hindiCount: hCount,
                  englishCount: eCount,
                  isExact: true,
                });
                totalRoomPapers += count;
                totalRoomHindi += hCount;
                totalRoomEnglish += eCount;
              }
            });
          }
        });

        return {
          roomId: room.roomId || room.id,
          roomName: room.roomName || room.name || 'Room',
          totalSeated: room.seatedCount || room.students?.length || totalRoomPapers,
          totalRoomPapers,
          totalRoomHindi,
          totalRoomEnglish,
          benches: room.benchesCount || room.benches?.length || 20,
          packetSubjects,
        };
      });
  }, [seatingResult, selectedDay, activeShift, classTotals, customSplits]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  परीक्षा स्कीम व प्रश्न-पत्र गणना (Exam Scheme & Paper Demand)
                </h2>
                <p className="text-xs text-slate-500">
                  {EXAM_SCHEME_METADATA.schoolName} • {EXAM_SCHEME_METADATA.examTitle}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-view switcher tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubView('demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'demand'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>दैनिक पेपर मांग</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('envelopes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'envelopes'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>कमरेवार लिफाफा पर्ची</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('full-scheme')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'full-scheme'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>संपूर्ण टाइम टेबल</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('codes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'codes'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>विषय कोड सूची</span>
            </button>
          </div>
        </div>

        {/* Date Selector Pills (Visible on Demand & Envelopes views) */}
        {(activeSubView === 'demand' || activeSubView === 'envelopes') && (
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>परीक्षा की तारीख चुनें (Select Exam Date):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                वर्तमान शिफ्ट: <strong className="text-indigo-700">{activeShift === 'shift_1' ? '1st Meeting (9th-12th)' : '2nd Meeting (6th-8th)'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {EXAM_TIMETABLE.map((d) => {
                const isSelected = selectedDateId === d.id;
                const hasExams = Boolean(d[activeShift] && Object.keys(d[activeShift]).length > 0);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDateId(d.id);
                      handleApplyDateToApp(d);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/20'
                        : hasExams
                        ? 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70'
                        : 'border-slate-100 bg-slate-50/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black tracking-tight ${
                        isSelected ? 'text-indigo-950' : 'text-slate-800'
                      }`}>
                        {d.date}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      )}
                    </div>
                    <span className={`block text-[10px] font-bold uppercase mt-0.5 ${
                      isSelected ? 'text-indigo-600' : 'text-slate-500'
                    }`}>
                      {d.day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUB-VIEW 1: DAILY PAPER DEMAND (दैनिक पेपर मांग)           */}
      {/* ========================================================= */}
      {activeSubView === 'demand' && (
        <div className="space-y-6 print:space-y-3">
          {/* Official Print Header (Only visible on paper / PDF printout) */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">
              OFFICIAL QUESTION PAPER REQUISITION
            </span>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 mt-0.5">
              {EXAM_SCHEME_METADATA.schoolName}
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              {EXAM_SCHEME_METADATA.examTitle}
            </h2>
            <div className="text-xs sm:text-sm font-black text-indigo-950 mt-1 uppercase underline underline-offset-2">
              दैनिक प्रश्न-पत्र आवश्यकता मांग-पत्र (Daily Question Paper Demand Slip)
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mt-2.5 px-2 bg-slate-50 py-1 rounded border border-slate-300">
              <span>दिनांक: <strong>{selectedDay.date} ({selectedDay.day})</strong></span>
              <span>शिफ्ट: <strong>{activeShift === 'shift_1' ? EXAM_SCHEME_METADATA.shift1Time : EXAM_SCHEME_METADATA.shift2Time}</strong></span>
              <span>
                कुल मांग: <strong className="text-black">{paperDemand.grandTotal} प्रतियां</strong> (हिन्दी: {paperDemand.grandHindiTotal} | Eng: {paperDemand.grandEnglishTotal})
              </span>
            </div>
          </div>

          {/* Paper Demand Header & Summary (Screen only, hidden on print) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 rounded-lg text-xs font-black">
                  {selectedDay.date} ({selectedDay.day})
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {activeShift === 'shift_1' ? EXAM_SCHEME_METADATA.shift1Time : EXAM_SCHEME_METADATA.shift2Time}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-800 mt-1">
                दैनिक प्रश्न-पत्र आवश्यकता मांग पत्र (Question Paper Requirement)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-emerald-700">कुल प्रश्न-पत्र</span>
                <span className="text-base font-black text-emerald-900">{paperDemand.grandTotal}</span>
              </div>
              <div className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-orange-700">हिन्दी माध्यम</span>
                <span className="text-base font-black text-orange-900">{paperDemand.grandHindiTotal}</span>
              </div>
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-blue-700">English Med.</span>
                <span className="text-base font-black text-blue-900">{paperDemand.grandEnglishTotal}</span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-4 h-4" />
                <span>प्रिंट मांग-पत्र</span>
              </button>
            </div>
          </div>

          {/* Table of Subjects & Paper Count */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-400 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs min-w-[760px] print:min-w-0 print:w-full print:table-fixed border-collapse print:text-[11px]">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 print:bg-slate-200/80 print:text-black print:border-b-2 print:border-slate-500">
                  <tr>
                    <th className="px-3 py-3 w-16 print:w-[9%] text-center print:px-1 print:py-2 print:border-r print:border-slate-300">
                      कक्षा
                    </th>
                    <th className="px-3 py-3 w-20 print:w-[11%] text-center print:px-1 print:py-2 print:border-r print:border-slate-300">
                      विषय कोड
                    </th>
                    <th className="px-4 py-3 print:w-[32%] print:px-2 print:py-2 print:border-r print:border-slate-300">
                      विषय का नाम (Subject Name)
                    </th>
                    <th className="px-3 py-3 w-24 print:w-[11%] text-center print:px-1 print:py-2 print:border-r print:border-slate-300">
                      पंजीकृत छात्र
                    </th>
                    <th className="px-3 py-3 w-28 print:w-[13%] text-center text-orange-800 print:text-black print:px-1 print:py-2 print:border-r print:border-slate-300 whitespace-nowrap">
                      हिन्दी माध्यम
                    </th>
                    <th className="px-3 py-3 w-28 print:w-[13%] text-center text-blue-800 print:text-black print:px-1 print:py-2 print:border-r print:border-slate-300 whitespace-nowrap">
                      English Med.
                    </th>
                    <th className="px-3 py-3 w-28 print:w-[11%] text-center print:px-1 print:py-2 whitespace-nowrap">
                      कुल प्रश्न-पत्र
                    </th>
                    <th className="px-3 py-3 w-20 text-center print:hidden">
                      प्रारूप
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300 font-medium">
                  {paperDemand.items.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-400 print:py-4">
                        इस तारीख पर इस शिफ्ट की कोई परीक्षा निर्धारित नहीं है।
                      </td>
                    </tr>
                  ) : (
                    paperDemand.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors print:hover:bg-transparent">
                        <td className="px-3 py-2.5 text-center print:px-1 print:py-1.5 print:border-r print:border-slate-300">
                          <span className="px-2 py-0.5 bg-slate-100 rounded font-black text-slate-800 text-xs print:bg-transparent print:p-0 print:text-black">
                            {item.grade}th
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center print:px-1 print:py-1.5 print:border-r print:border-slate-300">
                          {item.code !== '—' ? (
                            <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded text-xs print:bg-transparent print:border-none print:p-0 print:text-black">
                              {item.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 print:px-2 print:py-1.5 print:border-r print:border-slate-300 print:text-black">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{item.subjectName}</span>
                            {item.hindiName && item.hindiName !== item.subjectName && (
                              <span className="text-[11px] text-slate-500 font-normal print:text-slate-700">
                                ({item.hindiName})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-600 font-bold print:px-1 print:py-1.5 print:border-r print:border-slate-300 print:text-black">
                          {item.totalGradeStudents}
                        </td>
                        <td className="px-3 py-2.5 text-center print:px-1 print:py-1.5 print:border-r print:border-slate-300">
                          <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-800 font-bold rounded text-xs print:bg-transparent print:border-none print:p-0 print:text-black whitespace-nowrap">
                            {item.hindiCount} प्रतियां
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center print:px-1 print:py-1.5 print:border-r print:border-slate-300">
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded text-xs print:bg-transparent print:border-none print:p-0 print:text-black whitespace-nowrap">
                            {item.englishCount} प्रतियां
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center print:px-1 print:py-1.5">
                          {item.isMultiple ? (
                            <>
                              <div className="flex items-center justify-center gap-1 no-print">
                                <input
                                  type="number"
                                  value={item.paperCount}
                                  onChange={(e) => handleSplitChange(item.splitKey, e.target.value)}
                                  className="w-16 px-1.5 py-1 border border-indigo-300 rounded-lg text-center font-black text-indigo-700 bg-indigo-50/50 focus:outline-indigo-500 text-xs"
                                  title="संख्या संपादित करें"
                                />
                                <span className="text-[10px] text-slate-400">कुल</span>
                              </div>
                              <span className="hidden print:inline font-black text-black whitespace-nowrap">
                                {item.paperCount} प्रतियां
                              </span>
                            </>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded text-xs print:bg-transparent print:border-none print:p-0 print:text-black whitespace-nowrap">
                              {item.paperCount} प्रतियां
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center print:hidden">
                          {item.isMultiple ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                              वैकल्पिक
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              अनिवार्य
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Print-only Official Totals Row */}
                  <tr className="hidden print:table-row bg-slate-100 font-black text-black text-[11px] border-t-2 border-slate-400">
                    <td colSpan="4" className="py-2 px-2 text-left uppercase tracking-wider print:border-r print:border-slate-300">
                      दैनिक महायोग (Total Demand For Shift)
                    </td>
                    <td className="py-2 px-1 text-center print:border-r print:border-slate-300 whitespace-nowrap">
                      {paperDemand.grandHindiTotal} प्रतियां
                    </td>
                    <td className="py-2 px-1 text-center print:border-r print:border-slate-300 whitespace-nowrap">
                      {paperDemand.grandEnglishTotal} प्रतियां
                    </td>
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      {paperDemand.grandTotal} प्रतियां
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note & Summary Bar */}
            <div className="p-4 print:p-2 bg-slate-50 border-t border-slate-200 print:border-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 print:text-black print:text-[10px]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 print:hidden" />
                <span>
                  <strong>माध्यम विवरण:</strong> कॉलेज में चलने वाले दोनों माध्यमों (हिंदी व अंग्रेजी) की प्रतियों की अलग-अलग गिनती तैयार है।
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap font-bold">
                <span>कुल बंडल: <strong className="text-slate-900 print:text-black">{paperDemand.grandTotal}</strong></span>
                <span>(हिन्दी: <strong className="text-orange-700 print:text-black">{paperDemand.grandHindiTotal}</strong> | Eng: <strong className="text-blue-700 print:text-black">{paperDemand.grandEnglishTotal}</strong>)</span>
                <span>+ 5% रिज़र्व: <strong className="text-indigo-700 print:text-black">{Math.ceil(paperDemand.grandTotal * 1.05)}</strong></span>
              </div>
            </div>
          </div>

          {/* Official Signatures for Printout */}
          <div className="hidden print:flex items-end justify-between pt-12 pb-2 px-6 text-xs font-bold text-slate-800">
            <div className="text-center space-y-1">
              <div className="w-36 border-t border-slate-800"></div>
              <span>ह० परीक्षा प्रभारी</span>
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
      {/* SUB-VIEW 2: ROOM-WISE ENVELOPE SLIPS (कमरेवार लिफाफा पर्ची) */}
      {/* ========================================================= */}
      {activeSubView === 'envelopes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                कक्षवार प्रश्न-पत्र लिफाफा पर्चियां (Room Envelope / Packet Slips)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                तारीख: <strong>{selectedDay.date} ({selectedDay.day})</strong> • {activeShift === 'shift_1' ? '1st Shift' : '2nd Shift'}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट सभी लिफाफा पर्चियां</span>
            </button>
          </div>

          {/* Envelope Slips Grid (Neat 2-Column Cards for Printing / Cutting) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomPackets.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                इस तारीख पर कोई आवंटित कमरे नहीं मिले।
              </div>
            ) : (
              roomPackets.map((rp) => (
                <div
                  key={rp.roomId}
                  className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-4 shadow-2xs flex flex-col justify-between break-inside-avoid hover:border-indigo-400 transition-colors"
                >
                  <div>
                    {/* Slip Header */}
                    <div className="flex items-start justify-between pb-2.5 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {EXAM_SCHEME_METADATA.schoolName}
                        </span>
                        <h4 className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <span>📦</span>
                          <span>{rp.roomName}</span>
                          <span className="text-xs font-semibold text-slate-500">
                            (प्रश्न-पत्र पैकेट)
                          </span>
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 block">
                          {selectedDay.date} ({selectedDay.day})
                        </span>
                        <span className="text-xs text-indigo-700 font-black block mt-0.5">
                          कुल: {rp.totalSeated} छात्र ({rp.totalRoomPapers} पेपर)
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-800 rounded font-bold text-[10px]">
                            हिन्दी: {rp.totalRoomHindi}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded font-bold text-[10px]">
                            English: {rp.totalRoomEnglish}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subject details inside this room */}
                    <div className="py-2.5 space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        लिफाफे में रखे जाने वाले पेपर:
                      </span>
                      {rp.packetSubjects.map((ps, sidx) => (
                        <div
                          key={sidx}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-200/70"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-900 bg-indigo-100/70 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                              कक्षा {ps.grade}th
                            </span>
                            <span className="font-bold text-slate-800">
                              {ps.subjectName}
                            </span>
                            {ps.hindiName && ps.hindiName !== ps.subjectName && (
                              <span className="text-[10px] text-slate-500">
                                ({ps.hindiName})
                              </span>
                            )}
                            {ps.code !== '—' && (
                              <span className="text-[9px] font-mono font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.2 rounded shadow-2xs">
                                Code {ps.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(ps.hindiCount > 0 || ps.englishCount > 0) && (
                              <div className="flex items-center gap-1">
                                {ps.hindiCount > 0 && (
                                  <span className="font-bold text-orange-800 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[10px]">
                                    हिन्दी: {ps.hindiCount}
                                  </span>
                                )}
                                {ps.englishCount > 0 && (
                                  <span className="font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                                    Eng: {ps.englishCount}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="font-black text-slate-900 text-xs">
                              {ps.count} {ps.isApprox ? '≈' : ''} प्रतियां
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slip Signatures Footer with Assigned Teacher */}
                  {(() => {
                    const dayAlloc = dutyRoster[`${selectedDay.id}_${activeShift}`]?.rooms?.[rp.roomId];
                    const t1 = teachers.find((t) => t.id === dayAlloc?.invigilator1);
                    const t2 = teachers.find((t) => t.id === dayAlloc?.invigilator2);
                    return (
                      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                        <span>ह० परीक्षा प्रभारी: _________________</span>
                        <span>
                          ह० कक्ष निरीक्षक:{' '}
                          {t1 ? (
                            <strong className="text-indigo-950 font-black">
                              {t1.name}{t2 ? ` / ${t2.name}` : ''}
                            </strong>
                          ) : (
                            '_________________'
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 3: FULL TIME-TABLE (A4 संपूर्ण परीक्षा स्कीम)     */}
      {/* ========================================================= */}
      {activeSubView === 'full-scheme' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          {/* Print button on top right */}
          <div className="flex justify-end no-print">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट ऑफिशियल टाइम टेबल (A4)</span>
            </button>
          </div>

          {/* Official Scheme Header matching user's paper */}
          <div className="text-center space-y-1 border-b pb-4">
            <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 uppercase">
              {EXAM_SCHEME_METADATA.examTitle}
            </h2>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-wide">
              {EXAM_SCHEME_METADATA.schoolName}
            </h3>
          </div>

          {/* Time Table Split: 1st Meeting (Left) & 2nd Meeting (Right) */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 font-bold">
                  <th colSpan="6" className="py-2 border-r border-slate-300 text-slate-800">
                    {EXAM_SCHEME_METADATA.shift1Time}
                  </th>
                  <th colSpan="4" className="py-2 text-slate-800">
                    {EXAM_SCHEME_METADATA.shift2Time}
                  </th>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50 font-bold text-[11px] text-slate-700">
                  <th className="py-2 px-1 border-r border-slate-300 w-20">DATE</th>
                  <th className="py-2 px-1 border-r border-slate-300 w-24">DAY</th>
                  <th className="py-2 px-1 border-r border-slate-300">CLASS - 9</th>
                  <th className="py-2 px-1 border-r border-slate-300">CLASS - 10</th>
                  <th className="py-2 px-1 border-r border-slate-300">CLASS - 11</th>
                  <th className="py-2 px-1 border-r-2 border-slate-400">CLASS - 12</th>
                  <th className="py-2 px-1 border-r border-slate-300">CLASS - 6</th>
                  <th className="py-2 px-1 border-r border-slate-300">CLASS - 7</th>
                  <th className="py-2 px-1">CLASS - 8</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px] font-semibold text-slate-800">
                {EXAM_TIMETABLE.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-1 border-r border-slate-300 font-bold">{row.date}</td>
                    <td className="py-2.5 px-1 border-r border-slate-300 font-medium">{row.day}</td>
                    
                    {/* Shift 1 (9 to 12) */}
                    <td className="py-2.5 px-1 border-r border-slate-300 bg-blue-50/20">
                      {(row.shift_1['9'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-1 border-r border-slate-300 bg-blue-50/20">
                      {(row.shift_1['10'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-1 border-r border-slate-300 bg-blue-50/20">
                      {(row.shift_1['11'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-1 border-r-2 border-slate-400 bg-blue-50/20">
                      {(row.shift_1['12'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>

                    {/* Shift 2 (6 to 8) */}
                    <td className="py-2.5 px-1 border-r border-slate-300 bg-teal-50/20">
                      {(row.shift_2['6'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-1 border-r border-slate-300 bg-teal-50/20">
                      {(row.shift_2['7'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-1 bg-teal-50/20">
                      {(row.shift_2['8'] || []).map((s) => s.name).join(' / ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note Section */}
          <div className="text-[11px] font-bold text-slate-800 border-t pt-3">
            <span>NOTE : - {EXAM_SCHEME_METADATA.practicalNote}</span>
          </div>

          {/* ========================================================= */}
          {/* COLLEGE MEDIUM & STUDENT STRENGTH SUMMARY                 */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>संपूर्ण कॉलेज माध्यम व छात्र संख्या सारांश (Medium-wise Student Strength)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  कॉलेज में संचालित दोनों माध्यमों (हिन्दी व अंग्रेजी) के विद्यार्थियों का कक्षावार विवरण
                </p>
              </div>

              {/* Medium Badges */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-900 rounded-lg text-xs font-bold">
                  हिन्दी माध्यम: {collegeMediumStats.grandHindi}
                </span>
                <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold">
                  English Medium: {collegeMediumStats.grandEnglish}
                </span>
                <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black">
                  कुल: {collegeMediumStats.grandTotal} छात्र
                </span>
              </div>
            </div>

            {/* Class-wise Medium Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-[11px] text-slate-700 border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 text-left">कक्षा (Class)</th>
                    <th className="py-2 px-3 text-left">सेक्शन (Sections)</th>
                    <th className="py-2 px-3 text-orange-800 bg-orange-50/50">हिन्दी माध्यम छात्र</th>
                    <th className="py-2 px-3 text-blue-800 bg-blue-50/50">अंग्रेजी माध्यम छात्र</th>
                    <th className="py-2 px-3 text-slate-900 bg-slate-50">कुल छात्र संख्या</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {collegeMediumStats.list.map((row) => (
                    <tr key={row.grade} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-left font-bold text-slate-900">
                        कक्षा {row.grade}th
                      </td>
                      <td className="py-2 px-3 text-left text-slate-600">
                        {row.sections.length > 0 ? row.sections.join(', ') : '—'}
                      </td>
                      <td className="py-2 px-3 font-bold text-orange-800 bg-orange-50/20">
                        {row.hindiCount}
                      </td>
                      <td className="py-2 px-3 font-bold text-blue-800 bg-blue-50/20">
                        {row.englishCount}
                      </td>
                      <td className="py-2 px-3 font-black text-slate-900 bg-slate-50/50">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan="2" className="py-2.5 px-3 text-left uppercase tracking-wider text-[11px]">
                      महायोग (College Total)
                    </td>
                    <td className="py-2.5 px-3 text-orange-900 bg-orange-100/50">
                      {collegeMediumStats.grandHindi} छात्र
                    </td>
                    <td className="py-2.5 px-3 text-blue-900 bg-blue-100/50">
                      {collegeMediumStats.grandEnglish} छात्र
                    </td>
                    <td className="py-2.5 px-3 text-indigo-950 bg-indigo-50">
                      {collegeMediumStats.grandTotal} छात्र
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COMPLETE DATE-WISE MEDIUM PAPER DEMAND                    */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>संपूर्ण परीक्षा तिथि अनुसार प्रश्न-पत्र मांग (Date-wise Question Paper Requirement)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                प्रत्येक परीक्षा तिथि पर हिन्दी माध्यम व अंग्रेजी माध्यम के प्रश्न-पत्रों की कुल आवश्यकता
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-100 font-bold text-[11px] text-slate-700 border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 text-left w-24">दिनांक (Date)</th>
                    <th className="py-2 px-2 text-left w-28">दिन (Day)</th>
                    <th className="py-2 px-3 text-left">कक्षाएं व विषय (Shift 1)</th>
                    <th className="py-2 px-3 text-orange-800 bg-orange-50/50 w-32">हिन्दी माध्यम प्रतियां</th>
                    <th className="py-2 px-3 text-blue-800 bg-blue-50/50 w-32">English प्रतियां</th>
                    <th className="py-2 px-3 text-slate-900 bg-slate-50 w-28">कुल प्रश्न-पत्र</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {overallTimetableDemand.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-left font-bold text-slate-900">
                        {d.date}
                      </td>
                      <td className="py-2.5 px-2 text-left text-slate-600">
                        {d.day}
                      </td>
                      <td className="py-2.5 px-3 text-left text-[11px] text-slate-700">
                        {d.classSummaries.map((cs) => `कक्षा ${cs.grade}: ${cs.subjects}`).join(' | ') || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-orange-800 bg-orange-50/20">
                        {d.hindi}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-800 bg-blue-50/20">
                        {d.english}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900 bg-slate-50/50">
                        {d.total}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Totals */}
                  <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan="3" className="py-2.5 px-3 text-left uppercase tracking-wider text-[11px]">
                      संपूर्ण परीक्षा कुल मांग (Grand Total All Days)
                    </td>
                    <td className="py-2.5 px-3 text-orange-900 bg-orange-100/50">
                      {overallTimetableDemand.reduce((sum, d) => sum + d.hindi, 0)} प्रतियां
                    </td>
                    <td className="py-2.5 px-3 text-blue-900 bg-blue-100/50">
                      {overallTimetableDemand.reduce((sum, d) => sum + d.english, 0)} प्रतियां
                    </td>
                    <td className="py-2.5 px-3 text-indigo-950 bg-indigo-50">
                      {overallTimetableDemand.reduce((sum, d) => sum + d.total, 0)} प्रतियां
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures matching paper exactly */}
          <div className="pt-8 flex items-end justify-between text-xs font-bold text-slate-800 px-6">
            <div className="text-left space-y-1">
              <span className="underline block">EXAMINATION HEAD</span>
              {EXAM_SCHEME_METADATA.authorities.examHeads.map((head, i) => (
                <span key={i} className="block text-[11px] font-medium text-slate-700">
                  {head}
                </span>
              ))}
            </div>

            <div className="text-right space-y-1">
              <span className="underline block">PRINCIPAL</span>
              <span className="block text-[11px] font-medium text-slate-700">
                {EXAM_SCHEME_METADATA.authorities.principal}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 4: SUBJECT CODES (विषय कोड तालिका)               */}
      {/* ========================================================= */}
      {activeSubView === 'codes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* High School Codes (9th & 10th) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="p-1 bg-amber-500 text-white rounded">9-10</span>
                <span>हाईस्कूल विषय कोड (High School 9th & 10th)</span>
              </h3>
            </div>
            <div className="p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2">कोड</th>
                    <th className="py-2 px-2">विषय (हिंदी)</th>
                    <th className="py-2 px-2">Subject (English)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {Object.values(UP_BOARD_SUBJECT_CODES)
                    .filter((c) => c.level === 'High School')
                    .map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50">
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold">{item.name}</td>
                        <td className="py-2 px-2 text-slate-600">{item.englishName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intermediate Codes (11th & 12th) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50/40 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="p-1 bg-indigo-600 text-white rounded">11-12</span>
                <span>इंटरमीडिएट विषय कोड (Intermediate 11th & 12th)</span>
              </h3>
            </div>
            <div className="p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2">कोड</th>
                    <th className="py-2 px-2">विषय (हिंदी)</th>
                    <th className="py-2 px-2">Subject (English)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {Object.values(UP_BOARD_SUBJECT_CODES)
                    .filter((c) => c.level === 'Intermediate')
                    .map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50">
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-mono font-bold">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold">{item.name}</td>
                        <td className="py-2 px-2 text-slate-600">{item.englishName}</td>
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
