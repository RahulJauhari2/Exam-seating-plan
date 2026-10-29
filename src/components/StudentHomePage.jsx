import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Compass, 
  Calendar, 
  Clock, 
  MapPin, 
  Armchair, 
  DoorOpen, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  HeartHandshake, 
  GraduationCap, 
  Sun, 
  Sunset,
  ChevronRight,
  Smile,
  FileText,
  UserCheck,
  Printer
} from 'lucide-react';
import { EXAM_TIMETABLE, EXAM_SCHEME_METADATA } from '../data/examSchemeData';

export default function StudentHomePage({
  seatingResult = {},
  examDetails = {},
  activeShift = 'shift_1',
  handleShiftChange,
  onNavigateTab,
  onOpenLogin
}) {
  const { rooms = [] } = seatingResult;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // Collect all seated student records with their room and bench context for instant search
  const allStudents = [];
  rooms.forEach((r) => {
    (r.benches || []).forEach((b) => {
      if (b.leftSeat) {
        allStudents.push({
          ...b.leftSeat,
          roomName: r.roomName,
          benchNumber: b.benchNumber,
          side: 'बायां सीट (Left Seat)',
          companion: b.rightSeat,
        });
      }
      if (b.rightSeat) {
        allStudents.push({
          ...b.rightSeat,
          roomName: r.roomName,
          benchNumber: b.benchNumber,
          side: 'दायां सीट (Right Seat)',
          companion: b.leftSeat,
        });
      }
    });
  });

  const query = searchQuery.trim().toLowerCase();
  const matchedStudents = query
    ? allStudents.filter(
        (s) =>
          (s.rollNo && s.rollNo.toString().includes(query)) ||
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(query)) ||
          (s.formNumber && s.formNumber.toString().includes(query))
      )
    : [];

  // Storytelling Exam Day 4-Step Journey
  const journeySteps = [
    {
      step: '01',
      time: 'सुबह घर पर',
      title: 'शांत मन व तैयारी',
      icon: '🌅',
      desc: 'रात में भरपूर नींद लें। सुबह हल्का नाश्ता करें। अपना प्रवेश पत्र (Admit Card), 2 नीले/काले पेन और पारदर्शी पानी की बोतल किट में जांच लें।',
      tips: 'गहरी सांस लें — आपने साल भर मेहनत की है, परिणाम अच्छा ही होगा!',
    },
    {
      step: '02',
      time: 'समय से 30 मिनट पूर्व',
      title: 'विद्यालय मुख्य द्वार',
      icon: '🏫',
      desc: 'परीक्षा समय से कम से कम 30 मिनट पहले विद्यालय पहुंचें। मुख्य द्वार पर लगे गेट नोटिस या इसी मोबाइल पोर्टल पर अपना कमरा नंबर चेक करें।',
      tips: 'भीड़ से बचें और सीधे अपने आवंटित कमरे की ओर शांति से बढ़ें।',
    },
    {
      step: '03',
      time: '15 मिनट पूर्व',
      title: 'अपनी सीट ग्रहण करना',
      icon: '🪑',
      desc: 'अपने कमरे में बेंच पर अपना रोल नंबर देखें। बायां या दायां सीट देखकर बैठें। ओएमआर शीट और उत्तर-पुस्तिका के फ्रंट पेज को सावधानीपूर्वक भरें।',
      tips: 'रोल नंबर व विषय कोड भरने में कोई संशय हो तो कक्ष निरीक्षक से पूछें।',
    },
    {
      step: '04',
      time: 'परीक्षा के दौरान',
      title: 'सफलता के 5 मंत्र',
      icon: '✍️',
      desc: 'पहले 15 मिनट प्रश्न-पत्र को ध्यान से पढ़ें। आसान प्रश्न पहले हल करें। स्पष्ट लिखावट रखें और अंतिम 10 मिनट में सभी उत्तरों की जांच अवश्य करें।',
      tips: 'सकारात्मक सोचें — हर प्रश्न आपके अभ्यास का हिस्सा है!',
    },
  ];

  // Exam Schedule quick class filter
  const classOptions = ['all', '6', '7', '8', '9', '10', '11', '12'];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      
      {/* ========================================================================= */}
      {/* 1. HERO STORY & INSPIRATION BANNER                                       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 text-white shadow-xl p-6 sm:p-10 border border-indigo-800/80">
        {/* Background decorative shapes */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-amber-400 text-indigo-950 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>विद्यार्थी परीक्षा सहायता केंद्र</span>
            </span>
            <span className="px-3 py-1 bg-white/15 backdrop-blur-md text-indigo-100 rounded-full text-xs font-bold border border-white/20">
              {examDetails.examName || 'सत्र 2026-27'}
            </span>
          </div>

          {/* School Name & Story Title */}
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight text-white">
            सफलता की उड़ान — <span className="text-amber-300">आत्मविश्वास और एकाग्रता</span> के साथ!
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-indigo-200 mt-1">
            {examDetails.schoolName || 'A B V I C MIRANPUR KATRA SHAHJAHANPUR'}
          </p>

          {/* Warm Welcoming Story Message */}
          <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm text-indigo-50 leading-relaxed">
            <p>
              <strong>"प्रिय विद्यार्थियों,</strong> परीक्षा आपकी योग्यता, अनुशासन और वर्ष भर की लगन को प्रमाणित करने का एक सुनहरा अवसर है। मन से डर और संकोच को निकाल दें; शांत चित्त और अटूट आत्मविश्वास के साथ परीक्षा कक्ष में प्रवेश करें। आपका हर प्रयास आपको आपकी मंजिल के करीब ले जाएगा। पूरे विद्यालय परिवार की शुभकामनाएं आपके साथ हैं!"
            </p>
          </div>

          {/* Quick Stats & Shift Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('quick-seat-finder');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>अपना रोल नंबर व सीट खोजें</span>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab('exam-scheme')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>परीक्षा टाइम-टेबल देखें</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INSTANT 1-TAP SEAT FINDER WIDGET                                       */}
      {/* ========================================================================= */}
      <div id="quick-seat-finder" className="bg-white rounded-3xl border-2 border-indigo-100 shadow-lg p-5 sm:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3 shadow-inner">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800">
            अपना परीक्षा कक्ष व सीट जानें (Seat Finder)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            नीचे बॉक्स में अपना रोल नंबर या नाम टाइप करें और तुरंत देखें आपका कमरा और बेंच कौन सा है
          </p>

          {/* Search Box */}
          <div className="mt-5 relative">
            <input
              type="text"
              placeholder="रोल नंबर या नाम डालें (उदा. 9105, 1012, ABHAY, YADAV)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3.5 sm:py-4 pl-12 sm:pl-14 rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm text-sm sm:text-base font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
            />
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 absolute left-4 top-4" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-700 font-bold px-2.5 py-1.5 rounded-lg bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Search Results */}
        {query && (
          <div className="mt-6 pt-6 border-t border-slate-100 max-w-3xl mx-auto">
            {matchedStudents.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">कोई छात्र रिकॉर्ड नहीं मिला!</p>
                <p className="text-xs text-slate-500 mt-1">
                  कृपया अपना रोल नंबर या स्पेलिंग दोबारा जांचें, अथवा मुख्य गेट नोटिस बोर्ड देखें।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>खोज परिणाम: {matchedStudents.length} छात्र मिले</span>
                  <span className="text-emerald-700 font-black">✓ सीट आवंटित</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedStudents.slice(0, 6).map((st, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 rounded-2xl border-2 border-indigo-300 p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      {/* Student Header */}
                      <div className="flex items-start justify-between border-b border-indigo-100 pb-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                            कक्षा {st.className} - सेक्शन {st.section}
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-0.5">
                            {st.name || `छात्र Roll #${st.rollNo}`}
                          </h4>
                          {st.fatherName && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              पिता: {st.fatherName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-xs block">
                            रोल #{st.rollNo}
                          </span>
                          {st.subject && (
                            <span className="text-[10px] text-slate-500 font-bold block mt-1 truncate max-w-[120px]">
                              {st.subject}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Location Details Box */}
                      <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                            <DoorOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">परीक्षा कमरा</span>
                            <span className="text-sm font-black text-slate-900">{st.roomName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                            <Armchair className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">बेंच नंबर</span>
                            <span className="text-sm font-black text-indigo-700">बेंच #{st.benchNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Seat Side & Anti-Adjacent Partner Info */}
                      <div className="text-[11px] space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>बैठने का स्थान:</span>
                          <span className="text-indigo-900 font-black">{st.side}</span>
                        </div>
                        {st.companion && (
                          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-indigo-100">
                            <span>बेंच सहपाठी:</span>
                            <span className="font-semibold text-slate-700">
                              कक्षा {st.companion.className} ({st.companion.name || `रोल #${st.companion.rollNo}`})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. STORYTELLING EXAM DAY JOURNEY (4 SIMPLE STEPS)                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-800">
              परीक्षा दिवस की यात्रा — 4 सरल कदम
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            परीक्षा की सुबह से लेकर हॉल में पेपर जमा करने तक का मार्गदर्शक
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {journeySteps.map((step, idx) => (
            <div
              key={idx}
              className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-white group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 border border-slate-200 group-hover:border-indigo-600 flex items-center justify-center text-lg font-black shadow-xs transition-all">
                    {step.icon}
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    कदम {step.step}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">
                  {step.time}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80">
                <span className="text-[10px] text-indigo-700 font-bold block">
                  💡 टिप: {step.tips}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TODAY'S EXAM SCHEDULE & CLASS FILTER                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-800">
                परीक्षा समय-सारिणी व विषय (Schedule)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              अपनी कक्षा का चयन करें और देखें आगामी परीक्षा तिथियां
            </p>
          </div>

          {/* Shift Indicator Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Shift 1 (9th-12th): 09:30 AM</span>
            </span>
            <span className="px-3 py-1 bg-orange-50 border border-orange-200 text-orange-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Sunset className="w-3.5 h-3.5 text-orange-500" />
              <span>Shift 2 (6th-8th): 01:00 PM</span>
            </span>
          </div>
        </div>

        {/* Class Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap mr-1">कक्षा चुनें:</span>
          {classOptions.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedClassFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedClassFilter === c
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {c === 'all' ? 'सभी कक्षाएं (All)' : `कक्षा ${c}th`}
            </button>
          ))}
        </div>

        {/* Timetable Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAM_TIMETABLE.map((row) => {
            const shift1Subjects = row.shift_1 || {};
            const shift2Subjects = row.shift_2 || {};

            // Check if selected class has an exam on this date
            const hasExamInSelectedClass = selectedClassFilter === 'all' || 
              (shift1Subjects[selectedClassFilter] && shift1Subjects[selectedClassFilter].length > 0) ||
              (shift2Subjects[selectedClassFilter] && shift2Subjects[selectedClassFilter].length > 0);

            if (!hasExamInSelectedClass) return null;

            return (
              <div
                key={row.id}
                className="bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-lg text-xs font-black">
                      {row.date}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{row.day}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {row.fullDate}
                  </span>
                </div>

                {/* Shift 1 subjects */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>प्रातः पाली (Shift 1: 9th-12th)</span>
                  </span>
                  <div className="space-y-1 text-xs">
                    {['9', '10', '11', '12'].map((g) => {
                      if (selectedClassFilter !== 'all' && selectedClassFilter !== g) return null;
                      const subs = shift1Subjects[g] || [];
                      return (
                        <div key={g} className="flex items-center justify-between bg-white p-1.5 px-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-600">कक्षा {g}th:</span>
                          <span className="font-black text-indigo-950 truncate max-w-[180px]">
                            {subs.map((s) => s.name).join(' / ') || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shift 2 subjects */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] font-black uppercase text-orange-800 tracking-wider flex items-center gap-1">
                    <Sunset className="w-3 h-3 text-orange-500" />
                    <span>द्वितीय पाली (Shift 2: 6th-8th)</span>
                  </span>
                  <div className="space-y-1 text-xs">
                    {['6', '7', '8'].map((g) => {
                      if (selectedClassFilter !== 'all' && selectedClassFilter !== g) return null;
                      const subs = shift2Subjects[g] || [];
                      return (
                        <div key={g} className="flex items-center justify-between bg-white p-1.5 px-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-600">कक्षा {g}th:</span>
                          <span className="font-black text-indigo-950 truncate max-w-[180px]">
                            {subs.map((s) => s.name).join(' / ') || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => onNavigateTab && onNavigateTab('exam-scheme')}
            className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>ऑफिशियल A4 परीक्षा स्कीम प्रिंट करें</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. DOS & DON'TS / EXAM RULES                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What to Bring */}
        <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-600 text-white rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-emerald-950">
              परीक्षा कक्ष में क्या साथ लाएं (अनुमति)
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-emerald-900 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>मूल प्रवेश पत्र (Admit Card / Registration Slip)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>पारदर्शी पाउच में 2 नीले/काले बॉल पेन, पेंसिल, स्केल, रबड़</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>साधारण पारदर्शी पानी की बोतल</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>विद्यालय की पूर्ण निर्धारित गणवेश (Uniform)</span>
            </li>
          </ul>
        </div>

        {/* What NOT to Bring */}
        <div className="bg-rose-50/70 border-2 border-rose-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-600 text-white rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-rose-950">
              क्या सख्त प्रतिबंधित है (Not Allowed)
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-rose-900 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>मोबाइल फोन, स्मार्ट वॉच, डिजिटल कलाई घड़ी अथवा ईयरफोन</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>कैलकुलेटर या कोई भी इलेक्ट्रॉनिक गैजेट</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>किताबें, नोट्स, पर्ची अथवा कागज के टुकड़े</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>परीक्षा हॉल में किसी अन्य छात्र से बात करना या सामग्री मांगना</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. HELPDESK & CONTROL ROOM SUPPORT                                       */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <span className="px-3 py-1 bg-white/20 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            हेल्पलाइन व सहायता
          </span>
          <h3 className="text-base sm:text-xl font-black">
            रोल नंबर या कमरा खोजने में कोई समस्या है?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            यदि आपको अपनी सीट, कमरा या विषय कोड में कोई भी संदेह हो, तो घबराएं नहीं। विद्यालय के मुख्य द्वार पर स्थापित <strong>"परीक्षा नियंत्रण कक्ष (Control Room)"</strong> अथवा ड्यूटी पर उपस्थित शिक्षक से तुरंत सहायता लें।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab && onNavigateTab('main-gate')}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>गेट नोटिस बोर्ड देखें</span>
          </button>
          
          <button
            onClick={onOpenLogin}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>स्टाफ लॉगिन</span>
          </button>
        </div>
      </div>

    </div>
  );
}
