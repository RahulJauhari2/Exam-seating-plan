import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ChevronRight, 
  Sun, 
  Sunset, 
  Printer,
  Lock,
  Search,
  DoorOpen,
  Armchair,
  Calendar,
  Layers,
  FileSpreadsheet,
  Smartphone,
  ClipboardList,
  GraduationCap
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
  onPrint,
  onOpenLogin
}) {
  const { isAuthenticated, isPrincipal, isSuperAdmin, isCoordinator, isTeacher } = useAuth();
  const canManageAdmin = isAuthenticated && (isPrincipal || isSuperAdmin || isCoordinator);
  const canAccessStaff = isAuthenticated;

  // Tabs for students & public (always accessible without login)
  const studentNavItems = [
    {
      id: 'student-home',
      number: '0',
      title: 'Home (छात्र पोर्टल)',
      hindi: 'मार्गदर्शन, कहानी व सीट खोज',
      icon: '🏠',
      badge: 'New',
      badgeColor: 'bg-indigo-600',
    },
    {
      id: 'search-student',
      number: '1',
      title: 'Search Roll No',
      hindi: 'रोल नंबर / नाम से सीट खोजें',
      icon: '🔍',
      badge: 'Student',
      badgeColor: 'bg-emerald-600',
    },
    {
      id: 'main-gate',
      number: '2',
      title: 'Main Gate Notice',
      hindi: 'गेट नोटिस पट्ट (कमरा आवंटन)',
      icon: '🚪',
      badge: 'Key',
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'desk-chart',
      number: '3',
      title: 'Desk Seating Plan',
      hindi: 'डेस्क सीटिंग चार्ट',
      icon: '🪑',
    },
    {
      id: 'exam-scheme',
      number: '4',
      title: 'Scheme & Papers',
      hindi: 'परीक्षा स्कीम व टाइम टेबल',
      icon: '📅',
    },
  ];

  // Tabs for Staff & Admin (protected)
  const staffNavItems = [
    {
      id: 'classes-rooms',
      number: '5',
      title: 'Classes & Rooms',
      hindi: 'कक्षा और कमरे (डेटा एडिट)',
      icon: '📋',
      isProtected: !canManageAdmin,
      protectLabel: 'Admin Only',
    },
    {
      id: 'door-slips',
      number: '6',
      title: 'Room Door Slips',
      hindi: 'कमरे की पर्चियां (प्रिंट)',
      icon: '🏷️',
      isProtected: !canAccessStaff,
      protectLabel: 'Staff Only',
    },
    {
      id: 'teacher-portal',
      number: '7',
      title: 'Teacher Room Portal',
      hindi: 'कक्ष उपस्थिति (मोबाइल)',
      icon: '📱',
      badge: 'Live',
      badgeColor: 'bg-blue-600',
      isProtected: !canAccessStaff,
      protectLabel: 'Staff Only',
    },
    {
      id: 'absent-list',
      number: '8',
      title: 'Room Absent List',
      hindi: 'अनुपस्थिति पत्रक',
      icon: '📝',
      count: absentCount,
      isProtected: !canAccessStaff,
      protectLabel: 'Staff Only',
    },
    {
      id: 'teacher-duty',
      number: '9',
      title: 'Teacher Duty',
      hindi: 'कक्ष निरीक्षक ड्यूटी',
      icon: '👨‍🏫',
      isProtected: !canManageAdmin,
      protectLabel: 'Admin Only',
    },
    {
      id: 'result-marksheet',
      number: '10',
      title: 'Result & Marksheet',
      hindi: 'परीक्षाफल व अंकतालिका',
      icon: '🎓',
      badge: 'New',
      badgeColor: 'bg-indigo-600',
      isProtected: !canAccessStaff,
      protectLabel: 'Staff Only',
    },
  ];

  const handleSelectTab = (item) => {
    if (item.isProtected) {
      if (onOpenLogin) onOpenLogin();
      if (onClose) onClose();
      return;
    }
    setActiveTab(item.id);
    if (onClose) onClose();
  };

  const renderNavButton = (item) => {
    const isActive = activeTab === item.id;
    const isLocked = item.isProtected;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelectTab(item)}
        className={`w-full text-left py-1.5 px-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 relative group cursor-pointer ${
          isActive
            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-xs ring-1 ring-indigo-500/20 translate-x-1'
            : isLocked
            ? 'border-slate-200/60 bg-slate-50/70 text-slate-500 hover:bg-slate-100/80 hover:border-slate-300'
            : 'border-slate-200/80 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50/80 hover:translate-x-1 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform ${
            isActive 
              ? 'bg-indigo-100 text-indigo-700' 
              : isLocked 
              ? 'bg-slate-200/70 text-slate-500' 
              : 'bg-slate-100 group-hover:bg-white text-slate-700'
          }`}>
            {item.icon}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className={`text-[12px] tracking-tight truncate ${
                isActive 
                  ? 'text-indigo-950 font-black' 
                  : isLocked 
                  ? 'text-slate-600 font-medium' 
                  : 'text-slate-800 font-bold'
              }`}>
                {item.number}. {item.title}
              </span>
              {item.badge && (
                <span className={`px-1.5 py-0.2 text-white rounded text-[8px] font-black uppercase tracking-wider ${item.badgeColor || 'bg-amber-500'}`}>
                  {item.badge}
                </span>
              )}
              {item.count > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[8px] font-black animate-pulse">
                  {item.count}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {item.hindi}
            </div>
          </div>
        </div>

        {isLocked ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              <span>{item.protectLabel}</span>
            </span>
          </div>
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 ${
            isActive 
              ? 'text-indigo-600 translate-x-0.5 opacity-100' 
              : 'text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5'
          }`} />
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none">
      {/* Top Section: Header + Navigation Items */}
      <div className="space-y-3">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🧭</span>
            <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
              नेविगेशन मेन्यू
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[9px] text-emerald-700 font-black px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
              {isAuthenticated ? 'स्टाफ सक्रिय' : 'छात्र मोड'}
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

        {/* SECTION 1: छात्र अनुभाग (Public / Student Access) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
            <span>👨‍🎓 छात्र अनुभाग (Student View)</span>
            <span className="text-[9px] text-emerald-600 font-normal">सुरक्षित</span>
          </div>
          <nav className="space-y-1">
            {studentNavItems.map(renderNavButton)}
          </nav>
        </div>

        {/* SECTION 2: स्टाफ व एडमिन पैनल (Protected) */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>स्टाफ / एडमिन पैनल</span>
            </span>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => { if (onOpenLogin) onOpenLogin(); if (onClose) onClose(); }}
                className="text-[9px] text-indigo-600 font-bold hover:underline"
              >
                लॉगिन करें
              </button>
            )}
          </div>
          <nav className="space-y-1">
            {staffNavItems.map(renderNavButton)}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Shift Switcher + Live Stats + Print Button */}
      <div className="pt-2.5 mt-3 border-t border-slate-200/80 space-y-2">
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
