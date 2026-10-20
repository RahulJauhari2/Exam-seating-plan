import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Printer, 
  RotateCcw,
  Menu,
  X,
  ChevronRight,
  Sun,
  Sunset
} from 'lucide-react';

export default function Navbar({ 
  examDetails, 
  setExamDetails, 
  activeShift, 
  handleShiftChange,
  activeTab,
  setActiveTab,
  absentCount = 0,
  onResetData,
  onPrint
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'classes-rooms', short: '📋 इनपुट', label: '1. Classes & Rooms', icon: '📋' },
    { id: 'main-gate', short: '🚪 गेट नोटिस', label: '2. Main Gate Notice', icon: '🚪', badge: 'Key' },
    { id: 'desk-chart', short: '🪑 डेस्क चार्ट', label: '3. Desk Seating Plan', icon: '🪑' },
    { id: 'door-slips', short: '🏷️ डोर स्लिप', label: '4. Room Door Slips', icon: '🏷️' },
    { id: 'search-student', short: '🔍 रोल खोजें', label: '5. Search Roll No', icon: '🔍' },
    { id: 'absent-list', short: '📝 अनुपस्थित', label: '6. Room Absent List', icon: '📝', count: absentCount },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          
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
                <span className="font-semibold text-indigo-700 truncate">
                  {examDetails.examName}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="hidden sm:inline text-slate-600">{examDetails.date}</span>
                <span className="hidden md:inline text-slate-300">|</span>
                <span className="hidden md:inline text-slate-600">{examDetails.timeRange}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Print, Reset, Mobile Details Toggle) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onPrint}
              className="px-2.5 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Print current sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onResetData}
              title="डिफ़ॉल्ट प्रीसेट रीसेट करें"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:hidden text-slate-600 hover:bg-slate-100 rounded-xl"
              title="परीक्षा समय व विवरण बदलें"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-rose-600" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Exam Info Panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded-xl animate-fadeIn">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">परीक्षा का नाम (Exam Name)</label>
              <input
                type="text"
                value={examDetails.examName}
                onChange={(e) => setExamDetails({ ...examDetails, examName: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">दिनांक (Date)</label>
                <input
                  type="date"
                  value={examDetails.date || '2026-10-21'}
                  onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">समय (Time)</label>
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

        {/* Shift / Meeting Bar (Touch-friendly & full-width on mobile) */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleShiftChange('shift_1')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeShift === 'shift_1'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1st Shift (9th-12th)</span>
            </button>
            <button
              onClick={() => handleShiftChange('shift_2')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeShift === 'shift_2'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2nd Shift (6th-8th)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Smooth Horizontal Scroll on Mobile with Touch Snap) */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-1 overflow-x-auto scrollbar-none text-xs font-medium pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>

                {tab.badge && !isActive && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-extrabold">
                    {tab.badge}
                  </span>
                )}

                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-rose-600 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
