import React from 'react';
import { 
  X, 
  ChevronRight, 
  Sun, 
  Sunset, 
  Printer, 
  ShieldCheck, 
  Sparkles,
  Users,
  Building,
  CheckCircle2
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
      desc: 'कक्षा, सेक्शन व कमरा इनपुट',
      color: 'hover:border-indigo-400',
    },
    {
      id: 'main-gate',
      number: '2',
      title: 'Main Gate Notice',
      hindi: 'गेट नोटिस पट्ट',
      icon: '🚪',
      badge: 'Key',
      desc: 'रोल नंबर सीमा (From - To) सूची',
      color: 'hover:border-amber-400',
    },
    {
      id: 'desk-chart',
      number: '3',
      title: 'Desk Seating Plan',
      hindi: 'डेस्क सीटिंग प्लान',
      icon: '🪑',
      desc: '7-6-7 बेंच व शिक्षक मेज लेआउट',
      color: 'hover:border-blue-400',
    },
    {
      id: 'door-slips',
      number: '4',
      title: 'Room Door Slips',
      hindi: 'कमरे की पर्चियां',
      icon: '🏷️',
      desc: 'प्रवेश द्वार पर चिपकाने हेतु',
      color: 'hover:border-rose-400',
    },
    {
      id: 'search-student',
      number: '5',
      title: 'Search Roll No',
      hindi: 'रोल नंबर खोजें',
      icon: '🔍',
      desc: 'छात्र का कमरा व बेंच पता करें',
      color: 'hover:border-teal-400',
    },
    {
      id: 'absent-list',
      number: '6',
      title: 'Room Absent List',
      hindi: 'अनुपस्थिति पत्रक',
      icon: '📝',
      count: absentCount,
      desc: 'कक्षवार अनुपस्थित छात्र विवरण',
      color: 'hover:border-rose-500',
    },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full space-y-4">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <span>🧭</span>
            <span>नेविगेशन मेन्यू (Sidebar)</span>
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            सभी 6 रिपोर्ट्स व मॉड्यूल्स
          </p>
        </div>

        {/* Close Button on Mobile Drawer */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items (The 6 Tabs) */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-start justify-between gap-2.5 relative group ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                  : `border-slate-200 bg-white ${item.color} hover:shadow-sm`
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xl p-1.5 rounded-xl bg-slate-100/80 group-hover:bg-white transition-all shrink-0">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-black tracking-tight ${
                      isActive ? 'text-indigo-900' : 'text-slate-800'
                    }`}>
                      {item.number}. {item.title}
                    </span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-black uppercase">
                        {item.badge}
                      </span>
                    )}
                    {item.count > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-black">
                        {item.count} Absent
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {item.hindi}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>

              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                isActive ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Quick Shift & Action Panel */}
      <div className="pt-3 border-t border-slate-200 space-y-3">
        {/* Shift Switcher */}
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
            परीक्षा शिफ्ट (Shift / Meeting)
          </span>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleShiftChange('shift_1')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeShift === 'shift_1'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1st Shift</span>
            </button>
            <button
              type="button"
              onClick={() => handleShiftChange('shift_2')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeShift === 'shift_2'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2nd Shift</span>
            </button>
          </div>
        </div>

        {/* Center Live Stats */}
        {seatingResult && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>कुल छात्र:</span>
              <span className="font-bold text-slate-900">{seatingResult.totalStudents}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>कमरे:</span>
              <span className="font-bold text-slate-900">{seatingResult.rooms?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>आबंटित सीटें:</span>
              <span className="font-bold text-emerald-700">{seatingResult.totalSeated}</span>
            </div>
          </div>
        )}

        {/* Print Button */}
        <button
          type="button"
          onClick={onPrint}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट वर्तमान शीट (Print)</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Left Sidebar (Visible on lg: and above) */}
      <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm no-print">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Overlay (Slide-in from Left on < lg:) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          {/* Dark Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-over Left Drawer */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl p-4 sm:p-5 flex flex-col z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
