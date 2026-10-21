import React, { useState } from 'react';
import { Search, UserCheck, Armchair, DoorOpen, Sparkles, BookOpen } from 'lucide-react';

export default function StudentFinder({ seatingResult }) {
  const { rooms = [] } = seatingResult;
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all seated student records with their room and bench context
  const allStudents = [];
  rooms.forEach((r) => {
    r.benches.forEach((b) => {
      if (b.leftSeat) {
        allStudents.push({
          ...b.leftSeat,
          roomName: r.roomName,
          benchNumber: b.benchNumber,
          companion: b.rightSeat,
        });
      }
      if (b.rightSeat) {
        allStudents.push({
          ...b.rightSeat,
          roomName: r.roomName,
          benchNumber: b.benchNumber,
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
          (s.formNumber && s.formNumber.toString().includes(query)) ||
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(query)) ||
          (s.mobile && s.mobile.includes(query)) ||
          `${s.className}-${s.section}`.toLowerCase().includes(query) ||
          (s.subject && s.subject.toLowerCase().includes(query))
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-2 sm:mb-3">
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-800">
            विद्यार्थी खोजें (Roll No or Name Seat Finder)
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            गेट पर किसी भी छात्र का रोल नंबर, फॉर्म नंबर या नाम डालें और तुरंत कमरा व बेंच नंबर देखें
          </p>

          <div className="mt-4 sm:mt-5 relative">
            <input
              type="text"
              placeholder="रोल नंबर या छात्र का नाम डालें (उदा. 9105, ABHAY, YADAV)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 focus:outline-none shadow-sm text-sm font-bold text-slate-800 placeholder:font-normal"
              autoFocus
            />
            <Search className="w-5 h-5 text-indigo-400 absolute left-3.5 top-3.5 sm:top-4" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 sm:top-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded-lg bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {query && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>खोज परिणाम: {matchedStudents.length} छात्र मिले</span>
          </div>

          {matchedStudents.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              कोई छात्र नहीं मिला। कृपया रोल नंबर सही जांचें।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedStudents.slice(0, 30).map((st, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm hover:border-indigo-400 transition-all"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      {st.name ? (
                        <>
                          <h4 className="text-sm font-black text-slate-900 leading-tight">
                            {st.name}
                          </h4>
                          {st.fatherName && (
                            <p className="text-[10px] text-slate-500 font-semibold">
                              पिता: {st.fatherName}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          रोल नंबर
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-lg text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200">
                      #{st.rollNo}
                    </span>
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">कक्षा एवं सेक्शन:</span>
                      <span className="font-bold text-slate-800">
                        Class {st.className} - {st.section}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">विषय:</span>
                      <span className="font-medium text-slate-700">{st.subject}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">कमरा / हॉल:</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-extrabold rounded">
                        🚪 {st.roomName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">बेंच नंबर:</span>
                      <span className="font-mono font-bold text-slate-900">
                        बेंच #{st.benchNumber} ({st.seatPosition} Seat)
                      </span>
                    </div>
                  </div>

                  {/* Companion Info */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>बेंच साथी (Companion):</span>
                    {st.companion ? (
                      <span className="font-semibold text-emerald-700">
                        Class {st.companion.className}-{st.companion.section} (#{st.companion.rollNo})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">सीट खाली (Vacant)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-xs">
          ऊपर दिए गए बॉक्स में रोल नंबर टाइप करें (जैसे 901, 1005 आदि) ताकि छात्र की बेंच और कमरा तुरंत प्रदर्शित हो सके।
        </div>
      )}
    </div>
  );
}
