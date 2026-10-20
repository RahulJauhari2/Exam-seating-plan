import React from 'react';
import { 
  DoorOpen, 
  Printer, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  Building2, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { exportGateNoticeToExcel } from '../utils/excelExport';

export default function MainGateNotice({ seatingResult, examDetails }) {
  const { rooms = [], masterGateNotice = [], totalStudents, totalSeated, unseatedCount } = seatingResult;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportGateNoticeToExcel(masterGateNotice, examDetails);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden during print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500 text-white rounded-lg">
              <DoorOpen className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              मुख्य गेट परीक्षा सूचना पट्ट (Main Gate Notice Board)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            छात्रों के लिए मुख्य द्वार पर लगाने हेतु रोल नंबर (From - To) और कुल संख्या वाली स्पष्ट सूची
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट गेट नोटिस (Print Notice)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Printable Header */}
        <div className="text-center pb-5 border-b-2 border-slate-900 mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {examDetails.schoolName || 'Govt. Model Higher Secondary School'}
          </h1>
          <p className="text-sm sm:text-base font-bold text-indigo-900 mt-1">
            {examDetails.examName || 'Annual Examination 2026'}
          </p>
          <div className="inline-flex items-center gap-4 mt-2 px-4 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 border border-slate-300">
            <span>📅 दिनांक: {examDetails.date || '2026-10-21'}</span>
            <span>•</span>
            <span>⏰ समय / शिफ्ट: {examDetails.timeRange || '09:00 AM - 12:15 PM'}</span>
          </div>
          <div className="mt-3">
            <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black tracking-widest uppercase rounded">
              MAIN GATE SEATING NOTICE (कक्षा व रोल नंबर अनुसार कमरा आबंटन)
            </span>
          </div>
        </div>

        {/* Notice Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 no-print">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">कुल कमरा / हॉल</span>
            <p className="text-lg font-black text-slate-800">{rooms.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase">कुल छात्र परीक्षा में</span>
            <p className="text-lg font-black text-indigo-900">{totalStudents}</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">आबंटित सीटें</span>
            <p className="text-lg font-black text-emerald-900">{totalSeated}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">एंटी-चीटिंग स्थिति</span>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>सत्यापित (No Adjacent Same Class)</span>
            </p>
          </div>
        </div>

        {/* Grouped by Room View */}
        <div className="space-y-6">
          {rooms.map((room, rIdx) => {
            if (room.seatedCount === 0) return null;
            return (
              <div 
                key={room.roomId} 
                className="border-2 border-slate-800 rounded-xl overflow-hidden page-break-inside-avoid"
              >
                {/* Room Banner */}
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider uppercase">
                      📍 {room.roomName}
                    </span>
                    <span className="text-xs text-slate-300">
                      ({room.benchesCount} बेंच • क्षमता: {room.capacity} सीटें)
                    </span>
                  </div>
                  <div className="text-xs font-bold bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded">
                    इस कमरे में कुल: {room.seatedCount} छात्र
                  </div>
                </div>

                {/* Table for this room */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-4 py-2 border-r border-slate-300 w-12 text-center">क्र.</th>
                      <th className="px-4 py-2 border-r border-slate-300">कक्षा एवं सेक्शन (Class & Section)</th>
                      <th className="px-4 py-2 border-r border-slate-300">विषय (Subject)</th>
                      <th className="px-4 py-2 border-r border-slate-300 font-mono text-center">
                        रोल नंबर (Roll No. From - To)
                      </th>
                      <th className="px-4 py-2 text-center font-bold">छात्र संख्या (Total Students)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {room.gateSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-center font-semibold text-slate-500 border-r border-slate-300">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900 border-r border-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-extrabold">
                              Class {item.className} - {item.section}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700 font-medium border-r border-slate-300">
                          {item.subject || '-'}
                        </td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded text-slate-900">
                            {item.rangeText}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-extrabold text-indigo-700">
                          {item.totalStudents} छात्र
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan="4" className="px-4 py-2 text-right border-r border-slate-300">
                        {room.roomName} में कुल छात्र (Room Total):
                      </td>
                      <td className="px-4 py-2 text-center font-black text-sm text-slate-900">
                        {room.seatedCount} छात्र
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>

        {/* Master Consolidated Table (All in one view) */}
        <div className="mt-8 border-2 border-slate-900 rounded-xl overflow-hidden page-break-after">
          <div className="bg-slate-900 text-white px-4 py-2.5 text-center font-bold text-xs uppercase tracking-wider">
            🏛️ संपूर्ण परीक्षा केंद्र सारांश (Consolidated Master Notice)
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-200 text-slate-900 font-extrabold border-b border-slate-300">
              <tr>
                <th className="px-3 py-2 border-r border-slate-300 text-center w-12">क्र.</th>
                <th className="px-3 py-2 border-r border-slate-300">कमरा / हॉल नं.</th>
                <th className="px-3 py-2 border-r border-slate-300">कक्षा व सेक्शन</th>
                <th className="px-3 py-2 border-r border-slate-300">विषय</th>
                <th className="px-3 py-2 border-r border-slate-300 text-center">रोल नंबर (From - To)</th>
                <th className="px-3 py-2 text-center">छात्र संख्या</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {masterGateNotice.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 text-center text-slate-500 font-medium border-r border-slate-300">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-300">
                    {row.roomName}
                  </td>
                  <td className="px-3 py-2 font-bold border-r border-slate-300">
                    Class {row.className} - {row.section}
                  </td>
                  <td className="px-3 py-2 text-slate-600 border-r border-slate-300">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                    {row.rangeText}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-indigo-700">
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

        {/* Footer Notes for Exam Center */}
        <div className="mt-6 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">महत्वपूर्ण निर्देश (Important Instructions):</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 mt-1">
              <li>सभी छात्र परीक्षा समय से 15 मिनट पूर्व अपने निर्धारित कमरे में अपना स्थान ग्रहण करें।</li>
              <li>गेट नोटिस बोर्ड पर अपना रोल नंबर देखकर ही संबंधित कमरे में प्रवेश करें।</li>
              <li>एक बेंच पर दो छात्र बैठेंगे (दोनों छात्र अलग-अलग कक्षा के होंगे)।</li>
            </ul>
          </div>
          <div className="mt-4 sm:mt-0 text-center sm:text-right">
            <div className="w-36 h-10 border-b border-dashed border-slate-400 mx-auto sm:ml-auto"></div>
            <p className="text-[11px] font-bold text-slate-700 mt-1">हस्ताक्षर केंद्राध्यक्ष / प्रधानाचार्य</p>
            <p className="text-[10px] text-slate-400">Exam Superintendent Seal</p>
          </div>
        </div>

      </div>
    </div>
  );
}
