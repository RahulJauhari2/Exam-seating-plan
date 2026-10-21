import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
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
  Search
} from 'lucide-react';
import { EXAM_SCHEME_METADATA, EXAM_TIMETABLE } from '../data/examSchemeData';
import TeacherExcelImporterModal from './TeacherExcelImporterModal';

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
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    designation: 'सहायक अध्यापक',
    subject: '',
    mobile: '',
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
  const currentAllocation = useMemo(() => {
    const key = `${selectedDay.id}_${activeShift}`;
    return dutyRoster[key] || { rooms: {}, relievers: [] };
  }, [dutyRoster, selectedDay, activeShift]);

  // Smart Auto Allocate Duties for current date & shift
  const handleAutoAllocate = () => {
    const availableTeachers = teachers.filter((t) => t.isPresent !== false);
    if (availableTeachers.length === 0) {
      alert('कोई भी शिक्षक उपस्थित नहीं है। कृपया स्टाफ सूची में शिक्षकों की उपस्थिति चेक करें।');
      return;
    }

    // Shuffle pool for fair rotation
    const shuffled = [...availableTeachers].sort(() => Math.random() - 0.5);
    let tIdx = 0;
    const roomAssignments = {};
    const relieverAssignments = [];

    activeRooms.forEach((rm) => {
      // Normal room = 1 invigilator; Large Hall (>40 capacity or benches > 20) = 2 invigilators
      const isLarge = rm.benchesCount > 20 || rm.seatedCount > 40;
      
      const inv1 = shuffled[tIdx % shuffled.length]?.id;
      tIdx++;

      let inv2 = null;
      if (isLarge && shuffled.length > activeRooms.length) {
        inv2 = shuffled[tIdx % shuffled.length]?.id;
        tIdx++;
      }

      roomAssignments[rm.roomId] = {
        invigilator1: inv1,
        invigilator2: inv2,
      };
    });

    // 2-3 Relievers / Flying squad from remaining teachers
    const relieverCount = Math.min(3, Math.max(1, availableTeachers.length - tIdx));
    for (let i = 0; i < relieverCount; i++) {
      relieverAssignments.push(shuffled[tIdx % shuffled.length]?.id);
      tIdx++;
    }

    const key = `${selectedDay.id}_${activeShift}`;
    setDutyRoster((prev) => ({
      ...prev,
      [key]: {
        rooms: roomAssignments,
        relievers: relieverAssignments,
      },
    }));
  };

  // If allocation is empty, auto-allocate once on initial load
  useEffect(() => {
    const key = `${selectedDay.id}_${activeShift}`;
    if (!dutyRoster[key] && teachers.length > 0 && activeRooms.length > 0) {
      handleAutoAllocate();
    }
  }, [selectedDay.id, activeShift, teachers.length, activeRooms.length]);

  // Handle manual dropdown change for a room
  const handleRoomTeacherChange = (roomId, slot, teacherId) => {
    const key = `${selectedDay.id}_${activeShift}`;
    const curr = dutyRoster[key] || { rooms: {}, relievers: [] };
    const currRoom = curr.rooms?.[roomId] || {};

    const updatedRooms = {
      ...curr.rooms,
      [roomId]: {
        ...currRoom,
        [slot]: teacherId || null,
      },
    };

    setDutyRoster((prev) => ({
      ...prev,
      [key]: {
        ...curr,
        rooms: updatedRooms,
      },
    }));
  };

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
      designation: newTeacher.designation.trim() || 'सहायक अध्यापक',
      subject: newTeacher.subject.trim() || 'General',
      mobile: newTeacher.mobile.trim(),
      isPresent: true,
    };

    setTeachers((prev) => [...prev, teacherObj]);
    setNewTeacher({ name: '', designation: 'सहायक अध्यापक', subject: '', mobile: '' });
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
      // Merge unique by name
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

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [teachers]);

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
              onClick={() => setIsImporterOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="एक्सेल से शिक्षक लोड करें"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>एक्सेल से जोड़ें</span>
            </button>

            <button
              type="button"
              onClick={handleAutoAllocate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="स्वतः निष्पक्ष ड्यूटी आवंटित करें"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>ऑटो ड्यूटी आवंटन</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट ड्यूटी चार्ट</span>
            </button>
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
              शिफ्ट: <strong className="text-indigo-700">{activeShift === 'shift_1' ? EXAM_SCHEME_METADATA.shift1Time : EXAM_SCHEME_METADATA.shift2Time}</strong>
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
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DAILY DUTY CHART (दैनिक ड्यूटी चार्ट)               */}
      {/* ========================================================= */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          {/* Official Print Header (Only visible on paper / PDF printout) */}
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
                    const t1 = teacherMap[roomAlloc.invigilator1];
                    const t2 = teacherMap[roomAlloc.invigilator2];
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

                        {/* Invigilator 1 */}
                        <td className="px-4 py-2.5 print:px-2 print:border-r print:border-slate-300">
                          <div className="no-print">
                            <select
                              value={roomAlloc.invigilator1 || ''}
                              onChange={(e) => handleRoomTeacherChange(rm.roomId, 'invigilator1', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-indigo-500 cursor-pointer"
                            >
                              <option value="">— शिक्षक चुनें —</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id} disabled={t.isPresent === false}>
                                  {t.name} {t.subject ? `(${t.subject})` : ''} {t.isPresent === false ? '• [अवकाश पर]' : ''}
                                </option>
                              ))}
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

                        {/* Invigilator 2 */}
                        <td className="px-4 py-2.5 print:px-2 print:border-r print:border-slate-300">
                          <div className="no-print">
                            <select
                              value={roomAlloc.invigilator2 || ''}
                              onChange={(e) => handleRoomTeacherChange(rm.roomId, 'invigilator2', e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs font-bold cursor-pointer ${
                                isLarge
                                  ? 'border-indigo-300 bg-indigo-50/40 text-indigo-900'
                                  : 'border-slate-200 text-slate-600 bg-slate-50/60'
                              }`}
                            >
                              <option value="">— द्वितीय कक्ष निरीक्षक {isLarge ? '(हॉल)' : '(वैकल्पिक)'} —</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id} disabled={t.isPresent === false}>
                                  {t.name} {t.subject ? `(${t.subject})` : ''} {t.isPresent === false ? '• [अवकाश पर]' : ''}
                                </option>
                              ))}
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

            {/* Reliever / Flying Squad Section */}
            <div className="p-4 bg-amber-50/60 border-t border-amber-200/80 print:bg-slate-50 print:border-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black rounded text-[10px] uppercase">
                  रिलीवर / उड़नदस्ता (Reliever & Flying Squad)
                </span>
                <span className="text-slate-700 font-bold">
                  राउंड ड्यूटी व आकस्मिक रिलीविंग हेतु:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap font-bold text-slate-900">
                {(currentAllocation.relievers || []).length === 0 ? (
                  <span className="text-slate-400 italic">कोई रिलीवर शिक्षक चयनित नहीं</span>
                ) : (
                  (currentAllocation.relievers || []).map((tid) => {
                    const t = teacherMap[tid];
                    if (!t) return null;
                    return (
                      <span
                        key={tid}
                        className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-slate-800 text-xs shadow-2xs"
                      >
                        {t.name} ({t.designation})
                      </span>
                    );
                  })
                )}
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
      {/* TAB 2: TEACHER STAFF DIRECTORY (शिक्षक स्टाफ सूची)         */}
      {/* ========================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Add Teacher Card & Search Bar */}
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
                    placeholder="उदा. श्री राहुल कुमार"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500"
                  />
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
                    अध्यापन विषय (Teaching Subject)
                  </label>
                  <input
                    type="text"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    placeholder="उदा. गणित / विज्ञान / हिन्दी"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मोबाइल नंबर (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    value={newTeacher.mobile}
                    onChange={(e) => setNewTeacher({ ...newTeacher, mobile: e.target.value })}
                    placeholder="9415..."
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
                  <button
                    type="button"
                    onClick={() => setIsImporterOpen(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>इम्पोर्ट</span>
                  </button>
                </div>
              </div>

              {/* Teachers Table */}
              <div className="overflow-x-auto flex-1 mt-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                      <th className="py-2 px-2 text-center w-10">क्र०</th>
                      <th className="py-2 px-3">शिक्षक का नाम</th>
                      <th className="py-2 px-2">पदनाम</th>
                      <th className="py-2 px-2">विषय</th>
                      <th className="py-2 px-2 text-center">कुल ड्यूटी</th>
                      <th className="py-2 px-2 text-center">स्थिति (उपस्थिति)</th>
                      <th className="py-2 px-2 text-center w-12">हटाएं</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTeachers.map((t, i) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {t.name}
                        </td>
                        <td className="py-2 px-2 text-slate-600">
                          {t.designation}
                        </td>
                        <td className="py-2 px-2 text-indigo-700 font-semibold">
                          {t.subject || '—'}
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
                            {t.isPresent !== false ? 'उपस्थित (Active)' : 'अवकाश पर (Leave)'}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
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
