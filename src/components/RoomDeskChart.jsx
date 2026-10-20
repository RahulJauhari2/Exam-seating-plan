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

export default function RoomDeskChart({ seatingResult, examDetails }) {
  const { rooms = [] } = seatingResult;
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId || 'all');
  const [viewMode, setViewMode] = useState('columns'); // 'columns' or 'grid'

  const activeRooms = selectedRoomId === 'all' 
    ? rooms 
    : rooms.filter((r) => r.roomId === selectedRoomId);

  const handlePrint = () => {
    window.print();
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
        if (colIdx === 0) colName = 'बायां कॉलम (Left Column)';
        else if (colIdx === 1) colName = 'मध्य कॉलम (Middle Column)';
        else if (colIdx === 2) colName = 'दायां कॉलम (Right Column)';
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
    <div className="space-y-6">
      {/* Control Bar (Hidden on print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Armchair className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              कमरा अनुसार डेस्क सीटिंग प्लान (Room Desk Seating Chart)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            हर कमरे की बेंच पर छात्र 1 (बायां) और छात्र 2 (दायां) का सटीक लेआउट (Left: 7, Middle: 6, Right: 7 पंक्ति समर्थन)
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
              <span>कॉलम लेआउट (7-6-7)</span>
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
              <span>सामान्य ग्रिड</span>
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
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट डेस्क चार्ट</span>
          </button>
        </div>
      </div>

      {/* Room Display Cards */}
      <div className="space-y-8">
        {activeRooms.map((room) => {
          const { columns, maxRows } = getColumnsForRoom(room);
          const splitText = (room.columnSplit || [7, 6, 7]).join(' - ');

          return (
            <div
              key={room.roomId}
              className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-7 shadow-sm page-break-after print:border-slate-800 print:shadow-none"
            >
              {/* Room Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {room.roomName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {room.benchesCount} बेंच • {room.capacity} कुल सीटें
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      कॉलम विभाजन: {splitText} (Left: 7, Mid: 6, Right: 7)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {examDetails.schoolName} • {examDetails.examName} ({examDetails.timeRange})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>बैठे छात्र: {room.seatedCount}</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                    खाली सीटें: {room.capacity - room.seatedCount}
                  </div>
                </div>
              </div>

              {/* Teacher / Blackboard indicator */}
              <div className="mb-6 text-center">
                <div className="inline-block px-8 py-1.5 bg-slate-800 text-white text-xs font-extrabold tracking-widest uppercase rounded-lg shadow-sm border border-slate-700">
                  ⬛ BLACKBOARD / TEACHER'S TABLE (आगे का हिस्सा) ⬛
                </div>
              </div>

              {/* Physical Columns View (Left: 7, Middle: 6, Right: 7) */}
              {viewMode === 'columns' ? (
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center items-start">
                  {columns.map((col, colIdx) => (
                    <React.Fragment key={colIdx}>
                      {/* Column Container */}
                      <div className="flex-1 w-full bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-200">
                        {/* Column Header */}
                        <div className="text-center pb-2.5 mb-3 border-b border-slate-200">
                          <span className="text-xs font-black uppercase text-slate-800 block">
                            {col.name}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-700">
                            {col.rowCount} बेंच ({col.rowCount * 2} सीटें)
                          </span>
                        </div>

                        {/* Benches in this column */}
                        <div className="space-y-3">
                          {col.benches.map((bench, rowIdx) => {
                            const left = bench.leftSeat;
                            const right = bench.rightSeat;
                            const isConflict =
                              left &&
                              right &&
                              left.gradeGroup === right.gradeGroup &&
                              left.subject === right.subject;

                            return (
                              <div
                                key={bench.benchNumber}
                                className={`border-2 rounded-xl p-2.5 transition-all relative ${
                                  isConflict
                                    ? 'border-rose-400 bg-rose-50/50'
                                    : bench.status === 'empty'
                                    ? 'border-dashed border-slate-200 bg-slate-100/50 opacity-60'
                                    : 'border-slate-300 bg-white hover:border-indigo-400 shadow-sm'
                                }`}
                              >
                                {/* Bench Header */}
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1.5 mb-1.5 border-b border-slate-100">
                                  <span className="font-mono text-slate-800">
                                    पंक्ति {rowIdx + 1} • बेंच #{bench.benchNumber}
                                  </span>
                                  {!isConflict && (left || right) && (
                                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Pair OK</span>
                                    </span>
                                  )}
                                  {isConflict && (
                                    <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>Conflict!</span>
                                    </span>
                                  )}
                                </div>

                                {/* 2-Seat Container */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {/* Seat 1 (Left) */}
                                  <div
                                    className={`p-2 rounded-lg border flex flex-col justify-between min-h-[64px] ${
                                      left
                                        ? `${left.color} font-medium`
                                        : 'border-dashed border-slate-200 bg-slate-100 text-slate-400 text-center items-center justify-center'
                                    }`}
                                  >
                                    {left ? (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <span className="font-black text-[11px]">
                                            {left.className}-{left.section}
                                          </span>
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/70 font-semibold">
                                            Left
                                          </span>
                                        </div>
                                        <div className="font-mono font-black text-sm my-0.5 text-slate-900">
                                          #{left.rollNo}
                                        </div>
                                        <div className="text-[10px] truncate text-slate-600 font-medium">
                                          {left.subject}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-[10px] font-bold">खाली</span>
                                    )}
                                  </div>

                                  {/* Seat 2 (Right) */}
                                  <div
                                    className={`p-2 rounded-lg border flex flex-col justify-between min-h-[64px] ${
                                      right
                                        ? `${right.color} font-medium`
                                        : 'border-dashed border-slate-200 bg-slate-100 text-slate-400 text-center items-center justify-center'
                                    }`}
                                  >
                                    {right ? (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <span className="font-black text-[11px]">
                                            {right.className}-{right.section}
                                          </span>
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/70 font-semibold">
                                            Right
                                          </span>
                                        </div>
                                        <div className="font-mono font-black text-sm my-0.5 text-slate-900">
                                          #{right.rollNo}
                                        </div>
                                        <div className="text-[10px] truncate text-slate-600 font-medium">
                                          {right.subject}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-[10px] font-bold">खाली</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* If this column has fewer rows than maxRows (e.g. Middle column has 6 rows while Left and Right have 7), show empty gap */}
                          {col.rowCount < maxRows && (
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-100/50 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[85px]">
                              <span>🚶‍♂️ पंक्ति {maxRows}: खाली गलियारा / रास्ता (No Desk)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aisle (Corridor between columns) */}
                      {colIdx < columns.length - 1 && (
                        <div className="hidden lg:flex flex-col items-center justify-center self-stretch px-1 text-slate-300">
                          <div className="w-0.5 h-full bg-slate-200 border-dashed border-l border-slate-300"></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                /* Standard Grid View */
                <div
                  className="grid gap-3 sm:gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${room.columns || 3}, minmax(0, 1fr))`,
                  }}
                >
                  {room.benches.map((bench) => {
                    const left = bench.leftSeat;
                    const right = bench.rightSeat;
                    const isConflict =
                      left &&
                      right &&
                      left.gradeGroup === right.gradeGroup &&
                      left.subject === right.subject;

                    return (
                      <div
                        key={bench.benchNumber}
                        className={`border-2 rounded-xl p-2.5 transition-all relative ${
                          isConflict
                            ? 'border-rose-400 bg-rose-50/50'
                            : bench.status === 'empty'
                            ? 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'
                            : 'border-slate-300 bg-white hover:border-indigo-400 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1.5 mb-1.5 border-b border-slate-100">
                          <span className="font-mono text-slate-700">बेंच #{bench.benchNumber}</span>
                          {!isConflict && (left || right) && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pair OK</span>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div
                            className={`p-2 rounded-lg border flex flex-col justify-between min-h-[64px] ${
                              left ? `${left.color} font-medium` : 'border-dashed border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {left ? (
                              <>
                                <span className="font-black text-[11px]">{left.className}-{left.section}</span>
                                <span className="font-mono font-black text-sm my-0.5 text-slate-900">#{left.rollNo}</span>
                                <span className="text-[10px] truncate text-slate-600">{left.subject}</span>
                              </>
                            ) : <span>खाली</span>}
                          </div>

                          <div
                            className={`p-2 rounded-lg border flex flex-col justify-between min-h-[64px] ${
                              right ? `${right.color} font-medium` : 'border-dashed border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {right ? (
                              <>
                                <span className="font-black text-[11px]">{right.className}-{right.section}</span>
                                <span className="font-mono font-black text-sm my-0.5 text-slate-900">#{right.rollNo}</span>
                                <span className="text-[10px] truncate text-slate-600">{right.subject}</span>
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
              <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Room In-charge: ___________________</span>
                <span>Invigilator Sign: ___________________</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
