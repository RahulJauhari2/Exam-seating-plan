import * as XLSX from 'xlsx';
import { COLOR_PALETTE } from '../data/defaultData';
import { UP_BOARD_SUBJECT_CODES } from '../data/examSchemeData';

/**
 * Flexible normalizer for UP Board CSV/Excel column headers
 */
function findValue(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
    // Also check case-insensitive
    const lowerKey = k.toLowerCase();
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().replace(/[\s_\-]/g, '') === lowerKey.replace(/[\s_\-]/g, '')) {
        const val = String(row[rowKey]).trim();
        if (val !== '') return val;
      }
    }
  }
  return '';
}

/**
 * Parse raw rows from UP Board official portal export into standardized student objects
 * @param {Array} rawRows - Array of row objects from Excel/CSV
 * @param {number} perSection - Number of students per section (default 50)
 * @param {boolean} resetRollPerSection - If true, roll numbers in each section start from 1 (1, 2, 3...) for anonymous copy checking
 */
export function processUPBoardRows(rawRows, perSection = 50, resetRollPerSection = true) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { success: false, message: 'एक्सेल फाइल में कोई डेटा नहीं मिला।' };
  }

  const studentsByClass = {};
  let totalParsed = 0;

  rawRows.forEach((row, idx) => {
    // 1. Identify Class
    const clsVal = findValue(row, 'Class', 'कक्षा', 'grade', 'className') || '9';
    // Clean class string (e.g., '09', 'Class 9', '9th' -> '9')
    const matchClass = clsVal.match(/\d+/);
    const grade = matchClass ? matchClass[0] : clsVal;

    // 2. Identify Form Number / Roll Number
    const formNum = findValue(row, 'FormNumber', 'FormNum', 'RollNumber', 'RollNo', 'SrNo', 'Roll') || String(idx + 1);
    const parsedRoll = parseInt(formNum) || (idx + 1);

    // 3. Name & Family
    const candidateName = findValue(row, 'CandidateName', 'StudentName', 'Name', 'विद्यार्थी का नाम') || `Student ${parsedRoll}`;
    const fatherName = findValue(row, 'FatherName', 'Father', 'पिता का नाम') || '';
    const motherName = findValue(row, 'MotherName', 'Mother', 'माता का नाम') || '';
    const candidateNameHindi = findValue(row, 'CandidateNameKruti', 'NameHindi', 'HindiName') || '';

    // 4. Demographics & Section
    const gender = findValue(row, 'Gender', 'लिंग') || '1'; // 1 = Male, 2 = Female
    const explicitSec = findValue(row, 'Section', 'वर्ग', 'शाखा', 'Sec', 'sec');
    const rawMedium = findValue(row, 'Medium', 'माध्यम', 'Med');
    let medium = '';
    if (rawMedium) {
      medium = (rawMedium === '2' || String(rawMedium).toLowerCase().startsWith('eng') || String(rawMedium).toUpperCase() === 'E') ? 'English' : 'Hindi';
    } else if (explicitSec) {
      const secUp = String(explicitSec).toUpperCase().trim();
      if (secUp === 'E' || (['6', '7', '8'].includes(grade) && secUp === 'C')) {
        medium = 'English';
      } else {
        medium = 'Hindi';
      }
    } else {
      medium = 'Hindi';
    }

    const explicitSub = findValue(row, 'Subject', 'विषय', 'Stream', 'stream', 'वर्ग_विषय') || '';
    const dob = findValue(row, 'ddmmyyyy', 'DOB', 'DateOfBirth', 'जन्म तिथि') || '';
    const mobile = findValue(row, 'MobileNumber', 'Mobile', 'Phone') || '';
    const schoolCode = findValue(row, 'SchoolCode', 'School') || '1060';
    const districtCode = findValue(row, 'DistrictCode', 'District') || '28';

    // 5. Extract Subject Codes (Subject01 to Subject07, SubjectVOC, etc.)
    const subjectCodes = [];
    if (explicitSub) {
      subjectCodes.push(explicitSub);
    }
    const subKeys = [
      'Subject01', 'Subject02', 'Subject03', 'Subject04', 'Subject05', 
      'Subject06', 'Subject07', 'SubjectVOC', 'SubjectRevVOC',
      'Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Sub6', 'Sub7'
    ];

    subKeys.forEach((sk) => {
      const code = findValue(row, sk);
      if (code && !subjectCodes.includes(code)) {
        subjectCodes.push(code);
      }
    });

    const studentObj = {
      id: `up_${grade}_${parsedRoll}_${idx}`,
      rollNo: parsedRoll,
      formNumber: formNum,
      boardRollNo: parsedRoll,
      name: candidateName,
      nameHindi: candidateNameHindi,
      fatherName: fatherName,
      motherName: motherName,
      gender: gender === '1' ? 'M' : gender === '2' ? 'F' : gender,
      dob: dob,
      mobile: mobile,
      medium: medium,
      explicitSection: explicitSec ? explicitSec.toUpperCase().trim() : '',
      section: explicitSec ? explicitSec.toUpperCase().trim() : '',
      subject: explicitSub,
      schoolCode: schoolCode,
      districtCode: districtCode,
      className: grade,
      subjects: subjectCodes,
    };

    if (!studentsByClass[grade]) {
      studentsByClass[grade] = [];
    }
    studentsByClass[grade].push(studentObj);
    totalParsed++;
  });

  if (totalParsed === 0) {
    return { success: false, message: 'कोई वैध छात्र डेटा नहीं मिला।' };
  }

  // 6. Generate Class & Section structures for the seating engine
  const generatedClasses = [];
  const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let colorCounter = 0;

  // Sort grades (e.g. 9, 10, 11, 12)
  const sortedGrades = Object.keys(studentsByClass).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

  sortedGrades.forEach((grade) => {
    const allStudentsInGrade = studentsByClass[grade];
    // Sort students by original Roll / Form number
    allStudentsInGrade.sort((a, b) => a.boardRollNo - b.boardRollNo);

    const hasExplicitSections = allStudentsInGrade.some((st) => st.explicitSection);

    if (hasExplicitSections) {
      // Group by explicit section provided in file (e.g. A, B, C)
      const secMap = {};
      allStudentsInGrade.forEach((st) => {
        const sec = st.explicitSection || 'A';
        if (!secMap[sec]) secMap[sec] = [];
        secMap[sec].push(st);
      });

      const sortedSecs = Object.keys(secMap).sort();
      sortedSecs.forEach((sec, sIdx) => {
        const chunk = secMap[sec];
        const color = COLOR_PALETTE[colorCounter % COLOR_PALETTE.length];
        colorCounter++;

        const isEng = sec === 'E' || (['6', '7', '8'].includes(grade) && sec === 'C');
        let autoSub = '';
        if (['6', '7', '8'].includes(grade)) {
          if (sec === 'A') autoSub = 'Computer';
          else if (sec === 'B') autoSub = 'Commerce / Art';
          else if (sec === 'C') autoSub = 'English Medium';
        }

        chunk.forEach((st, cIdx) => {
          st.section = sec;
          if (!st.medium) st.medium = isEng ? 'English' : 'Hindi';
          if (!st.subject && autoSub) st.subject = autoSub;
          if (resetRollPerSection) {
            st.rollNo = cIdx + 1;
          }
        });

        const startRoll = resetRollPerSection ? 1 : chunk[0].rollNo;

        generatedClasses.push({
          id: `cls_up_${grade}_${sec}_${Date.now()}_${sIdx}`,
          name: grade,
          section: sec,
          medium: isEng ? 'English' : 'Hindi',
          subject: autoSub,
          startRoll: startRoll,
          totalStudents: chunk.length,
          color: color,
          studentList: chunk,
        });
      });
    } else {
      // Split into sections of perSection size
      const secCount = Math.ceil(allStudentsInGrade.length / perSection);

      for (let s = 0; s < secCount; s++) {
        const sectionLetter = sectionLetters[s] || `S${s + 1}`;
        const chunk = allStudentsInGrade.slice(s * perSection, (s + 1) * perSection);
        const color = COLOR_PALETTE[colorCounter % COLOR_PALETTE.length];
        colorCounter++;

        const isEng = sectionLetter === 'E' || (['6', '7', '8'].includes(grade) && sectionLetter === 'C');
        let autoSub = '';
        if (['6', '7', '8'].includes(grade)) {
          if (sectionLetter === 'A') autoSub = 'Computer';
          else if (sectionLetter === 'B') autoSub = 'Commerce / Art';
          else if (sectionLetter === 'C') autoSub = 'English Medium';
        }

        // Tag each student with their assigned section and set Roll No starting from 1
        chunk.forEach((st, cIdx) => {
          st.section = sectionLetter;
          if (!st.medium) st.medium = isEng ? 'English' : 'Hindi';
          if (!st.subject && autoSub) st.subject = autoSub;
          if (resetRollPerSection) {
            st.rollNo = cIdx + 1; // 1, 2, 3... in each section!
          }
        });

        const startRoll = resetRollPerSection ? 1 : chunk[0].rollNo;

        generatedClasses.push({
          id: `cls_up_${grade}_${sectionLetter}_${Date.now()}_${s}`,
          name: grade,
          section: sectionLetter,
          medium: isEng ? 'English' : 'Hindi',
          subject: autoSub,
          startRoll: startRoll,
          totalStudents: chunk.length,
          color: color,
          studentList: chunk,
        });
      }
    }
  });

  return {
    success: true,
    totalStudents: totalParsed,
    totalClasses: generatedClasses.length,
    classes: generatedClasses,
    studentsByClass,
  };
}

/**
 * Parse file (XLSX, XLS, or CSV string)
 */
export function parseUPBoardFile(fileData, isBinary = true, perSection = 50, resetRollPerSection = true) {
  try {
    let workbook;
    if (isBinary) {
      workbook = XLSX.read(fileData, { type: 'binary' });
    } else {
      workbook = XLSX.read(fileData, { type: 'string' });
    }

    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    return processUPBoardRows(rawRows, perSection, resetRollPerSection);
  } catch (err) {
    return {
      success: false,
      message: `एक्सेल पार्सिंग में त्रुटि: ${err.message}`,
    };
  }
}
