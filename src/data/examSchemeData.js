// Official UP Board Subject Codes and School Exam Scheme for A B V I C Miranpur Katra Shahjahanpur

export const UP_BOARD_SUBJECT_CODES = {
  // High School (9th & 10th)
  '901': { code: '901', name: 'हिन्दी', englishName: 'Hindi', level: 'High School' },
  '917': { code: '917', name: 'अंग्रेजी', englishName: 'English', level: 'High School' },
  '928': { code: '928', name: 'गणित', englishName: 'Mathematics', level: 'High School' },
  '931': { code: '931', name: 'विज्ञान', englishName: 'Science', level: 'High School' },
  '932': { code: '932', name: 'सामाजिक विज्ञान', englishName: 'Social Science (SST)', level: 'High School' },
  '935': { code: '935', name: 'वाणिज्य', englishName: 'Commerce', level: 'High School' },
  '936': { code: '936', name: 'चित्रकला', englishName: 'Art / Drawing', level: 'High School' },
  '941': { code: '941', name: 'कम्प्यूटर', englishName: 'Computer', level: 'High School' },

  // Intermediate (11th & 12th)
  '102': { code: '102', name: 'सा० हिन्दी', englishName: 'General Hindi', level: 'Intermediate' },
  '117': { code: '117', name: 'अंग्रेजी', englishName: 'English', level: 'Intermediate' },
  '131': { code: '131', name: 'गणित', englishName: 'Mathematics', level: 'Intermediate' },
  '144': { code: '144', name: 'कम्प्यूटर', englishName: 'Computer', level: 'Intermediate' },
  '151': { code: '151', name: 'भौ० विज्ञान', englishName: 'Physics', level: 'Intermediate' },
  '152': { code: '152', name: 'रसायन विज्ञान', englishName: 'Chemistry', level: 'Intermediate' },
  '153': { code: '153', name: 'जीव विज्ञान', englishName: 'Biology', level: 'Intermediate' },
  '156': { code: '156', name: 'बहीखाता', englishName: 'Accountancy', level: 'Intermediate' },
  '157': { code: '157', name: 'व्यवसाय अध्ययन', englishName: 'Business Studies', level: 'Intermediate' },
};

export const EXAM_SCHEME_METADATA = {
  schoolName: 'A B V I C MIRANPUR KATRA SHAHJAHANPUR',
  examTitle: 'HALF YEARLY EXAM 2026-27',
  practicalNote: 'THE DATES OF PRACTICAL EXAMINATION INTERMEDIATE & HIGH SCHOOL ARE AS FOLLOWS: 21, 22, 24, 26 OCTOBER',
  shift1Time: '1st MEETING 09:30 TO 12:00',
  shift2Time: '2nd MEETING 01:00 TO 03:00',
  authorities: {
    examHeads: ['MR. BRAHMADHAR MISHRA', 'MR. RAHUL JAUHARI'],
    principal: 'MR. PRADEEP SINGH',
  },
};

export const EXAM_TIMETABLE = [
  {
    id: 'd1',
    date: '31-10-26',
    fullDate: '2026-10-31',
    day: 'SATURDAY',
    shift_1: {
      '9': [{ name: 'SCIENCE', code: '931' }],
      '10': [{ name: 'SST', code: '932' }],
      '11': [{ name: 'ENGLISH', code: '117' }],
      '12': [
        { name: 'MATH', code: '131' },
        { name: 'BIOLOGY', code: '153' },
      ],
    },
    shift_2: {
      '6': [{ name: 'ENGLISH' }],
      '7': [{ name: 'SANSKRIT' }],
      '8': [{ name: 'MATH' }],
    },
  },
  {
    id: 'd2',
    date: '02-11-26',
    fullDate: '2026-11-02',
    day: 'MONDAY',
    shift_1: {
      '9': [
        { name: 'COMMERCE', code: '935' },
        { name: 'COMPUTER', code: '941' },
        { name: 'ART', code: '936' },
      ],
      '10': [{ name: 'MATH', code: '928' }],
      '11': [{ name: 'HINDI', code: '102' }],
      '12': [
        { name: 'PHYSICS', code: '151' },
        { name: 'ACCOUNTANCY', code: '156' },
      ],
    },
    shift_2: {
      '6': [{ name: 'SCIENCE' }],
      '7': [{ name: 'SSC' }],
      '8': [
        { name: 'COMMERCE', code: '935' },
        { name: 'COMPUTER', code: '941' },
        { name: 'ART', code: '936' },
      ],
    },
  },
  {
    id: 'd3',
    date: '03-11-26',
    fullDate: '2026-11-03',
    day: 'TUESDAY',
    shift_1: {
      '9': [{ name: 'MATH', code: '928' }],
      '10': [{ name: 'HINDI', code: '901' }],
      '11': [
        { name: 'CHEMISTRY', code: '152' },
        { name: 'BUSS. STUDY', code: '157' },
      ],
      '12': [{ name: 'COMPUTER', code: '144' }],
    },
    shift_2: {
      '6': [{ name: 'SANSKRIT' }],
      '7': [{ name: 'ENGLISH' }],
      '8': [{ name: 'SSC' }],
    },
  },
  {
    id: 'd4',
    date: '04-11-26',
    fullDate: '2026-11-04',
    day: 'WEDNESDAY',
    shift_1: {
      '9': [{ name: 'HINDI', code: '901' }],
      '10': [
        { name: 'COMMERCE', code: '935' },
        { name: 'COMPUTER', code: '941' },
        { name: 'ART', code: '936' },
      ],
      '11': [{ name: 'COMPUTER', code: '144' }],
      '12': [{ name: 'ENGLISH', code: '117' }],
    },
    shift_2: {
      '6': [{ name: 'MATH' }],
      '7': [
        { name: 'COMMERCE', code: '935' },
        { name: 'COMPUTER', code: '941' },
        { name: 'ART', code: '936' },
      ],
      '8': [{ name: 'ENGLISH' }],
    },
  },
  {
    id: 'd5',
    date: '05-11-26',
    fullDate: '2026-11-05',
    day: 'THURSDAY',
    shift_1: {
      '9': [{ name: 'SST', code: '932' }],
      '10': [{ name: 'ENGLISH', code: '917' }],
      '11': [
        { name: 'PHYSICS', code: '151' },
        { name: 'ACCOUNTANCY', code: '156' },
      ],
      '12': [
        { name: 'CHEMISTRY', code: '152' },
        { name: 'BUSS. STUDY', code: '157' },
      ],
    },
    shift_2: {
      '6': [{ name: 'HINDI' }],
      '7': [{ name: 'SCIENCE' }],
      '8': [{ name: 'SANSKRIT' }],
    },
  },
  {
    id: 'd6',
    date: '06-11-26',
    fullDate: '2026-11-06',
    day: 'FRIDAY',
    shift_1: {
      '9': [{ name: 'ENGLISH', code: '917' }],
      '10': [{ name: 'SCIENCE', code: '931' }],
      '11': [
        { name: 'MATH', code: '131' },
        { name: 'BIOLOGY', code: '153' },
      ],
      '12': [{ name: 'HINDI', code: '102' }],
    },
    shift_2: {
      '6': [{ name: 'SSC' }],
      '7': [{ name: 'MATH' }],
      '8': [{ name: 'HINDI' }],
    },
  },
  {
    id: 'd7',
    date: '07-11-26',
    fullDate: '2026-11-07',
    day: 'SATURDAY',
    shift_1: {
      // No shift 1 on Saturday 7th Nov
    },
    shift_2: {
      '6': [
        { name: 'COMMERCE', code: '935' },
        { name: 'COMPUTER', code: '941' },
        { name: 'ART', code: '936' },
      ],
      '7': [{ name: 'HINDI' }],
      '8': [{ name: 'SCIENCE' }],
    },
  },
];
