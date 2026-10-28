// Preset configurations for Shift 1 (1st Meeting: 9th to 12th) and Shift 2 (2nd Meeting: 6th to 8th)

export const DEFAULT_SHIFT_1 = {
  id: 'shift_1',
  name: '1st Meeting (Shift 1: Morning)',
  timeRange: '09:30 AM - 12:00 PM',
  examName: 'Half Yearly  Examination 2026',
  schoolName: 'A B V I C Katra Shahjahanpur',
  classes: [
    // 9th (Sections A, B, C)
    { id: 'c9a', name: '9', section: 'A', subject: '', startRoll: 9101, totalStudents: 68, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'c9b', name: '9', section: 'B', subject: '', startRoll: 9201, totalStudents: 49, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'c9c', name: '9', section: 'C', subject: '', startRoll: 9301, totalStudents: 60, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'c9e', name: '9', section: 'E', subject: '', startRoll: 9401, totalStudents: 52, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    
    // 10th (Sections A, B, C)
    { id: 'c10a', name: '10', section: 'A', subject: '', startRoll: 10101, totalStudents: 54, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'c10b', name: '10', section: 'B', subject: '', startRoll: 10201, totalStudents: 51, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'c10c', name: '10', section: 'C', subject: '', startRoll: 10301, totalStudents: 46, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'c10e', name: '10', section: 'E', subject: '', startRoll: 10401, totalStudents: 43, color: 'bg-amber-100 text-amber-800 border-amber-300' },

    // 11th (Sections A, B, C)
    { id: 'c11a', name: '11', section: 'A', subject: '', startRoll: 11101, totalStudents: 70, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'c11b', name: '11', section: 'B', subject: '', startRoll: 11201, totalStudents: 60, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'c11c', name: '11', section: 'C', subject: '', startRoll: 11301, totalStudents: 23, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'c11e', name: '11', section: 'E', subject: '', startRoll: 11401, totalStudents: 44, color: 'bg-blue-100 text-blue-800 border-blue-300' },

    // 12th (Sections A, B, C)
    { id: 'c12a', name: '12', section: 'A', subject: '', startRoll: 12101, totalStudents: 62, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'c12b', name: '12', section: 'B', subject: '', startRoll: 12201, totalStudents: 64, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'c12c', name: '12', section: 'C', subject: '', startRoll: 12301, totalStudents: 30, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'c12e', name: '12', section: 'E', subject: '', startRoll: 12401, totalStudents: 27, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  ],
  rooms: [
    { id: 'r1', name: 'Room  01', benches: 20, columns: 3 },
    { id: 'r2', name: 'Room  02', benches: 20, columns: 3 },
    { id: 'r3', name: 'Room  03', benches: 20, columns: 3 },
    { id: 'r4', name: 'Room  04', benches: 20, columns: 3 },
    { id: 'r5', name: 'Room  05', benches: 20, columns: 3 },
    { id: 'r6', name: 'Room  06', benches: 20, columns: 3 },
    { id: 'r7', name: 'Room  07', benches: 20, columns: 3 },
  
    { id: 'r9', name: 'Room  09', benches: 20, columns: 3 },
    { id: 'r10', name: 'Room  10', benches: 20, columns: 3 },
    { id: 'r12', name: 'Room  12', benches: 20, columns: 3 },
    { id: 'r13', name: 'Room  13', benches: 20, columns: 3 },
    { id: 'r14', name: 'Room  14', benches: 20, columns: 3 },
    { id: 'r15', name: 'Room  15', benches: 20, columns: 3 },
    { id: 'r16', name: 'Room  16', benches: 20, columns: 3 },
    { id: 'r17', name: 'Room  17', benches: 20, columns: 3 },
    { id: 'r18', name: 'Room  18', benches: 20, columns: 3 },
    { id: 'r8', name: 'Hall 1 (08)', benches: 25, columns: 3 },
    { id: 'r11', name: 'Hall 2 (11)', benches: 25, columns: 3 },
    { id: 'r19', name: 'New Hall ', benches: 35, columns: 5 },
  ]
};

export const DEFAULT_SHIFT_2 = {
  id: 'shift_2',
  name: '2nd Meeting (Shift 2: Afternoon)',
  timeRange: '01:00 PM - 03:00 PM',
  examName: 'Half Yearly  Examination 2026',
  schoolName: 'A B V I C Katra Shahjahanpur',
  classes: [
    // 6th (Sections A, B, C)
    { id: 'c6a', name: '6', section: 'A', subject: '', startRoll: 6101, totalStudents: 65, color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { id: 'c6b', name: '6', section: 'B', subject: '', startRoll: 6201, totalStudents: 58, color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { id: 'c6c', name: '6', section: 'C', subject: '', startRoll: 6301, totalStudents: 27, color: 'bg-teal-100 text-teal-800 border-teal-300' },

    // 7th (Sections A, B, C)
    { id: 'c7a', name: '7', section: 'A', subject: '', startRoll: 7101, totalStudents: 70, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { id: 'c7b', name: '7', section: 'B', subject: '', startRoll: 7201, totalStudents: 65, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { id: 'c7c', name: '7', section: 'C', subject: '', startRoll: 7301, totalStudents: 22, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },

    // 8th (Sections A, B, C)
    { id: 'c8a', name: '8', section: 'A', subject: '', startRoll: 8101, totalStudents: 60, color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'c8b', name: '8', section: 'B', subject: '', startRoll: 8201, totalStudents: 55, color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'c8c', name: '8', section: 'C', subject: '', startRoll: 8301, totalStudents: 48, color: 'bg-rose-100 text-rose-800 border-rose-300' },
  ],
  rooms: [
     { id: 'r1', name: 'Room  01', benches: 20, columns: 3 },
    { id: 'r2', name: 'Room  02', benches: 20, columns: 3 },
    { id: 'r3', name: 'Room  03', benches: 20, columns: 3 },
    { id: 'r4', name: 'Room  04', benches: 20, columns: 3 },
    { id: 'r5', name: 'Room  05', benches: 20, columns: 3 },
    { id: 'r6', name: 'Room  06', benches: 20, columns: 3 },
    { id: 'r7', name: 'Room  07', benches: 20, columns: 3 },
    { id: 'r8', name: 'Room  08', benches: 20, columns: 3 },
  
    { id: 'r9', name: 'Room  09',  benches: 20, columns: 3 },
    { id: 'r10', name: 'Room  10', benches: 20, columns: 3 },
    { id: 'r11', name: 'Room  11', benches: 20, columns: 3 },
    { id: 'r12', name: 'Room  12', benches: 20, columns: 3 },
    { id: 'r13', name: 'Room  13', benches: 20, columns: 3 },
    { id: 'r14', name: 'Room  14', benches: 20, columns: 3 },
    { id: 'r15', name: 'Room  15', benches: 20, columns: 3 },
    { id: 'r16', name: 'Room  16', benches: 20, columns: 3 },
    { id: 'r17', name: 'Room  17', benches: 20, columns: 3 },
    { id: 'r18', name: 'Room  18', benches: 20, columns: 3 },
    
  ]
};

export const COLOR_PALETTE = [
  'bg-blue-100 text-blue-900 border-blue-400',
  'bg-emerald-100 text-emerald-900 border-emerald-400',
  'bg-amber-100 text-amber-900 border-amber-400',
  'bg-purple-100 text-purple-900 border-purple-400',
  'bg-rose-100 text-rose-900 border-rose-400',
  'bg-cyan-100 text-cyan-900 border-cyan-400',
  'bg-indigo-100 text-indigo-900 border-indigo-400',
  'bg-orange-100 text-orange-900 border-orange-400',
  'bg-teal-100 text-teal-900 border-teal-400',
  'bg-pink-100 text-pink-900 border-pink-400',
];
