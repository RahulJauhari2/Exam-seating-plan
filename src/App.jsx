import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { DEFAULT_SHIFT_1, DEFAULT_SHIFT_2 } from './data/defaultData';
import { generateSeatingPlan } from './utils/seatingAlgorithm';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { DEFAULT_TEACHERS } from './data/defaultTeachers';
import { useAuth } from './context/AuthContext';
import { fetchLiveAbsenteesAPI, toggleAbsenteeAPI } from './services/api';
import { AlertTriangle, ShieldCheck, Compass, Radio, UserX, X, Lock, KeyRound } from 'lucide-react';

// Lazy-load heavy components — improves mobile load time significantly
const StudentHomePage         = lazy(() => import('./components/StudentHomePage'));
const ClassManager            = lazy(() => import('./components/ClassManager'));
const RoomManager             = lazy(() => import('./components/RoomManager'));
const MainGateNotice          = lazy(() => import('./components/MainGateNotice'));
const RoomDeskChart           = lazy(() => import('./components/RoomDeskChart'));
const DoorSlips               = lazy(() => import('./components/DoorSlips'));
const StudentFinder           = lazy(() => import('./components/StudentFinder'));
const AbsenteeManager         = lazy(() => import('./components/AbsenteeManager'));
const ExamSchemeManager       = lazy(() => import('./components/ExamSchemeManager'));
const TeacherDutyManager      = lazy(() => import('./components/TeacherDutyManager'));
const ResultMarksheetManager  = lazy(() => import('./components/ResultMarksheetManager'));
const DatabaseSyncModal       = lazy(() => import('./components/DatabaseSyncModal'));
const LoginModal              = lazy(() => import('./components/LoginModal'));
const UserManagementModal     = lazy(() => import('./components/UserManagementModal'));
const TeacherRoomPortal       = lazy(() => import('./components/TeacherRoomPortal'));

// Loading spinner shown while lazy components load
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm font-medium">लोड हो रहा है...</p>
    </div>
  </div>
);

// Reusable Staff / Admin Locked Guard component for protected tabs
const StaffLockedGuard = ({ title, description, onLogin, onGoToStudentView }) => (
  <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-10 text-center max-w-lg mx-auto my-8 shadow-sm">
    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
      <Lock className="w-7 h-7" />
    </div>
    <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
      🔒 स्टाफ व एडमिन सुरक्षा
    </span>
    <h2 className="text-base sm:text-lg font-black text-slate-800 mt-3">{title}</h2>
    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
      {description}
    </p>
    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={onLogin}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <KeyRound className="w-4 h-4" />
        <span>स्टाफ / एडमिन लॉगिन करें</span>
      </button>
      <button
        onClick={onGoToStudentView}
        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
      >
        रोल नंबर खोजें (छात्र दृश्य)
      </button>
    </div>
  </div>
);

export default function App() {
  const { currentUser, isAuthenticated, isTeacher, canAccessAllRooms, logout } = useAuth();

  // Active shift state: 'shift_1' (9th-12th) or 'shift_2' (6th-8th)
  const [activeShift, setActiveShift] = useState('shift_1');

  // Absent students state: { [rollNo]: true }
  const [absentStudents, setAbsentStudents] = useState({});

  // Live absentee records map from server: { [rollNo]: record }
  const [liveAbsentees, setLiveAbsentees] = useState({});

  // Live Toast Notification
  const [liveNotification, setLiveNotification] = useState(null);
  const previousAbsentCount = useRef(0);
  // Tracks roll numbers already shown in alert — prevents repeat toasts on same student
  const knownAbsentRolls = useRef(new Set());

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth & RBAC Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);

  // Exam details state (Defaults to Today's date dynamically)
  const [examDetails, setExamDetails] = useState({
    schoolName: DEFAULT_SHIFT_1.schoolName,
    examName: DEFAULT_SHIFT_1.examName,
    timeRange: DEFAULT_SHIFT_1.timeRange,
    date: new Date().toISOString().split('T')[0],
  });

  // Dynamic Classes & Rooms
  const [classes, setClasses] = useState(DEFAULT_SHIFT_1.classes);
  const [rooms, setRooms] = useState(DEFAULT_SHIFT_1.rooms);

  // Teacher Staff & Invigilation Duty State
  const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
  const [dutyRoster, setDutyRoster] = useState(() => {
    try {
      const saved = localStorage.getItem('exam_duty_roster_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Automatically persist dutyRoster changes locally so work is never lost
  useEffect(() => {
    try {
      if (dutyRoster && Object.keys(dutyRoster).length > 0) {
        localStorage.setItem('exam_duty_roster_v1', JSON.stringify(dutyRoster));
      }
    } catch (e) {
      console.error('Error saving duty roster to localStorage', e);
    }
  }, [dutyRoster]);

  // Active view tab — default to 'student-home' for welcoming student storytelling portal
  const [activeTab, setActiveTab] = useState('student-home');

  // MongoDB Database Sync Modal state
  const [isDBSyncOpen, setIsDBSyncOpen] = useState(false);

  // If a teacher logs in, automatically switch to Teacher Room Portal view
  useEffect(() => {
    if (isTeacher) {
      setActiveTab('teacher-portal');
    }
  }, [isTeacher]);

  // Real-time Live Absentee Polling (every 2.5 seconds)
  useEffect(() => {
    let isSubscribed = true;

    const pollLiveAbsentees = async () => {
      try {
        const res = await fetchLiveAbsenteesAPI({
          sessionName: examDetails.examName,
          date: examDetails.date,
          shift: activeShift,
        });

        if (isSubscribed && res && res.success && res.absenteeMap) {
          setLiveAbsentees(res.absenteeMap);

          // Build absentStudents lookup: { [rollNo]: true }
          const newAbsentLookup = {};
          let newlyMarkedAbsent = null;

          Object.values(res.absenteeMap).forEach((rec) => {
            if (rec.isAbsent) {
              newAbsentLookup[rec.rollNo] = true;
              // Only alert if this roll number has NOT been alerted before (ref-based, no stale closure)
              if (!knownAbsentRolls.current.has(String(rec.rollNo))) {
                newlyMarkedAbsent = rec;
              }
            }
          });

          // Show live notification toast only for truly NEW absent student
          if (newlyMarkedAbsent && previousAbsentCount.current > 0 && !isTeacher) {
            // Mark this roll as known so future polls don't re-alert
            knownAbsentRolls.current.add(String(newlyMarkedAbsent.rollNo));
            setLiveNotification({
              rollNo: newlyMarkedAbsent.rollNo,
              roomName: newlyMarkedAbsent.roomName,
              markedBy: newlyMarkedAbsent.markedBy,
              studentName: newlyMarkedAbsent.studentName,
              time: new Date().toLocaleTimeString('hi-IN'),
            });
            setTimeout(() => setLiveNotification(null), 5000);
          }

          previousAbsentCount.current = Object.keys(newAbsentLookup).length;
          setAbsentStudents(newAbsentLookup);
        }
      } catch (err) {
        // Silent catch for smooth offline experience
      }
    };

    // Initial fetch immediately
    pollLiveAbsentees();

    // Polling interval
    const interval = setInterval(pollLiveAbsentees, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      // Reset known absent set when session or shift changes
      knownAbsentRolls.current = new Set();
      previousAbsentCount.current = 0;
    };
  }, [examDetails.examName, examDetails.date, activeShift, isTeacher]);

  // Handle absent toggle from Teacher Room Portal or Admin Absentee Manager
  const handleToggleAbsent = async (toggleData) => {
    // Optimistic local UI update
    const { rollNo, isAbsent } = toggleData;
    setAbsentStudents((prev) => {
      const copy = { ...prev };
      if (isAbsent) copy[rollNo] = true;
      else delete copy[rollNo];
      return copy;
    });

    setLiveAbsentees((prev) => ({
      ...prev,
      [rollNo]: {
        ...prev[rollNo],
        ...toggleData,
      },
    }));

    // Send to backend API
    try {
      const res = await toggleAbsenteeAPI(toggleData);
      return res;
    } catch (err) {
      console.error('Toggle absent error:', err);
    }
  };

  // Load a full exam session from MongoDB into React State
  const handleLoadSessionFromDB = (sessionData) => {
    if (!sessionData) return;
    if (sessionData.activeShift) setActiveShift(sessionData.activeShift);
    if (sessionData.examDetails) setExamDetails(sessionData.examDetails);
    if (sessionData.classes && Array.isArray(sessionData.classes)) setClasses(sessionData.classes);
    if (sessionData.rooms && Array.isArray(sessionData.rooms)) setRooms(sessionData.rooms);
    if (sessionData.teachers && Array.isArray(sessionData.teachers)) setTeachers(sessionData.teachers);
    if (sessionData.dutyRoster) setDutyRoster(sessionData.dutyRoster);
    if (sessionData.marksData) {
      try {
        localStorage.setItem('dynamic_exam_marks_data_v1', JSON.stringify(sessionData.marksData));
      } catch (e) {
        console.error('Error saving loaded marks', e);
      }
    }
    if (sessionData.subjectConfig) {
      try {
        localStorage.setItem('dynamic_exam_subject_config_v1', JSON.stringify(sessionData.subjectConfig));
      } catch (e) {
        console.error('Error saving loaded subject config', e);
      }
    }
  };

  // Handle Shift switch
  const handleShiftChange = (newShift) => {
    setActiveShift(newShift);
    if (newShift === 'shift_1') {
      setClasses(DEFAULT_SHIFT_1.classes);
      setRooms(DEFAULT_SHIFT_1.rooms);
      setExamDetails((prev) => ({
        ...prev,
        examName: DEFAULT_SHIFT_1.examName,
        timeRange: DEFAULT_SHIFT_1.timeRange,
      }));
    } else {
      setClasses(DEFAULT_SHIFT_2.classes);
      setRooms(DEFAULT_SHIFT_2.rooms);
      setExamDetails((prev) => ({
        ...prev,
        examName: DEFAULT_SHIFT_2.examName,
        timeRange: DEFAULT_SHIFT_2.timeRange,
      }));
    }
  };

  // Reset to current shift's default
  const handleResetData = () => {
    if (window.confirm('क्या आप डेटा को डिफ़ॉल्ट प्रीसेट पर रीसेट करना चाहते हैं?')) {
      handleShiftChange(activeShift);
    }
  };

  // Dynamic Seating Plan Calculation
  const seatingResult = useMemo(() => {
    return generateSeatingPlan({
      classes,
      rooms,
      pairingStrategy: 'auto',
    });
  }, [classes, rooms]);

  const handlePrint = () => {
    window.print();
  };

  // If user is pure Teacher and not on full admin view, render dedicated mobile-friendly Teacher Portal
  const isDedicatedTeacherView = isTeacher && activeTab === 'teacher-portal';

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-900 flex flex-col">
      {/* Live Absentee Real-Time Alert Toast (Shows instantly in Control Room / Principal Screen) */}
      {liveNotification && (
        <div className="fixed top-16 right-4 z-50 max-w-sm w-full bg-red-600 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-red-400/80 animate-bounce flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-xl shrink-0">
            <Radio className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold flex items-center justify-between">
              <span>लाइव अनुपस्थिति अलर्ट!</span>
              <span className="text-[10px] text-red-200">{liveNotification.time}</span>
            </div>
            <p className="mt-1 text-red-100 leading-tight">
              <strong>{liveNotification.roomName}</strong> में रोल <strong>#{liveNotification.rollNo}</strong> {liveNotification.studentName ? `(${liveNotification.studentName})` : ''} को अनुपस्थित दर्ज किया गया।
            </p>
            <div className="mt-1 text-[10px] text-red-200">
              द्वारा: {liveNotification.markedBy || 'शिक्षक'}
            </div>
          </div>
          <button
            onClick={() => setLiveNotification(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <Navbar
        examDetails={examDetails}
        setExamDetails={setExamDetails}
        activeShift={activeShift}
        handleShiftChange={handleShiftChange}
        activeTab={activeTab}
        absentCount={Object.keys(absentStudents).length}
        onResetData={handleResetData}
        onPrint={handlePrint}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenDBSync={() => setIsDBSyncOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenUserMgmt={() => setIsUserMgmtOpen(true)}
        onOpenTeacherPortal={() => setActiveTab('teacher-portal')}
      />

      {/* Main 2-Column Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          absentCount={Object.keys(absentStudents).length}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeShift={activeShift}
          handleShiftChange={handleShiftChange}
          seatingResult={seatingResult}
          onPrint={handlePrint}
          onOpenLogin={() => setIsLoginOpen(true)}
        />

        {/* Right / Center Content Area */}
        <main className="flex-1 w-full min-w-0">
          <Suspense fallback={<PageLoader />}>
          {/* Anti-Adjacent Anti-Cheating Guarantee Banner */}
          {activeTab !== 'teacher-portal' && activeTab !== 'student-home' && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm md:text-base">
                      स्मार्ट एंटी-चीटिंग पेयरिंग सक्रिय (Anti-Adjacent Active)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] sm:text-[10px] font-black tracking-wide uppercase">
                      Auto-Paired
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
                    नियम: 1 बेंच पर 2 छात्र (बायां व दायां) अलग-अलग कक्षा के हैं। मध्य कॉलम में फ्रंट रो पर शिक्षक मेज स्थित है।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <div className="px-2.5 py-1 bg-black/20 rounded-xl text-xs font-semibold backdrop-blur-sm">
                  छात्र: <span className="font-black text-amber-300">{seatingResult.totalStudents}</span>
                </div>
                <div className="px-2.5 py-1 bg-black/20 rounded-xl text-xs font-semibold backdrop-blur-sm">
                  सीटें: <span className="font-black text-white">{seatingResult.totalCapacity}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning if capacity is less */}
          {activeTab !== 'teacher-portal' && activeTab !== 'student-home' && seatingResult.unseatedCount > 0 && (
            <div className="mb-6 p-4 sm:p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs shadow-xs no-print">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-black text-sm text-rose-900">
                      कमरे की क्षमता कम है ({seatingResult.unseatedCount} छात्र बिना सीट के शेष हैं)!
                    </span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-bold text-[11px]">
                      कम से कम {Math.ceil(seatingResult.unseatedCount / 2)} और बेंच चाहिए
                    </span>
                  </div>

                  <p className="text-rose-800">
                    परीक्षा केंद्र के अंतिम कमरे <strong>"{seatingResult.lastRoomName}"</strong> तक कुल <strong>{seatingResult.totalCapacity} सीटें</strong> पूरी तरह भर चुकी हैं।
                  </p>

                  {/* Detailed Class-wise Breakdown of Unseated Students */}
                  {seatingResult.unseatedBreakdown && seatingResult.unseatedBreakdown.length > 0 && (
                    <div className="p-2.5 bg-white/80 border border-rose-200 rounded-xl space-y-1 text-[11px]">
                      <span className="font-bold text-rose-950 block">
                        सीट न मिल पाने वाले छात्रों का विवरण:
                      </span>
                      {seatingResult.unseatedBreakdown.map((ub, uIdx) => (
                        <div key={uIdx} className="flex items-center justify-between text-rose-800">
                          <span>
                            • Class <strong>{ub.className} - {ub.section}</strong> (रोल नंबर <strong>{ub.fromRoll}</strong> से <strong>{ub.toRoll}</strong>)
                          </span>
                          <span className="font-black text-rose-900">
                            {ub.count} छात्र शेष
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAuthenticated && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-600 text-[11px]">
                        समाधान: साइडबार में <strong>"Classes & Rooms"</strong> पर जाकर नए कमरे या बेंच जोड़ें।
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('classes-rooms')}
                        className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        + कमरा / बेंच जोड़ें
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Views based on active tab */}
          {activeTab === 'student-home' && (
            <StudentHomePage
              seatingResult={seatingResult}
              examDetails={examDetails}
              activeShift={activeShift}
              handleShiftChange={handleShiftChange}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenLogin={() => setIsLoginOpen(true)}
            />
          )}

          {activeTab === 'classes-rooms' && (
            !isAuthenticated ? (
              <StaffLockedGuard
                title="कक्षा और कमरे (एडमिन अनुभाग)"
                description="कक्षाएं, छात्र संख्या व कमरों का आवंटन केवल विद्यालय एडमिन द्वारा ही बदला जा सकता है। कृपया एडमिन खाते से लॉगिन करें।"
                onLogin={() => setIsLoginOpen(true)}
                onGoToStudentView={() => setActiveTab('search-student')}
              />
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <ClassManager classes={classes} setClasses={setClasses} />
                <RoomManager
                  rooms={rooms}
                  setRooms={setRooms}
                  totalStudentsRequired={seatingResult.totalStudents}
                />
              </div>
            )
          )}

          {activeTab === 'main-gate' && (
            <MainGateNotice
              seatingResult={seatingResult}
              examDetails={examDetails}
            />
          )}

          {activeTab === 'desk-chart' && (
            <RoomDeskChart
              seatingResult={seatingResult}
              examDetails={examDetails}
              absentStudents={absentStudents}
            />
          )}

          {activeTab === 'door-slips' && (
            <DoorSlips
              seatingResult={seatingResult}
              examDetails={examDetails}
            />
          )}

          {activeTab === 'search-student' && (
            <StudentFinder seatingResult={seatingResult} />
          )}

          {activeTab === 'absent-list' && (
            !isAuthenticated ? (
              <StaffLockedGuard
                title="अनुपस्थिति पत्रक (स्टाफ अनुभाग)"
                description="परीक्षा कक्ष में अनुपस्थिति दर्ज करने एवं पत्रक प्रिंट करने के लिए अधिकृत शिक्षक या एडमिन लॉगिन आवश्यक है।"
                onLogin={() => setIsLoginOpen(true)}
                onGoToStudentView={() => setActiveTab('search-student')}
              />
            ) : (
              <AbsenteeManager
                seatingResult={seatingResult}
                examDetails={examDetails}
                absentStudents={absentStudents}
                setAbsentStudents={setAbsentStudents}
              />
            )
          )}

          {activeTab === 'teacher-portal' && (
            !isAuthenticated ? (
              <StaffLockedGuard
                title="कक्ष उपस्थिति पोर्टल (शिक्षक अनुभाग)"
                description="कक्षा में लाइव अनुपस्थिति दर्ज करने के लिए संबंधित कक्ष निरीक्षक अपने मोबाइल नंबर एवं पिन से लॉगिन करें।"
                onLogin={() => setIsLoginOpen(true)}
                onGoToStudentView={() => setActiveTab('search-student')}
              />
            ) : (
              <TeacherRoomPortal
                examSession={{
                  sessionName: examDetails.examName,
                  rooms: seatingResult.rooms || [],
                  seatingData: seatingResult.seatingData,
                  dutyRoster,
                }}
                activeDate={examDetails.date}
                activeShift={activeShift}
                liveAbsentees={liveAbsentees}
                onToggleAbsent={handleToggleAbsent}
                onLogout={logout}
                onSwitchToAdminView={() => setActiveTab('main-gate')}
              />
            )
          )}

          {activeTab === 'exam-scheme' && (
            <ExamSchemeManager
              seatingResult={seatingResult}
              activeShift={activeShift}
              classes={classes}
              examDetails={examDetails}
              setExamDetails={setExamDetails}
              dutyRoster={dutyRoster}
              teachers={teachers}
            />
          )}

          {activeTab === 'teacher-duty' && (
            !isAuthenticated ? (
              <StaffLockedGuard
                title="कक्ष निरीक्षक ड्यूटी चार्ट (एडमिन अनुभाग)"
                description="शिक्षकों की परीक्षा ड्यूटी निर्धारित करने एवं आदेश पत्र प्रिंट करने के लिए व्यवस्थापक लॉगिन आवश्यक है।"
                onLogin={() => setIsLoginOpen(true)}
                onGoToStudentView={() => setActiveTab('search-student')}
              />
            ) : (
              <TeacherDutyManager
                teachers={teachers}
                setTeachers={setTeachers}
                seatingResult={seatingResult}
                activeShift={activeShift}
                dutyRoster={dutyRoster}
                setDutyRoster={setDutyRoster}
                examDetails={examDetails}
              />
            )
          )}

          {activeTab === 'result-marksheet' && (
            !isAuthenticated ? (
              <StaffLockedGuard
                title="परीक्षाफल व अंकतालिका (स्टाफ अनुभाग)"
                description="छात्रों के विषयवार प्राप्तांक भरने व मार्कशीट तैयार करने के लिए अधिकृत शिक्षक या एडमिन लॉगिन आवश्यक है।"
                onLogin={() => setIsLoginOpen(true)}
                onGoToStudentView={() => setActiveTab('search-student')}
              />
            ) : (
              <ResultMarksheetManager
                classes={classes}
                activeShift={activeShift}
                examDetails={examDetails}
                seatingResult={seatingResult}
              />
            )
          )}
          </Suspense>
        </main>
      </div>

      {/* Floating Action Button for Mobile Menu (Bottom Left) */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-30 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center gap-2 text-xs font-black transition-all active:scale-95 no-print"
      >
        <Compass className="w-4 h-4" />
        <span>मेन्यू (10 Tabs)</span>
        {Object.keys(absentStudents).length > 0 && (
          <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
            {Object.keys(absentStudents).length}
          </span>
        )}
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <p>
          Exam Seating Plan Dynamic System • Built with React, Vite & Tailwind CSS • Anti-Cheating & Dynamic Capacity Support
        </p>
      </footer>

      <Suspense fallback={null}>
        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(user) => {
            if (user.role === 'teacher') {
              setActiveTab('teacher-portal');
            }
          }}
        />

        {/* Role Management Modal (Principal & SuperAdmin) */}
        <UserManagementModal
          isOpen={isUserMgmtOpen}
          onClose={() => setIsUserMgmtOpen(false)}
        />

        {/* MongoDB Database Sync & Session Modal */}
        <DatabaseSyncModal
          isOpen={isDBSyncOpen}
          onClose={() => setIsDBSyncOpen(false)}
          currentSessionData={{
            activeShift,
            examDetails,
            classes,
            rooms,
            teachers,
            dutyRoster,
            marksData: (() => {
              try { return JSON.parse(localStorage.getItem('dynamic_exam_marks_data_v1')) || {}; } catch { return {}; }
            })(),
            subjectConfig: (() => {
              try { return JSON.parse(localStorage.getItem('dynamic_exam_subject_config_v1')) || {}; } catch { return {}; }
            })(),
          }}
          onLoadSession={handleLoadSessionFromDB}
        />
      </Suspense>
    </div>
  );
}
