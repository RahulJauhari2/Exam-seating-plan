import React from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Sparkles, 
  Printer, 
  FileSpreadsheet, 
  Layers,
  RotateCcw
} from 'lucide-react';

export default function Navbar({ 
  examDetails, 
  setExamDetails, 
  activeShift, 
  handleShiftChange,
  activeTab,
  setActiveTab,
  onResetData,
  onPrint
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Institution & Exam Info */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={examDetails.schoolName}
                  onChange={(e) => setExamDetails({ ...examDetails, schoolName: e.target.value })}
                  className="font-bold text-slate-800 text-base md:text-lg bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 focus:outline-none transition-all py-0.5"
                  title="Click to edit school name"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <input
                  type="text"
                  value={examDetails.examName}
                  onChange={(e) => setExamDetails({ ...examDetails, examName: e.target.value })}
                  className="font-medium text-slate-700 bg-transparent border-b border-slate-200 focus:border-indigo-600 focus:outline-none"
                  placeholder="Exam Name"
                  title="Click to edit exam name"
                />
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={examDetails.date || '2026-10-21'}
                    onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                    className="bg-transparent text-slate-600 focus:outline-none font-medium"
                  />
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={examDetails.timeRange || ''}
                    onChange={(e) => setExamDetails({ ...examDetails, timeRange: e.target.value })}
                    className="bg-transparent text-slate-600 focus:outline-none font-medium w-36"
                    placeholder="Time (e.g. 9:00 AM)"
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Shift Selection & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift / Meeting Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => handleShiftChange('shift_1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeShift === 'shift_1'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>☀️ 1st Meeting (9th-12th)</span>
              </button>
              <button
                onClick={() => handleShiftChange('shift_2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeShift === 'shift_2'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌤️ 2nd Meeting (6th-8th)</span>
              </button>
            </div>

            <button
              onClick={onPrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={onResetData}
              title="Reset to default preset"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-3 border-t border-slate-100 pt-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('classes-rooms')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'classes-rooms'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📋 1. Classes & Rooms Input
          </button>
          <button
            onClick={() => setActiveTab('main-gate')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'main-gate'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🚪 2. Main Gate Notice Board (Roll Range)</span>
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] font-semibold">Key</span>
          </button>
          <button
            onClick={() => setActiveTab('desk-chart')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'desk-chart'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🪑 3. Room Seating Desk Chart (बेंच प्लान)
          </button>
          <button
            onClick={() => setActiveTab('door-slips')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'door-slips'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏷️ 4. Room Door Slips
          </button>
          <button
            onClick={() => setActiveTab('search-student')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'search-student'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🔍 5. Search Roll Number
          </button>
        </div>
      </div>
    </header>
  );
}
