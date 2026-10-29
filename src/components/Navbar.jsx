import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Printer, 
  RotateCcw,
  Menu, 
  X, 
  Compass, 
  Database,
  ShieldCheck,
  Crown,
  KeyRound,
  LogOut,
  Smartphone,
  UserCheck
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
  onOpenSidebar,
  onOpenDBSync,
  onOpenLogin,
  onOpenUserMgmt,
  onOpenTeacherPortal
}) {
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const { currentUser, isAuthenticated, logout, isPrincipal, isSuperAdmin, isCoordinator, isTeacher } = useAuth();

  const canEditExamDetails = isAuthenticated && (isPrincipal || isSuperAdmin || isCoordinator);
  const canResetPreset = isAuthenticated && (isPrincipal || isSuperAdmin);
  const canAccessDB = isAuthenticated && (isPrincipal || isSuperAdmin || isCoordinator);

  const tabLabels = {
    'classes-rooms': '📋 1. Classes & Rooms',
    'main-gate': '🚪 2. Main Gate Notice Board',
    'desk-chart': '🪑 3. Desk Seating Plan',
    'door-slips': '🏷️ 4. Room Door Slips',
    'search-student': '🔍 5. Search Roll Number',
    'absent-list': '📝 6. Room Absent List',
    'teacher-portal': '📱 7. Teacher Room Portal',
    'exam-scheme': '📅 8. Scheme & Papers',
    'teacher-duty': '👨‍🏫 9. Teacher Duty',
    'result-marksheet': '🎓 10. Result & Marksheet',
  };

  // Helper for role badge
  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return { label: 'सुपर एडमिन', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'principal':
        return { label: 'प्रधानाचार्य', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'coordinator':
        return { label: 'परीक्षा प्रभारी', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'teacher':
        return { label: 'कक्ष निरीक्षक', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      default:
        return { label: 'स्टाफ', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const roleBadge = currentUser ? getRoleBadge(currentUser.role) : null;

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
              {canEditExamDetails ? (
                <input
                  type="text"
                  value={examDetails.schoolName}
                  onChange={(e) => setExamDetails({ ...examDetails, schoolName: e.target.value })}
                  className="font-black text-slate-800 text-sm sm:text-base md:text-lg bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 focus:outline-none transition-all w-full truncate"
                  title="विद्यालय का नाम बदलें (एडमिन)"
                />
              ) : (
                <h1 className="font-black text-slate-800 text-sm sm:text-base md:text-lg truncate select-none tracking-tight">
                  {examDetails.schoolName}
                </h1>
              )}
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                <span className="font-bold text-indigo-700 truncate">
                  {examDetails.examName}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-slate-600">
                  <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                  {canEditExamDetails ? (
                    <input
                      type="date"
                      value={examDetails.date || ''}
                      onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                      className="bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px] font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      title="परीक्षा तिथि (Exam Date)"
                    />
                  ) : (
                    <span className="font-semibold text-slate-700">
                      {examDetails.date || 'परीक्षा दिवस'}
                    </span>
                  )}
                </span>
                <span className="hidden md:inline text-slate-300">|</span>
                <span className="hidden md:inline text-slate-600">{examDetails.timeRange}</span>
                {!isAuthenticated && (
                  <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    सुरक्षित छात्र दृश्य (Read Only)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Current Active Tab Pill & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active Tab indicator (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <span className="text-slate-400 font-normal">सक्रिय:</span>
              <span className="text-indigo-700">{tabLabels[activeTab] || 'Seating System'}</span>
            </div>

            {/* Mobile Open Sidebar Menu Button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="lg:hidden px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              title="नेविगेशन मेन्यू खोलें"
            >
              <Compass className="w-4 h-4" />
              <span>मेन्यू</span>
              {absentCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                  {absentCount}
                </span>
              )}
            </button>

            {/* Quick Teacher Room Portal Button */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenLogin();
                } else {
                  onOpenTeacherPortal();
                }
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'teacher-portal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800'
              }`}
              title="कक्ष उपस्थिति पोर्टल (Mobile Attendance)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">कक्ष उपस्थिति</span>
              {!isAuthenticated && <span className="text-[9px] text-blue-500">🔒</span>}
            </button>

            {/* MongoDB Sync Button — Only for authenticated Admin/Principal */}
            {canAccessDB && (
              <button
                onClick={onOpenDBSync}
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="MongoDB Database Sync & Sessions"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">DB Sync</span>
              </button>
            )}

            {/* User Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 p-1 rounded-xl">
                {/* User info & role badge */}
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[100px]">
                      {currentUser?.name}
                    </span>
                    {roleBadge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border inline-block ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* If Principal or SuperAdmin: Staff Role Management button */}
                {(isPrincipal || isSuperAdmin) && (
                  <button
                    onClick={onOpenUserMgmt}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="स्टाफ रोल एवं अनुमति प्रबंधन (RBAC)"
                  >
                    <Crown className="w-4 h-4 text-amber-500" />
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="लॉगआउट करें"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="शिक्षक / प्रधानाचार्य लॉगिन"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>स्टाफ लॉगिन</span>
              </button>
            )}

            {/* Quick Print Button */}
            <button
              onClick={onPrint}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              title="Print Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Reset Preset Button — Only for Admin */}
            {canResetPreset && (
              <button
                onClick={onResetData}
                title="डिफ़ॉल्ट प्रीसेट रीसेट करें (एडमिन)"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

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
              {canEditExamDetails ? (
                <input
                  type="text"
                  value={examDetails.examName}
                  onChange={(e) => setExamDetails({ ...examDetails, examName: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                />
              ) : (
                <div className="text-xs font-bold text-slate-800 px-2 py-1 bg-white rounded-lg border border-slate-200">
                  {examDetails.examName}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">दिनांक</label>
                {canEditExamDetails ? (
                  <input
                    type="date"
                    value={examDetails.date || ''}
                    onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-700 px-2 py-1 bg-white rounded-lg border border-slate-200">
                    {examDetails.date || 'आज'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">समय</label>
                {canEditExamDetails ? (
                  <input
                    type="text"
                    value={examDetails.timeRange || ''}
                    onChange={(e) => setExamDetails({ ...examDetails, timeRange: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-700 px-2 py-1 bg-white rounded-lg border border-slate-200">
                    {examDetails.timeRange || 'प्रातः काल'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
