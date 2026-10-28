import React from 'react';
import { 
  X, 
  ChevronRight, 
  Sun, 
  Sunset, 
  Printer,
  Smartphone
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  absentCount = 0,
  isOpen = false,
  onClose,
  activeShift,
  handleShiftChange,
  seatingResult,
  onPrint
}) {
  const navItems = [
    {
      id: 'classes-rooms',
      number: '1',
      title: 'Classes & Rooms',
      hindi: 'कक्षा और कमरे',
      icon: '📋',
    },
    {
      id: 'main-gate',
      number: '2',
      title: 'Main Gate Notice',
      hindi: 'गेट नोटिस पट्ट',
      icon: '🚪',
      badge: 'Key',
    },
    {
      id: 'desk-chart',
      number: '3',
      title: 'Desk Seating Plan',
      hindi: 'डेस्क सीटिंग प्लान',
      icon: '🪑',
    },
    {
      id: 'door-slips',
      number: '4',
      title: 'Room Door Slips',
      hindi: 'कमरे की पर्चियां',
      icon: '🏷️',
    },
    {
      id: 'search-student',
      number: '5',
      title: 'Search Roll No',
      hindi: 'रोल नंबर खोजें',
      icon: '🔍',
    },
    {
      id: 'absent-list',
      number: '6',
      title: 'Room Absent List',
      hindi: 'अनुपस्थिति पत्रक',
      icon: '📝',
      count: absentCount,
    },
    {
      id: 'teacher-portal',
      number: '7',
      title: 'Teacher Room Portal',
      hindi: 'कक्ष उपस्थिति (मोबाइल)',
      icon: '📱',
      badge: 'Live',
    },
    {
      id: 'exam-scheme',
      number: '8',
      title: 'Scheme & Papers',
      hindi: 'परीक्षा स्कीम व पेपर',
      icon: '📅',
    },
    {
      id: 'teacher-duty',
      number: '9',
      title: 'Teacher Duty',
      hindi: 'कक्ष निरीक्षक ड्यूटी',
      icon: '👨‍🏫',
    },
    {
      id: 'result-marksheet',
      number: '10',
      title: 'Result & Marksheet',
      hindi: 'परीक्षाफल व अंकतालिका',
      icon: '🎓',
      badge: 'New',
    },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none">
      {/* Top Section: Header + Navigation Items */}
      <div className="space-y-2">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🧭</span>
            <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
              नेविगेशन मेन्यू
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-100 rounded-md">
              10 मॉड्यूल्स
            </span>

            {/* Close Button on Mobile Drawer */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              title="बंद करें"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Items (The 10 Tabs) */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full text-left py-1.5 px-2.5 rounded-xl border transition-all duration-300 ease-out flex items-center justify-between gap-2 relative group cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm translate-x-1 ring-1 ring-indigo-500/20'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50/80 hover:translate-x-1 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 ${
                    isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 group-hover:bg-white text-slate-700 shadow-2xs'
                  }`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12px] tracking-tight truncate ${
                        isActive ? 'text-indigo-950 font-black' : 'text-slate-800 font-bold'
                      }`}>
                        {item.number}. {item.title}
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      {item.count > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[8px] font-black animate-pulse">
                          {item.count} Absent
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {item.hindi}
                    </div>
                  </div>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ease-out ${
                  isActive 
                    ? 'text-indigo-600 translate-x-0.5 opacity-100' 
                    : 'text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5'
                }`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Shift Switcher + Live Stats + Print Button */}
      <div className="pt-2.5 mt-2 border-t border-slate-200/80 space-y-2">
        {/* Shift Switcher */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              शिफ्ट (Shift)
            </span>
            <span className="text-[9px] font-medium text-slate-400">
              {activeShift === 'shift_1' ? '9th-12th' : '6th-8th'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleShiftChange('shift_1')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer ${
                activeShift === 'shift_1'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Shift 1 (सुबह)</span>
            </button>
            <button
              type="button"
              onClick={() => handleShiftChange('shift_2')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer ${
                activeShift === 'shift_2'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sunset className="w-3 h-3 text-orange-400" />
              <span>Shift 2 (दोपहर)</span>
            </button>
          </div>
        </div>

        {/* Live Seating Stats summary card */}
        {seatingResult && (
          <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-slate-600">
              <span>कमरे (Rooms):</span>
              <span className="font-bold text-slate-800">{seatingResult.roomsCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>छात्र (Students):</span>
              <span className="font-bold text-slate-800">{seatingResult.totalStudents || 0}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>कुल क्षमता:</span>
              <span className="font-bold text-indigo-700">{seatingResult.totalCapacity || 0}</span>
            </div>
            {absentCount > 0 && (
              <div className="flex justify-between items-center text-rose-600 font-bold pt-1 border-t border-slate-200">
                <span>अनुपस्थित छात्र:</span>
                <span className="px-1.5 py-0.2 bg-rose-100 rounded text-rose-800 font-black">
                  {absentCount}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Print Button */}
        <button
          type="button"
          onClick={onPrint}
          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>प्रिंट वर्तमान शीट (Print)</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Left Column) */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer (Left to Right) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex no-print animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl p-4 flex flex-col z-10 overflow-y-auto animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
