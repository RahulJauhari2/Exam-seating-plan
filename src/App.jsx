import React, { useState, useMemo } from 'react';
import { DEFAULT_SHIFT_1, DEFAULT_SHIFT_2 } from './data/defaultData';
import { generateSeatingPlan } from './utils/seatingAlgorithm';
import Navbar from './components/Navbar';
import RightSidebar from './components/RightSidebar';
import ClassManager from './components/ClassManager';
import RoomManager from './components/RoomManager';
import MainGateNotice from './components/MainGateNotice';
import RoomDeskChart from './components/RoomDeskChart';
import DoorSlips from './components/DoorSlips';
import StudentFinder from './components/StudentFinder';
import AbsenteeManager from './components/AbsenteeManager';
import { AlertTriangle, ShieldCheck, Compass } from 'lucide-react';

export default function App() {
  // Active shift state: 'shift_1' (9th-12th) or 'shift_2' (6th-8th)
  const [activeShift, setActiveShift] = useState('shift_1');

  // Absent students state: { [rollNo]: true }
  const [absentStudents, setAbsentStudents] = useState({});

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Exam details state
  const [examDetails, setExamDetails] = useState({
    schoolName: DEFAULT_SHIFT_1.schoolName,
    examName: DEFAULT_SHIFT_1.examName,
    timeRange: DEFAULT_SHIFT_1.timeRange,
    date: '2026-10-21',
  });

  // Dynamic Classes & Rooms
  const [classes, setClasses] = useState(DEFAULT_SHIFT_1.classes);
  const [rooms, setRooms] = useState(DEFAULT_SHIFT_1.rooms);

  // Active view tab
  const [activeTab, setActiveTab] = useState('main-gate'); // Open to Main Gate by default or user choice

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

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-900 flex flex-col">
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
      />

      {/* Main 2-Column Container (Left: Content, Right: Navigation Sidebar) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left / Center Content Area */}
        <main className="flex-1 w-full min-w-0">
          
          {/* Anti-Adjacent Anti-Cheating Guarantee Banner */}
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

          {/* Warning if capacity is less */}
          {seatingResult.unseatedCount > 0 && (
            <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-3 no-print">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold text-sm block">कमरे की क्षमता कम है!</span>
                <span>
                  {seatingResult.unseatedCount} छात्र सीट न मिलने के कारण शेष हैं। कृपया "कमरे और क्षमता" में जाकर और कमरे या बेंच जोड़ें।
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Views based on active tab */}
          {activeTab === 'classes-rooms' && (
            <div className="space-y-6 sm:space-y-8">
              <ClassManager classes={classes} setClasses={setClasses} />
              <RoomManager
                rooms={rooms}
                setRooms={setRooms}
                totalStudentsRequired={seatingResult.totalStudents}
              />
            </div>
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
            <AbsenteeManager
              seatingResult={seatingResult}
              examDetails={examDetails}
              absentStudents={absentStudents}
              setAbsentStudents={setAbsentStudents}
            />
          )}
        </main>

        {/* Right Navigation Sidebar (Desktop sticky + Mobile slide-over drawer) */}
        <RightSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          absentCount={Object.keys(absentStudents).length}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeShift={activeShift}
          handleShiftChange={handleShiftChange}
          seatingResult={seatingResult}
          onPrint={handlePrint}
        />
      </div>

      {/* Floating Action Button for Mobile Menu */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center gap-2 text-xs font-black transition-all active:scale-95 no-print"
      >
        <Compass className="w-4 h-4" />
        <span>मेन्यू (6 Tabs)</span>
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
    </div>
  );
}
