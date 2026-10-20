import React from 'react';
import { Tag, Printer, Building2, Calendar, Clock, Users } from 'lucide-react';

export default function DoorSlips({ seatingResult, examDetails }) {
  const { rooms = [] } = seatingResult;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-600 text-white rounded-lg">
              <Tag className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              कमरे के दरवाज़े की पर्चियां (Room Door Slips)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            प्रत्येक कमरे के प्रवेश द्वार पर चिपकाने हेतु पर्चियां (A4 पर 2 या 4 प्रति पेज)
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट डोर स्लिप्स</span>
        </button>
      </div>

      {/* Grid of Slips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rooms.map((room) => {
          if (room.seatedCount === 0) return null;
          return (
            <div
              key={room.roomId}
              className="bg-white rounded-2xl border-4 border-slate-900 p-6 shadow-sm flex flex-col justify-between page-break-inside-avoid"
            >
              <div>
                {/* Header */}
                <div className="text-center pb-3 border-b-2 border-slate-800">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    {examDetails.schoolName}
                  </h3>
                  <p className="text-sm font-bold text-slate-800">
                    {examDetails.examName}
                  </p>
                  <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-600 mt-1">
                    <span>📅 {examDetails.date}</span>
                    <span>•</span>
                    <span>⏰ {examDetails.timeRange}</span>
                  </div>
                </div>

                {/* Big Room Title */}
                <div className="my-4 text-center py-2 bg-slate-900 text-white rounded-xl">
                  <span className="text-2xl font-black tracking-wide uppercase">
                    🚪 {room.roomName}
                  </span>
                </div>

                {/* Seating Details */}
                <div className="space-y-2 text-xs">
                  <div className="text-slate-600 font-bold mb-1 flex items-center justify-between">
                    <span>कक्षा व रोल नंबर सूची:</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-black text-xs">
                      कुल छात्र: {room.seatedCount}
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                        <tr>
                          <th className="px-3 py-1.5">कक्षा व सेक्शन</th>
                          <th className="px-3 py-1.5">विषय</th>
                          <th className="px-3 py-1.5 text-center font-mono">Roll Range</th>
                          <th className="px-3 py-1.5 text-center">संख्या</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {room.gateSummary.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-bold text-slate-900">
                              Class {item.className}-{item.section}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {item.subject}
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900">
                              {item.rangeText}
                            </td>
                            <td className="px-3 py-1.5 text-center font-black text-indigo-700">
                              {item.totalStudents}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Instructions & Signature */}
              <div className="mt-5 pt-3 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600">
                <div>
                  <span>बेंच क्षमता: {room.benchesCount} डेस्क (2 छात्र प्रति बेंच)</span>
                </div>
                <div className="text-right font-bold text-slate-800">
                  <span>हस्ताक्षर केंद्राध्यक्ष</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
