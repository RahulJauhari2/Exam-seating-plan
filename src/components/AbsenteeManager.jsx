import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { exportAbsenteeListToExcel } from '../utils/excelExport';

export default function AbsenteeManager({ 
  seatingResult, 
  examDetails, 
  absentStudents, 
  setAbsentStudents 
}) {
  const { rooms = [] } = seatingResult;
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId || 'all');
  const [quickRollInput, setQuickRollInput] = useState('');
  const [searchFeedback, setSearchFeedback] = useState('');

  // Toggle single student absent status
  const toggleAbsent = (rollNo) => {
    const rollStr = rollNo.toString();
    const updated = { ...absentStudents };
    if (updated[rollStr]) {
      delete updated[rollStr];
    } else {
      updated[rollStr] = true;
    }
    setAbsentStudents(updated);
  };

  // Quick mark by roll number input
  const handleQuickMark = (e) => {
    e.preventDefault();
    const roll = quickRollInput.trim();
    if (!roll) return;

    // Check if roll exists in center
    let found = false;
    let foundRoom = '';
    rooms.forEach((r) => {
      r.students.forEach((s) => {
        if (s.rollNo.toString() === roll) {
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
  const handleClearAll = () => {
    if (window.confirm('क्या आप सभी अनुपस्थित (Absent) छात्रों की सूची रीसेट करना चाहते हैं?')) {
      setAbsentStudents({});
    }
  };

  // Generate Room-wise Absentee Summary Data
  const absenteeSummary = rooms.map((room) => {
    const totalSeated = room.seatedCount;
    const roomAbsentRolls = [];

    room.students.forEach((s) => {
      if (absentStudents[s.rollNo.toString()]) {
        roomAbsentRolls.push({
          rollNo: s.rollNo,
          className: s.className,
          section: s.section,
          subject: s.subject,
        });
      }
    });

    const absentCount = roomAbsentRolls.length;
    const presentCount = totalSeated - absentCount;
    const absentRollsText = roomAbsentRolls.map((a) => a.rollNo).join(', ');

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      totalSeated,
      presentCount,
      absentCount,
      absentRolls: roomAbsentRolls,
      absentRollsText,
      students: room.students,
    };
  });

  // Center Totals
  const totalAllocated = absenteeSummary.reduce((sum, r) => sum + r.totalSeated, 0);
  const totalAbsent = absenteeSummary.reduce((sum, r) => sum + r.absentCount, 0);
  const totalPresent = totalAllocated - totalAbsent;

  // Active room data
  const currentRoomData = absenteeSummary.find((r) => r.roomId === selectedRoomId) || absenteeSummary[0];

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportAbsenteeListToExcel(absenteeSummary, examDetails);
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
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              कक्षवार अनुपस्थित छात्र प्रबंधन (Room-Wise Absentee System)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            परीक्षा के दौरान कमरे अनुसार उपस्थित/अनुपस्थित छात्र मार्क करें एवं अनुपस्थिति प्रपत्र (Absent List) प्रिंट करें
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>एक्सेल डाउनलोड (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट अनुपस्थिति पत्रक</span>
          </button>

          {totalAbsent > 0 && (
            <button
              onClick={handleClearAll}
              title="Clear all marked absentees"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
          <span className="text-[11px] font-bold text-rose-700 uppercase">कुल अनुपस्थित (Absent)</span>
          <p className="text-xl font-black text-rose-800 mt-1">{totalAbsent}</p>
        </div>

        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold text-indigo-700 uppercase">उपस्थिति प्रतिशत</span>
          <p className="text-xl font-black text-indigo-800 mt-1">
            {totalAllocated > 0 ? ((totalPresent / totalAllocated) * 100).toFixed(1) : 0}%
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
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap"
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

      {/* Room Selector & Interactive Student Marking Grid (No Print) */}
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
                <option key={r.roomId} value={r.roomId}>
                  {r.roomName} ({r.seatedCount} छात्र)
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
                const isAbsent = Boolean(absentStudents[st.rollNo.toString()]);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleAbsent(st.rollNo)}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all relative ${
                      isAbsent
                        ? 'border-rose-500 bg-rose-50 shadow-sm'
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

      {/* Printable Sheet (Always Visible on Print) */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="text-center pb-5 border-b-2 border-slate-900 mb-6">
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
              ROOM-WISE ABSENTEE STATEMENT (कक्षवार अनुपस्थित छात्र विवरण पत्रक)
            </span>
          </div>
        </div>

        {/* Master Absentee Table */}
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

        {/* Footer Notes & Signatures */}
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
    </div>
  );
}
