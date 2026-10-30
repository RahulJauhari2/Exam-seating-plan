import React, { useState } from 'react';
import { 
  DoorOpen, 
  Printer, 
  FileSpreadsheet, 
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { exportGateNoticeToExcel } from '../utils/excelExport';

export default function MainGateNotice({ seatingResult, examDetails }) {
  const { rooms = [], masterGateNotice = [], totalStudents, totalSeated } = seatingResult;
  const [mobileDisplayMode, setMobileDisplayMode] = useState('cards'); // 'cards' or 'table'

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportGateNoticeToExcel(masterGateNotice, examDetails);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Action Bar (Hidden during print) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0">
              <DoorOpen className="w-5 h-5" />
            </span>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800">
              मुख्य गेट परीक्षा सूचना पट्ट (Main Gate Notice)
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            मुख्य द्वार पर लगाने हेतु रोल नंबर रेंज (From - To) एवं कमरा अनुसार छात्र संख्या
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
          {/* Mobile Display Mode Toggle */}
          <div className="flex sm:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMobileDisplayMode('cards')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mobileDisplayMode === 'cards' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>कार्ड</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDisplayMode('table')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mobileDisplayMode === 'table' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>टेबल</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Excel Export</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>प्रिंट नोटिस</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Summary Metrics (Mobile Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 no-print">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">कुल कमरे</span>
          <p className="text-base sm:text-lg font-black text-slate-800">{rooms.length}</p>
        </div>
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-indigo-700 uppercase">कुल छात्र</span>
          <p className="text-base sm:text-lg font-black text-indigo-900">{totalStudents}</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">आबंटित छात्र</span>
          <p className="text-base sm:text-lg font-black text-emerald-900">{totalSeated}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">एंटी-चीटिंग</span>
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>सत्यापित ✓</span>
          </p>
        </div>
      </div>

      {/* MOBILE-ONLY CARD VIEW (Rendered on mobile when cards mode is active) */}
      {mobileDisplayMode === 'cards' && (
        <div className="space-y-3.5 sm:hidden no-print">
          {rooms.map((room) => {
            if (room.seatedCount === 0) return null;
            return (
              <div
                key={room.roomId}
                className="bg-white border-2 border-slate-800 rounded-2xl p-4 shadow-sm"
              >
                {/* Room Header Banner */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-slate-900">
                      📍 {room.roomName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
                    {room.seatedCount} छात्र
                  </span>
                </div>

                {/* Class List */}
                <div className="mt-3 space-y-2">
                  {room.gateSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-xs">
                            Class {item.className}-{item.section}
                          </span>
                          {item.subject && !item.subject.startsWith('UP Board') && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({item.subject})
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono font-black text-sm text-indigo-950">
                          रोल: <span className="bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">{item.rangeText}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {item.totalStudents} छात्र
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Sheet & Full Table View */}
      <div className={`bg-white p-4 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 ${
        mobileDisplayMode === 'cards' ? 'hidden sm:block' : 'block'
      }`}>
        
        {/* Printable Header */}
        <div className="text-center pb-4 sm:pb-5 border-b-2 border-slate-900 mb-5 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
          </h1>
          <p className="text-xs sm:text-base font-bold text-indigo-900 mt-1">
            {examDetails.examName || 'Annual Examination 2026'}
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 px-3 py-1 bg-slate-100 rounded-full text-[11px] sm:text-xs font-semibold text-slate-800 border border-slate-300">
            <span>📅 {examDetails.date || '2026-10-21'}</span>
            <span className="hidden sm:inline">•</span>
            <span>⏰ {examDetails.timeRange || '09:00 AM - 12:15 PM'}</span>
          </div>
          <div className="mt-2.5">
            <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded">
              MAIN GATE SEATING NOTICE (कक्षा व रोल नंबर अनुसार कमरा आबंटन)
            </span>
          </div>
        </div>

        {/* Grouped by Room View */}
        <div className="space-y-5 sm:space-y-6">
          {rooms.map((room) => {
            if (room.seatedCount === 0) return null;
            return (
              <div 
                key={room.roomId} 
                className="border-2 border-slate-800 rounded-xl overflow-hidden page-break-inside-avoid"
              >
                {/* Room Banner */}
                <div className="bg-slate-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
                      📍 {room.roomName}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-300">
                      ({room.benchesCount} बेंच)
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded">
                    कुल: {room.seatedCount} छात्र
                  </div>
                </div>

                {/* Table for this room */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-300 w-10 text-center">क्र.</th>
                        <th className="px-3 py-2 border-r border-slate-300">कक्षा व सेक्शन</th>
                        <th className="px-3 py-2 border-r border-slate-300">विषय</th>
                        <th className="px-3 py-2 border-r border-slate-300 font-mono text-center">
                          रोल नंबर सीमा (From - To)
                        </th>
                        <th className="px-3 py-2 text-center font-bold">छात्र संख्या</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {room.gateSummary.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-1.5 text-center font-semibold text-slate-500 border-r border-slate-300">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-extrabold text-[11px]">
                              Class {item.className} - {item.section}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-700 font-medium border-r border-slate-300">
                            {item.subject && !item.subject.startsWith('UP Board') ? item.subject : 'All Subjects'}
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-slate-900">
                              {item.rangeText}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-extrabold text-indigo-700">
                            {item.totalStudents} छात्र
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                      <tr>
                        <td colSpan="4" className="px-3 py-2 text-right border-r border-slate-300 text-xs">
                          {room.roomName} कुल छात्र:
                        </td>
                        <td className="px-3 py-2 text-center font-black text-xs sm:text-sm text-slate-900">
                          {room.seatedCount} छात्र
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Master Consolidated Notice Container - Starts cleanly on a new page and keeps table + signatures together */}
        <div className="mt-6 sm:mt-8 page-break-before break-inside-avoid">
          {/* Border Box for Master Table */}
          <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
            {/* Print Header for Master Consolidated Notice when starting on a new page */}
            <div className="hidden print:block text-center pt-2 pb-2.5 border-b-2 border-slate-900 bg-slate-50">
              <h2 className="text-base font-black text-slate-900 uppercase">
                {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
              </h2>
              <p className="text-xs font-bold text-indigo-900">
                {examDetails.examName || 'Annual Examination 2026'}
              </p>
              <div className="text-[10px] text-slate-600 mt-0.5">
                दिनांक: {examDetails.date || ''} • समय: {examDetails.timeRange || ''}
              </div>
            </div>

            <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-center font-bold text-xs uppercase tracking-wider">
              🏛️ संपूर्ण परीक्षा केंद्र सारांश (Master Consolidated Notice)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[520px]">
                <thead className="bg-slate-200 text-slate-900 font-extrabold border-b border-slate-300">
                  <tr>
                    <th className="px-2.5 py-2 border-r border-slate-300 text-center w-10">क्र.</th>
                    <th className="px-3 py-2 border-r border-slate-300">कमरा / हॉल नं.</th>
                    <th className="px-3 py-2 border-r border-slate-300">कक्षा व सेक्शन</th>
                    <th className="px-3 py-2 border-r border-slate-300">विषय</th>
                    <th className="px-3 py-2 border-r border-slate-300 text-center">रोल नंबर (From - To)</th>
                    <th className="px-3 py-2 text-center">संख्या</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {masterGateNotice.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-2.5 py-1.5 text-center text-slate-500 font-medium border-r border-slate-300">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-300">
                        {row.roomName}
                      </td>
                      <td className="px-3 py-1.5 font-bold border-r border-slate-300">
                        Class {row.className} - {row.section}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 border-r border-slate-300">
                        {row.subject && !row.subject.startsWith('UP Board') ? row.subject : 'All Subjects'}
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                        {row.rangeText}
                      </td>
                      <td className="px-3 py-1.5 text-center font-bold text-indigo-700">
                        {row.totalStudents}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-200 border-t-2 border-slate-900 font-extrabold text-slate-900">
                  <tr>
                    <td colSpan="5" className="px-4 py-2 text-right border-r border-slate-300">
                      कुल उपस्थित होने वाले छात्र (Grand Total):
                    </td>
                    <td className="px-4 py-2 text-center font-black text-sm text-indigo-900">
                      {totalSeated} छात्र
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer Notes & Signatures - Attached directly to Master Consolidated Notice */}
          <div className="mt-4 pt-3 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 break-inside-avoid">
            <div>
              <p className="font-semibold text-slate-800">महत्वपूर्ण निर्देश (Instructions):</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 mt-1">
                <li>छात्र गेट नोटिस में अपना रोल नंबर देखकर ही अपने निर्धारित कक्ष में जाएं।</li>
                <li>एक बेंच पर दो छात्र बैठेंगे (दोनों अलग-अलग कक्षा के होंगे)।</li>
              </ul>
            </div>
            <div className="mt-4 sm:mt-0 text-center sm:text-right">
              <div className="w-36 h-8 border-b border-dashed border-slate-400 mx-auto sm:ml-auto"></div>
              <p className="text-[11px] font-bold text-slate-700 mt-1">हस्ताक्षर केंद्राध्यक्ष / प्रधानाचार्य</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
