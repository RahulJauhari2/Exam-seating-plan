import React, { useState, useMemo } from 'react';
import { DEFAULT_SHIFT_1, DEFAULT_SHIFT_2 } from './data/defaultData';
import { generateSeatingPlan } from './utils/seatingAlgorithm';
import Navbar from './components/Navbar';
import ClassManager from './components/ClassManager';
import RoomManager from './components/RoomManager';
import MainGateNotice from './components/MainGateNotice';
import RoomDeskChart from './components/RoomDeskChart';
import DoorSlips from './components/DoorSlips';
import StudentFinder from './components/StudentFinder';
import AbsenteeManager from './components/AbsenteeManager';
import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function App() {
  // Active shift state: 'shift_1' (9th-12th) or 'shift_2' (6th-8th)
  const [activeShift, setActiveShift] = useState('shift_1');

  // Absent students state: { [rollNo]: true }
  const [absentStudents, setAbsentStudents] = useState({});

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
      {/* Top Navigation */}
      <Navbar
        examDetails={examDetails}
        setExamDetails={setExamDetails}
        activeShift={activeShift}
        handleShiftChange={handleShiftChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        absentCount={Object.keys(absentStudents).length}
        onResetData={handleResetData}
        onPrint={handlePrint}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Anti-Adjacent Anti-Cheating Guarantee Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">
                  स्मार्ट एंटी-चीटिंग पेयरिंग सक्रिय (Anti-Adjacent Active)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wide uppercase">
                  Auto-Paired
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                नियम: एक डेस्क पर दोनों छात्र अलग-अलग क्लास / सेक्शन के हैं (जैसे 9th + 11th, 10th + 12th). शेष बचे छात्रों को तीसरी क्लास के साथ मिलाया गया है।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 bg-black/20 rounded-xl text-xs font-semibold backdrop-blur-sm">
              कुल छात्र: <span className="font-black text-amber-300">{seatingResult.totalStudents}</span>
            </div>
            <div className="px-3 py-1.5 bg-black/20 rounded-xl text-xs font-semibold backdrop-blur-sm">
              कमरा क्षमता: <span className="font-black text-white">{seatingResult.totalCapacity}</span>
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
                {seatingResult.unseatedCount} छात्र सीट न मिलने के कारण शेष हैं। कृपया "कमरे और क्षमता" टैब में जाकर और कमरे या बेंच जोड़ें।
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Views based on active tab */}
        {activeTab === 'classes-rooms' && (
          <div className="space-y-8">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <p>
          Exam Seating Plan Dynamic System • Built with React, Vite & Tailwind CSS • Anti-Cheating & Dynamic Capacity Support
        </p>
      </footer>
    </div>
  );
}
