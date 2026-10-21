import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Printer, 
  RotateCcw,
  Menu,
  X,
  Compass,
  Sun,
  Sunset
} from 'lucide-react';

export default function Navbar({ 
  examDetails, 
  setExamDetails, 
  activeShift, 
  handleShiftChange,
  activeTab,
  absentCount = 0,
  onResetData,
  onPrint,
  onOpenSidebar
}) {
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  const tabLabels = {
    'classes-rooms': '📋 1. Classes & Rooms',
    'main-gate': '🚪 2. Main Gate Notice Board',
    'desk-chart': '🪑 3. Desk Seating Plan (7-6-7)',
    'door-slips': '🏷️ 4. Room Door Slips',
    'search-student': '🔍 5. Search Roll Number',
    'absent-list': '📝 6. Room Absent List',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & School Header */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 sm:p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={examDetails.schoolName}
                onChange={(e) => setExamDetails({ ...examDetails, schoolName: e.target.value })}
                className="font-black text-slate-800 text-sm sm:text-base md:text-lg bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 focus:outline-none transition-all w-full truncate"
                title="विद्यालय का नाम बदलें"
              />
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                <span className="font-bold text-indigo-700 truncate">
                  {examDetails.examName}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="hidden sm:inline text-slate-600">{examDetails.date}</span>
                <span className="hidden md:inline text-slate-300">|</span>
                <span className="hidden md:inline text-slate-600">{examDetails.timeRange}</span>
              </div>
            </div>
          </div>

          {/* Current Active Tab Pill & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active Tab indicator (Desktop) */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <span className="text-slate-400 font-normal">सक्रिय:</span>
              <span className="text-indigo-700">{tabLabels[activeTab] || 'Seating System'}</span>
            </div>

            {/* Mobile Open Sidebar Menu Button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="lg:hidden px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              title="नेविगेशन मेन्यू खोलें"
            >
              <Compass className="w-4 h-4 animate-spin-slow" />
              <span>मेन्यू (6 Tabs)</span>
              {absentCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                  {absentCount}
                </span>
              )}
            </button>

            {/* Quick Print Button */}
            <button
              onClick={onPrint}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Print Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Reset Preset Button */}
            <button
              onClick={onResetData}
              title="डिफ़ॉल्ट प्रीसेट रीसेट करें"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Info toggle for mobile */}
            <button
              onClick={() => setMobileInfoOpen(!mobileInfoOpen)}
              className="p-1.5 sm:hidden text-slate-600 hover:bg-slate-100 rounded-xl"
              title="परीक्षा समय व विवरण बदलें"
            >
              {mobileInfoOpen ? <X className="w-4 h-4 text-rose-600" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Exam Info Panel */}
        {mobileInfoOpen && (
          <div className="sm:hidden mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded-xl">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">परीक्षा का नाम</label>
              <input
                type="text"
                value={examDetails.examName}
                onChange={(e) => setExamDetails({ ...examDetails, examName: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">दिनांक</label>
                <input
                  type="date"
                  value={examDetails.date || '2026-10-21'}
                  onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">समय</label>
                <input
                  type="text"
                  value={examDetails.timeRange || ''}
                  onChange={(e) => setExamDetails({ ...examDetails, timeRange: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
