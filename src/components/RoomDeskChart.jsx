import React, { useState } from 'react';
import { 
  Armchair, 
  Printer, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Columns3,
  Grid,
  Filter
} from 'lucide-react';
import { exportRoomSeatingToExcel } from '../utils/excelExport';

export default function RoomDeskChart({ seatingResult, examDetails, absentStudents = {} }) {
  const { rooms = [] } = seatingResult;
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId || 'all');
  const [viewMode, setViewMode] = useState('columns'); // 'columns' or 'grid'
  const [mobileColFilter, setMobileColFilter] = useState('all'); // 'all', 0, 1, 2

  const activeRooms = selectedRoomId === 'all' 
    ? rooms 
    : rooms.filter((r) => r.roomId === selectedRoomId);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSingle = (roomId) => {
    setSelectedRoomId(roomId);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = () => {
    setSelectedRoomId('all');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportExcel = () => {
    exportRoomSeatingToExcel(rooms, examDetails);
  };

  // Helper to slice benches into physical columns based on columnSplit (e.g. [7, 6, 7])
  const getColumnsForRoom = (room) => {
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

    const maxRows = Math.max(...split);
    return { columns, maxRows };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Bar (Hidden on print) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
              <Armchair className="w-5 h-5" />
            </span>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800">
              कमरा अनुसार डेस्क सीटिंग प्लान (Room Desk Seating Chart)
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            A4 पेज पर सटीक 1 कमरा प्रति पेज प्रिंट (Left: 7, Middle: 6 + शिक्षक सीट, Right: 7 पंक्ति लेआउट)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('columns')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'columns'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="कॉलम-वाइज़ फिजिकल लेआउट (Left 7 | Mid 6 | Right 7)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>कॉलम (7-6-7)</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="स्टैंडर्ड ग्रिड लेआउट"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ग्रिड</span>
            </button>
          </div>

          {/* Room Selector Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            >
              <option value="all">सभी कमरे देखें (All Rooms)</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.roomName} ({r.seatedCount} छात्र)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Print Current Selected Room */}
          {selectedRoomId !== 'all' ? (
            <button
              onClick={() => handlePrintSingle(selectedRoomId)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Print only this single room on 1 A4 sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट यह कमरा (1 A4)</span>
            </button>
          ) : (
            <button
              onClick={handlePrintAll}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Print all rooms (1 page per room)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट सभी कमरे</span>
            </button>
          )}
        </div>
      </div>

      {/* Room Display Cards */}
      <div className="space-y-6 sm:space-y-8 print:space-y-0">
        {activeRooms.map((room) => {
          const { columns, maxRows } = getColumnsForRoom(room);
          const splitText = (room.columnSplit || [7, 6, 7]).join(' - ');

          return (
            <div
              key={room.roomId}
              className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-7 shadow-sm print-room-page print:p-0 print:border-none print:shadow-none"
            >
              {/* Room Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b-2 border-slate-900 gap-2 mb-3 sm:mb-4 print:pb-1.5 print:mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-xl font-black text-slate-900 print:text-base">
                      📍 {room.roomName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 print:text-[10px] print:px-1.5 print:py-0">
                      {room.benchesCount} बेंच • {room.capacity} सीटें
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 print:inline-block print:text-[10px] print:px-1.5 print:py-0">
                      विभाजन: {splitText}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 font-semibold print:text-[10px] print:mt-0">
                    {examDetails.schoolName} • {examDetails.examName} ({examDetails.date} | {examDetails.timeRange})
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs print:text-[10px]">
                  <div className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-300 rounded-lg font-bold text-emerald-800 flex items-center gap-1 print:px-1.5 print:py-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 print:w-3 print:h-3" />
                    <span>बैठे छात्र: {room.seatedCount}</span>
                  </div>
                  <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-700 print:px-1.5 print:py-0">
                    खाली: {room.capacity - room.seatedCount}
                  </div>
                </div>
              </div>

              {/* Teacher / Blackboard indicator */}
              <div className="mb-3 sm:mb-4 text-center print:mb-1.5">
                <div className="inline-block px-6 sm:px-8 py-1 sm:py-1.5 bg-slate-900 text-white text-[11px] font-extrabold tracking-widest uppercase rounded-lg shadow-sm border border-slate-700 print:py-0.5 print:px-4 print:text-[9px]">
                  ⬛ BLACKBOARD / TEACHER'S TABLE (आगे का पटल) ⬛
                </div>
              </div>

              {/* Mobile Column Switcher (Visible only on mobile screen, completely hidden on print) */}
              {viewMode === 'columns' && columns.length > 1 && (
                <div className="lg:hidden flex items-center justify-center gap-1.5 mb-3 no-print overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setMobileColFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mobileColFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    सभी कॉलम ({columns.length})
                  </button>
                  {columns.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMobileColFilter(i.toString())}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        mobileColFilter === i.toString()
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {i === 0 ? 'बायां (7)' : i === 1 ? 'मध्य (6)' : i === 2 ? 'दायां (7)' : `कॉलम ${i+1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Physical Columns View (Left: 7, Middle: 6, Right: 7) */}
              {viewMode === 'columns' ? (
                <div className="flex flex-col lg:flex-row print:!flex-row print:!gap-2 gap-3 sm:gap-5 justify-center items-start w-full">
                  {columns.map((col, colIdx) => (
                    <React.Fragment key={col.colIndex}>
                      {/* Column Container */}
                      <div
                        className={`flex-1 w-full bg-slate-50/70 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 print:!bg-white print:!p-1 print:!border-slate-500 print:!rounded-lg ${
                          mobileColFilter !== 'all' && mobileColFilter !== colIdx.toString()
                            ? 'hidden lg:block print:!block'
                            : 'block'
                        }`}
                      >
                        {/* Column Header */}
                        <div className="text-center pb-1.5 mb-2 border-b border-slate-200 print:!pb-0.5 print:!mb-1">
                          <span className="text-xs font-black uppercase text-slate-800 block print:!text-[10px]">
                            {col.name}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 print:!text-[8px]">
                            {col.rowCount} बेंच ({col.rowCount * 2} सीटें)
                          </span>
                        </div>

                        {/* Benches in this column */}
                        <div className="space-y-2 sm:space-y-2.5 print:!space-y-1">
                          
                          {/* Front Row (Row 1): Teacher / Invigilator Table if Middle Column has fewer benches */}
                          {col.rowCount < maxRows && colIdx === 1 && (
                            <div className="border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-amber-50/50 to-indigo-50 rounded-xl p-2 shadow-sm text-center print:!p-1 print:!border-indigo-600 print:!bg-indigo-50 print:!rounded-md">
                              <div className="flex items-center justify-between pb-1 mb-1 border-b border-indigo-200 text-[10px] font-bold text-indigo-900 print:!pb-0.5 print:!mb-0.5 print:!text-[8px]">
                                <span className="flex items-center gap-1">
                                  <span>👨‍🏫 पंक्ति 1</span>
                                  <span className="px-1 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-extrabold print:!text-[7px]">
                                    शिक्षक
                                  </span>
                                </span>
                                <span className="text-[9px] text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded font-extrabold print:!text-[7px]">
                                  Invigilator Desk
                                </span>
                              </div>
                              <div className="py-0.5">
                                <div className="font-black text-xs text-indigo-950 print:!text-[9px]">
                                  कक्ष निरीक्षक / शिक्षक मेज
                                </div>
                                <div className="text-[9px] text-slate-600 font-semibold print:!text-[7px]">
                                  (प्रश्न पत्र, उत्तर पुस्तिका व उपस्थिति पटल)
                                </div>
                              </div>
                            </div>
                          )}

                          {col.benches.map((bench, rowIdx) => {
                            const left = bench.leftSeat;
                            const right = bench.rightSeat;
                            const isConflict =
                              left &&
                              right &&
                              left.gradeGroup === right.gradeGroup &&
                              left.subject === right.subject;

                            const actualRowNumber =
                              col.rowCount < maxRows && colIdx === 1
                                ? rowIdx + 2
                                : rowIdx + 1;

                            return (
                              <div
                                key={bench.benchNumber}
                                className={`border-2 rounded-xl p-2 transition-all relative print:!p-1 print:!rounded-md print:!border-slate-400 print:!shadow-none ${
                                  isConflict
                                    ? 'border-rose-400 bg-rose-50/50'
                                    : bench.status === 'empty'
                                    ? 'border-dashed border-slate-200 bg-slate-100/50 opacity-60 print:!opacity-100'
                                    : 'border-slate-300 bg-white shadow-sm'
                                }`}
                              >
                                {/* Bench Header */}
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-1 mb-1 border-b border-slate-100 print:!pb-0.5 print:!mb-0.5 print:!text-[8px]">
                                  <span className="font-mono text-slate-800">
                                    पंक्ति {actualRowNumber} • बेंच #{bench.benchNumber}
                                  </span>
                                  {!isConflict && (left || right) && (
                                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 print:hidden">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Pair OK</span>
                                    </span>
                                  )}
                                </div>

                                {/* 2-Seat Container */}
                                <div className="grid grid-cols-2 gap-1.5 text-xs print:!gap-1 print:!text-[9px]">
                                  
                                  {/* Seat 1 (Left) */}
                                  <div
                                    className={`p-1.5 rounded-lg border flex flex-col justify-between min-h-[56px] print:!min-h-0 print:!p-1 print:!rounded ${
                                      left
                                        ? absentStudents[left.rollNo.toString()]
                                          ? 'bg-rose-100 border-rose-400 text-rose-900 font-medium'
                                          : `${left.color} font-medium`
                                        : 'border-dashed border-slate-200 bg-slate-100 text-slate-400 text-center items-center justify-center'
                                    }`}
                                  >
                                    {left ? (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <span className="font-black text-[11px] print:!text-[9px]">
                                            {left.className}-{left.section}
                                          </span>
                                          {absentStudents[left.rollNo.toString()] ? (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-rose-600 text-white font-black">
                                              ABSENT
                                            </span>
                                          ) : (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-white/80 font-semibold text-slate-600">
                                              L
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-mono font-black text-sm my-0.5 text-slate-900 print:!text-[11px] print:!my-0">
                                          #{left.rollNo}
                                        </div>
                                        {left.name ? (
                                          <div className="text-[10px] font-bold truncate text-slate-800 print:!text-[8px]" title={`${left.name}${left.fatherName ? ` S/D of ${left.fatherName}` : ''}`}>
                                            {left.name}
                                          </div>
                                        ) : (
                                          <div className="text-[9px] truncate text-slate-600 font-medium print:!text-[8px]">
                                            {left.subject}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[9px] font-bold">खाली</span>
                                    )}
                                  </div>

                                  {/* Seat 2 (Right) */}
                                  <div
                                    className={`p-1.5 rounded-lg border flex flex-col justify-between min-h-[56px] print:!min-h-0 print:!p-1 print:!rounded ${
                                      right
                                        ? absentStudents[right.rollNo.toString()]
                                          ? 'bg-rose-100 border-rose-400 text-rose-900 font-medium'
                                          : `${right.color} font-medium`
                                        : 'border-dashed border-slate-200 bg-slate-100 text-slate-400 text-center items-center justify-center'
                                    }`}
                                  >
                                    {right ? (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <span className="font-black text-[11px] print:!text-[9px]">
                                            {right.className}-{right.section}
                                          </span>
                                          {absentStudents[right.rollNo.toString()] ? (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-rose-600 text-white font-black">
                                              ABSENT
                                            </span>
                                          ) : (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-white/80 font-semibold text-slate-600">
                                              R
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-mono font-black text-sm my-0.5 text-slate-900 print:!text-[11px] print:!my-0">
                                          #{right.rollNo}
                                        </div>
                                        {right.name ? (
                                          <div className="text-[10px] font-bold truncate text-slate-800 print:!text-[8px]" title={`${right.name}${right.fatherName ? ` S/D of ${right.fatherName}` : ''}`}>
                                            {right.name}
                                          </div>
                                        ) : (
                                          <div className="text-[9px] truncate text-slate-600 font-medium print:!text-[8px]">
                                            {right.subject}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[9px] font-bold">खाली</span>
                                    )}
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Aisle (Corridor between columns) */}
                      {colIdx < columns.length - 1 && (
                        <div className="hidden lg:flex print:!hidden flex-col items-center justify-center self-stretch px-1 text-slate-300">
                          <div className="w-0.5 h-full bg-slate-200 border-dashed border-l border-slate-300"></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                /* Standard Grid View */
                <div
                  className="grid gap-2 sm:gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${room.columns || 3}, minmax(0, 1fr))`,
                  }}
                >
                  {room.benches.map((bench) => {
                    const left = bench.leftSeat;
                    const right = bench.rightSeat;

                    return (
                      <div
                        key={bench.benchNumber}
                        className="border-2 rounded-xl p-2 print:!p-1 print:!border-slate-400 print:!rounded-md"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-1 mb-1 border-b print:!pb-0.5 print:!mb-0.5">
                          <span className="font-mono text-slate-700">बेंच #{bench.benchNumber}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-xs print:!gap-1 print:!text-[9px]">
                          <div className={`p-1.5 rounded-lg border min-h-[50px] print:!min-h-0 print:!p-1 ${left ? left.color : 'bg-slate-100 text-slate-400'}`}>
                            {left ? (
                              <>
                                <span className="font-black text-[10px] block">{left.className}-{left.section}</span>
                                <span className="font-mono font-black text-xs my-0.5 block">#{left.rollNo}</span>
                                <span className="text-[9px] truncate block text-slate-600">{left.subject}</span>
                              </>
                            ) : <span>खाली</span>}
                          </div>

                          <div className={`p-1.5 rounded-lg border min-h-[50px] print:!min-h-0 print:!p-1 ${right ? right.color : 'bg-slate-100 text-slate-400'}`}>
                            {right ? (
                              <>
                                <span className="font-black text-[10px] block">{right.className}-{right.section}</span>
                                <span className="font-mono font-black text-xs my-0.5 block">#{right.rollNo}</span>
                                <span className="text-[9px] truncate block text-slate-600">{right.subject}</span>
                              </>
                            ) : <span>खाली</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Room Sign-off */}
              <div className="mt-4 sm:mt-6 pt-2 sm:pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-600 print:!mt-2 print:!pt-1 print:!text-[10px]">
                <span>कक्ष प्रभारी: ___________________</span>
                <span>कक्ष निरीक्षक हस्ताक्षर: ___________________</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
