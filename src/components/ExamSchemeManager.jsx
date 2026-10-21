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

export default function ExamSchemeManager({ 
  seatingResult, 
  activeShift = 'shift_1',
  classes = [],
  examDetails,
  setExamDetails 
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

    Object.entries(daySubjects).forEach(([grade, subList]) => {
      const totalStudentsInGrade = classTotals[grade] || 0;
      const countSubjects = subList.length;

      subList.forEach((sub, sIdx) => {
        const splitKey = `${selectedDay.id}_${grade}_${sub.code || sub.name}`;
        let papers = 0;

        if (countSubjects === 1) {
          // 100% of the class takes this single common subject
          papers = totalStudentsInGrade;
        } else {
          // Multiple subjects (e.g. Math vs Bio or Commerce/Computer/Art)
          if (customSplits[splitKey] !== undefined) {
            papers = Number(customSplits[splitKey]) || 0;
          } else {
            // Default split evenly or proportional
            papers = Math.round(totalStudentsInGrade / countSubjects);
            if (sIdx === countSubjects - 1) {
              // Adjust rounding difference on last item
              const alreadyAllocated = Math.round(totalStudentsInGrade / countSubjects) * (countSubjects - 1);
              papers = Math.max(0, totalStudentsInGrade - alreadyAllocated);
            }
          }
        }

        const upBoardInfo = sub.code ? UP_BOARD_SUBJECT_CODES[sub.code] : null;

        items.push({
          grade,
          subjectName: sub.name,
          hindiName: upBoardInfo ? upBoardInfo.name : sub.name,
          code: sub.code || '—',
          totalGradeStudents: totalStudentsInGrade,
          paperCount: papers,
          isMultiple: countSubjects > 1,
          splitKey,
        });

        grandTotal += papers;
      });
    });

    return { items, grandTotal };
  }, [selectedDay, activeShift, classTotals, customSplits]);

  // Handle split change for optional subjects
  const handleSplitChange = (splitKey, val) => {
    setCustomSplits((prev) => ({
      ...prev,
      [splitKey]: Math.max(0, parseInt(val) || 0),
    }));
  };

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

        Object.entries(seatedClassesMap).forEach(([grade, seatedCount]) => {
          const subs = daySubjects[grade] || [];
          if (subs.length === 0) {
            packetSubjects.push({
              grade,
              subjectName: 'General Exam',
              hindiName: 'सामान्य परीक्षा',
              code: '—',
              count: seatedCount,
            });
            totalRoomPapers += seatedCount;
          } else if (subs.length === 1) {
            const s = subs[0];
            const upBoardInfo = s.code ? UP_BOARD_SUBJECT_CODES[s.code] : null;
            packetSubjects.push({
              grade,
              subjectName: s.name,
              hindiName: upBoardInfo ? upBoardInfo.name : s.name,
              code: s.code || '—',
              count: seatedCount,
            });
            totalRoomPapers += seatedCount;
          } else {
            // Multiple optional subjects in this room (e.g. Math vs Bio or Commerce/Computer/Art)
            subs.forEach((s) => {
              const splitKey = `${selectedDay.id}_${grade}_${s.code || s.name}`;
              let count = 0;
              const totalGradeInCenter = classTotals[grade] || 1;
              if (customSplits[splitKey] !== undefined) {
                const subjectTotal = Number(customSplits[splitKey]) || 0;
                count = Math.round((subjectTotal / totalGradeInCenter) * seatedCount);
              } else {
                count = Math.round(seatedCount / subs.length);
              }
              const upBoardInfo = s.code ? UP_BOARD_SUBJECT_CODES[s.code] : null;
              packetSubjects.push({
                grade,
                subjectName: s.name,
                hindiName: upBoardInfo ? upBoardInfo.name : s.name,
                code: s.code || '—',
                count: Math.max(1, count),
                isApprox: true,
              });
              totalRoomPapers += Math.max(1, count);
            });
          }
        });

        return {
          roomId: room.roomId || room.id,
          roomName: room.roomName || room.name || 'Room',
          totalSeated: room.seatedCount || room.students?.length || totalRoomPapers,
          totalRoomPapers,
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
        <div className="space-y-6">
          {/* Paper Demand Header & Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase text-emerald-700">कुल प्रश्न-पत्र</span>
                <span className="text-lg font-black text-emerald-900">{paperDemand.grandTotal}</span>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">कक्षा</th>
                    <th className="px-4 py-3 w-28">विषय कोड</th>
                    <th className="px-4 py-3">विषय का नाम (Subject Name)</th>
                    <th className="px-4 py-3 w-32 text-center">कुल पंजीकृत छात्र</th>
                    <th className="px-4 py-3 w-40 text-center">आवश्यक प्रश्न पत्र</th>
                    <th className="px-4 py-3 w-32 text-center">स्थिति / विवरण</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paperDemand.items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">
                        इस तारीख पर इस शिफ्ट की कोई परीक्षा निर्धारित नहीं है।
                      </td>
                    </tr>
                  ) : (
                    paperDemand.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg font-black text-slate-800 text-xs">
                            {item.grade}th
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.code !== '—' ? (
                            <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-lg text-xs">
                              {item.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{item.subjectName}</span>
                            {item.hindiName && item.hindiName !== item.subjectName && (
                              <span className="text-[11px] text-slate-500 font-normal">
                                ({item.hindiName})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 font-bold">
                          {item.totalGradeStudents}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isMultiple ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                value={item.paperCount}
                                onChange={(e) => handleSplitChange(item.splitKey, e.target.value)}
                                className="w-20 px-2 py-1 border border-indigo-300 rounded-lg text-center font-black text-indigo-700 bg-indigo-50/50 focus:outline-indigo-500 text-xs"
                                title="वैकल्पिक विषय: संख्या संपादित करें"
                              />
                              <span className="text-[10px] text-slate-400">प्रतियां</span>
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded-lg text-xs">
                              {item.paperCount} प्रतियां
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isMultiple ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                              वैकल्पिक (Optional)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              अनिवार्य (Common)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Note & Summary Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>सुझाव:</strong> वैकल्पिक विषयों (जैसे Math/Bio) के लिए आप बॉक्स में अपनी आवश्यकतानुसार छात्र संख्या बदल सकते हैं।
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span>कुल बंडल संख्या: <strong className="text-slate-900">{paperDemand.grandTotal}</strong></span>
                <span>+ 5% रिजर्व: <strong className="text-indigo-700">{Math.ceil(paperDemand.grandTotal * 1.05)}</strong></span>
              </div>
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
                          <span className="font-black text-slate-900 text-xs">
                            {ps.count} {ps.isApprox ? '≈' : ''} प्रतियां
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slip Signatures Footer */}
                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>ह० परीक्षा प्रभारी: _________________</span>
                    <span>ह० कक्ष निरीक्षक: _________________</span>
                  </div>
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
