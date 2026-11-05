import * as XLSX from 'xlsx';

/**
 * Exports Main Gate Notice Board Data to an Excel file
 */
export function exportGateNoticeToExcel(gateNoticeData, examDetails) {
  const rows = gateNoticeData.map((item, idx) => ({
    'S.No': idx + 1,
    'Room / Hall No': item.roomName,
    'Class': item.className,
    'Section': item.section,
    'Subject': item.subject || 'All',
    'Roll Number Range (From - To)': item.rangeText,
    'Total Students': item.totalStudents,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Main Gate Notice');

  const fileName = `Main_Gate_Exam_Notice_${(examDetails.examName || 'Exam').replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Complete Seating Layout (Bench-wise) to Excel
 */
export function exportRoomSeatingToExcel(roomsData, examDetails) {
  const rows = [];
  roomsData.forEach((room) => {
    room.benches.forEach((bench) => {
      rows.push({
        'Room Name': room.roomName,
        'Bench Number': bench.benchNumber,
        'Seat 1 (Left) - Class': bench.leftSeat ? `${bench.leftSeat.className}-${bench.leftSeat.section}` : 'VACANT',
        'Seat 1 (Left) - Roll No': bench.leftSeat ? bench.leftSeat.rollNo : '-',
        'Seat 1 (Left) - Subject': bench.leftSeat ? bench.leftSeat.subject : '-',
        'Seat 2 (Right) - Class': bench.rightSeat ? `${bench.rightSeat.className}-${bench.rightSeat.section}` : 'VACANT',
        'Seat 2 (Right) - Roll No': bench.rightSeat ? bench.rightSeat.rollNo : '-',
        'Seat 2 (Right) - Subject': bench.rightSeat ? bench.rightSeat.subject : '-',
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bench Seating Layout');

  const fileName = `Seating_Plan_Layout_${(examDetails.examName || 'Exam').replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Absentee List to Excel (Multi-sheet: Student-wise, Class-wise, Room-wise)
 */
export function exportAbsenteeListToExcel(data, examDetails) {
  const workbook = XLSX.utils.book_new();

  // Handle both array of students and complex summary object
  let absentStudentsList = [];
  let classSummary = [];
  let roomSummary = [];

  if (Array.isArray(data)) {
    // If it's an array of room objects with absentRolls
    if (data.length > 0 && data[0].absentRolls) {
      roomSummary = data;
      data.forEach((r) => {
        (r.absentRolls || []).forEach((st) => {
          absentStudentsList.push({
            rollNo: st.rollNo,
            name: st.name || '',
            className: st.className || '',
            section: st.section || '',
            roomName: r.roomName || '',
            benchNumber: st.benchNumber || '',
            subject: st.subject || '',
          });
        });
      });
    } else {
      absentStudentsList = data;
    }
  } else if (data && typeof data === 'object') {
    absentStudentsList = data.absentStudentsList || [];
    classSummary = data.classSummary || [];
    roomSummary = data.roomSummary || [];
  }

  // 1. Sheet: Individual Absent Students List
  const studentRows = absentStudentsList.map((item, idx) => ({
    'क्र. (S.No)': idx + 1,
    'रोल नंबर (Roll No)': item.rollNo,
    'छात्र का नाम (Name)': item.name || '',
    'कक्षा (Class)': item.className || '',
    'सेक्शन (Section)': item.section || '',
    'कमरा (Room)': item.roomName || '',
    'बेंच सं. (Bench)': item.benchNumber ? `#${item.benchNumber}` : '',
    'विषय (Subject)': item.subject || '',
    'स्थिति (Status)': 'अनुपस्थित (ABSENT)',
  }));

  const studentWs = XLSX.utils.json_to_sheet(studentRows.length > 0 ? studentRows : [{ 'विवरण': 'कोई अनुपस्थित छात्र नहीं' }]);
  XLSX.utils.book_append_sheet(workbook, studentWs, 'अनुपस्थित छात्र सूची');

  // 2. Sheet: Class-wise Absentee Summary (For Class Teachers)
  if (classSummary.length > 0) {
    const classRows = classSummary.map((cls, idx) => ({
      'क्र. (S.No)': idx + 1,
      'कक्षा (Class)': cls.className,
      'सेक्शन (Section)': cls.section,
      'कक्षाध्यापक (Class Teacher)': cls.classTeacherName || '—',
      'कुल नामांकित (Total)': cls.totalStudents,
      'उपस्थित / A-कॉपी (Present / A-Copy)': cls.presentCount,
      'पूरक B-कॉपी (B-Copy)': cls.bCopiesCount || 0,
      'अनुपस्थित (Absent)': cls.absentCount,
      'अनुपस्थित रोल नंबर (Absent Rolls)': cls.absentStudents.map((s) => `#${s.rollNo}`).join(', ') || '0 अनुपस्थित (शत-प्रतिशत)',
    }));
    const classWs = XLSX.utils.json_to_sheet(classRows);
    XLSX.utils.book_append_sheet(workbook, classWs, 'कक्षा-वार अनुपस्थिति');
  }

  // 3. Sheet: Room-wise Absentee Summary
  if (roomSummary.length > 0) {
    const roomRows = roomSummary.map((rm, idx) => ({
      'क्र. (S.No)': idx + 1,
      'कमरा (Room)': rm.roomName,
      'कुल आबंटित (Seated)': rm.totalSeated,
      'उपस्थित / A-कॉपी (Present / A-Copy)': rm.presentCount,
      'पूरक B-कॉपी (B-Copy)': rm.bCopiesCount || 0,
      'अनुपस्थित (Absent)': rm.absentCount,
      'अनुपस्थित रोल नंबर (Absent Rolls)': rm.absentRollsText || '0 अनुपस्थित (शत-प्रतिशत)',
    }));
    const roomWs = XLSX.utils.json_to_sheet(roomRows);
    XLSX.utils.book_append_sheet(workbook, roomWs, 'कमरा-वार अनुपस्थिति');
  }

  const fileName = `Absentee_Report_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Teacher Staff Directory to Excel
 */
export function exportTeachersToExcel(teachersList) {
  const rows = teachersList.map((t, idx) => ({
    'NO.': idx + 1,
    'TEACHER\'S NAME': t.name || t.englishName || '',
    'FATHER/HUSBAND NAME': t.fatherName || '',
    'DESIGNATION': t.designation || 'सहायक अध्यापक',
    'SUBJECT': t.subject || '',
    'MO.NO': t.mobile || '',
    'DATE OF BIRTH': t.dob || '',
    'JOINING DATE': t.joiningDate || '',
    'ADHAR NO': t.aadharNo || '',
    'CLASS TEACHER': t.assignedClass ? `Class ${t.assignedClass}` : 'NO',
    'SECTION': t.assignedSection || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers List');

  const fileName = `Teachers_Directory_ABVIC_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Re-Exam Candidate List and Subject Paper Demand to Excel
 */
export function exportReExamListToExcel({ reExamCandidates = [], subjectWiseCounts = [] }, examDetails = {}) {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet: Re-exam Student Candidates
  const candidateRows = reExamCandidates.map((c, idx) => ({
    'क्र.सं. (S.No)': idx + 1,
    'रोल नंबर (Roll No)': c.rollNo,
    'छात्र का नाम (Student Name)': c.studentName || '—',
    'कक्षा (Class)': c.className || '',
    'वर्ग (Section)': c.section || '',
    'छूटे हुए विषय (Missed Subjects)': (c.missedSubjects || []).join(', ') || '—',
    'छूटी हुई परीक्षा तिथियां (Missed Dates)': (c.missedDates || []).join(', ') || '—',
    'कुल छूटे प्रश्न-पत्र (Papers Count)': c.totalMissed || (c.missedDates || []).length || 1,
    'पुनः परीक्षा पात्रता (Eligibility)': 'पात्र (ELIGIBLE FOR RE-EXAM)',
  }));

  const candidateWs = XLSX.utils.json_to_sheet(
    candidateRows.length > 0 ? candidateRows : [{ 'विवरण': 'कोई भी छात्र री-एग्जाम हेतु पात्र नहीं है (शून्य अनुपस्थिति)' }]
  );
  XLSX.utils.book_append_sheet(workbook, candidateWs, 'री-एग्जाम परीक्षार्थी सूची');

  // 2. Sheet: Subject-wise Question Paper Requirement
  if (subjectWiseCounts.length > 0) {
    const paperRows = subjectWiseCounts.map((sub, idx) => ({
      'क्र.सं. (S.No)': idx + 1,
      'कक्षा (Class)': sub.className,
      'विषय (Subject)': sub.subjectName,
      'परीक्षा तिथि (Exam Date)': sub.date || '—',
      'पाली (Shift)': sub.shift === 'shift_2' ? 'Shift 2 (दोपहर)' : 'Shift 1 (सुबह)',
      'आवश्यक री-एग्जाम पेपर संख्या (Required Papers)': sub.candidateCount,
    }));
    const paperWs = XLSX.utils.json_to_sheet(paperRows);
    XLSX.utils.book_append_sheet(workbook, paperWs, 'विषय-वार पेपर मांग');
  }

  const fileName = `ReExam_Candidate_List_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Class Register Attendance Matrix (Dates as columns, P/A) to Excel
 */
export function exportClassAttendanceMatrixToExcel({ classMatrices = [], examDates = [] }, examDetails = {}) {
  const workbook = XLSX.utils.book_new();

  classMatrices.forEach((matrix) => {
    const sheetName = `Class_${matrix.className}${matrix.section ? `_${matrix.section}` : ''}`.slice(0, 31);
    
    const rows = (matrix.students || []).map((st, idx) => {
      const row = {
        'क्र.सं.': idx + 1,
        'रोल नंबर': st.rollNo,
        'छात्र का नाम': st.studentName || st.name || '',
        'कक्षा': matrix.className,
        'वर्ग': matrix.section || '',
      };

      // Add each exam date as a column
      examDates.forEach((d) => {
        const status = st.attendanceByDate && st.attendanceByDate[d.dateKey];
        row[d.colLabel] = status === 'A' ? 'A (अनुपस्थित)' : 'P (उपस्थित)';
      });

      row['कुल अनुपस्थिति दिन'] = st.totalAbsentDays || 0;
      row['परीक्षा परिणाम स्थिति'] = st.totalAbsentDays > 0 ? `री-एग्जाम (${st.totalAbsentDays} पेपर)` : 'पूर्ण उपस्थित';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'विवरण': 'कोई छात्र डेटा उपलब्ध नहीं' }]);
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  });

  const fileName = `Class_Register_Attendance_Matrix_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Master Teacher Invigilation Duty Summary across all days to Excel
 */
export function exportMasterTeacherDutyToExcel({ masterDutyRows = [], shiftSlots = [] }, examDetails = {}) {
  const workbook = XLSX.utils.book_new();

  const rows = masterDutyRows.map((t, idx) => {
    const row = {
      'क्र.सं.': idx + 1,
      'शिक्षक का नाम': t.name || '',
      'पद': t.designation || 'सहायक अध्यापक',
      'विषय': t.subject || '',
      'मोबाइल': t.mobile || '',
    };

    // Slot duties
    shiftSlots.forEach((slot) => {
      const duty = t.dutyMap && t.dutyMap[slot.slotKey];
      row[slot.colLabel] = duty || '—';
    });

    row['कुल कमरा ड्यूटी'] = t.roomDutyCount || 0;
    row['कुल रिलीवर ड्यूटी'] = t.relieverDutyCount || 0;
    row['महायोग ड्यूटी'] = (t.roomDutyCount || 0) + (t.relieverDutyCount || 0);
    row['शिक्षक हस्ताक्षर'] = '';
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'विवरण': 'कोई शिक्षक ड्यूटी डेटा नहीं' }]);
  XLSX.utils.book_append_sheet(workbook, ws, 'समस्त शिक्षक ड्यूटी चार्ट');

  const fileName = `Master_Teacher_Duty_Audit_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports 2D Room-wise x Class-wise Answer Book Matrix to Excel
 */
export function export2DMatrixToExcel({ matrixRows = [], matrixColumns = [], colTotals = {}, grandTotal = {}, bCopyDetails = [], absentDetails = [] }, examDetails = {}) {
  const workbook = XLSX.utils.book_new();

  // 1. Matrix Sheet
  const rows = matrixRows.map((r, idx) => {
    const row = {
      'क्र.': idx + 1,
      'कमरा / हॉल': r.roomName,
    };
    matrixColumns.forEach((c) => {
      const cell = r.cells[c.classKey];
      if (!cell || cell.totalSeated === 0) {
        row[c.displayName] = '—';
      } else if (cell.bCopiesCount > 0) {
        row[c.displayName] = `${cell.presentCount} (A) + ${cell.bCopiesCount} (B)`;
      } else {
        row[c.displayName] = `${cell.presentCount} (A)`;
      }
    });
    row["कुल 'A' कॉपियां"] = r.rowTotalA;
    row["कुल 'B' कॉपियां"] = r.rowTotalB;
    row["कमरा महायोग (A+B)"] = r.rowGrandTotal;
    return row;
  });

  // Summary Row: Total A
  const summaryA = {
    'क्र.': '',
    'कमरा / हॉल': "कक्षा कुल 'A' कॉपियां",
  };
  matrixColumns.forEach((c) => {
    summaryA[c.displayName] = (colTotals[c.classKey]?.totalA || 0) + ' (A)';
  });
  summaryA["कुल 'A' कॉपियां"] = grandTotal.totalA || 0;
  summaryA["कुल 'B' कॉपियां"] = '—';
  summaryA["कमरा महायोग (A+B)"] = grandTotal.totalA || 0;
  rows.push(summaryA);

  // Summary Row: Total B
  const summaryB = {
    'क्र.': '',
    'कमरा / हॉल': "कक्षा कुल 'B' कॉपियां",
  };
  matrixColumns.forEach((c) => {
    summaryB[c.displayName] = (colTotals[c.classKey]?.totalB || 0) > 0 ? `${colTotals[c.classKey].totalB} (B)` : '0';
  });
  summaryB["कुल 'A' कॉपियां"] = '—';
  summaryB["कुल 'B' कॉपियां"] = grandTotal.totalB || 0;
  summaryB["कमरा महायोग (A+B)"] = grandTotal.totalB || 0;
  rows.push(summaryB);

  // Summary Row: Grand Total
  const summaryGrand = {
    'क्र.': 'महायोग',
    'कमरा / हॉल': "कक्षा संपूर्ण महायोग (A+B)",
  };
  matrixColumns.forEach((c) => {
    const tot = (colTotals[c.classKey]?.totalA || 0) + (colTotals[c.classKey]?.totalB || 0);
    summaryGrand[c.displayName] = `${tot} कुल`;
  });
  summaryGrand["कुल 'A' कॉपियां"] = grandTotal.totalA || 0;
  summaryGrand["कुल 'B' कॉपियां"] = grandTotal.totalB || 0;
  summaryGrand["कमरा महायोग (A+B)"] = grandTotal.totalCopies || 0;
  rows.push(summaryGrand);

  const ws1 = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, ws1, '2D_कॉपी_वितरण_मैट्रिक्स');

  // 2. B-Copy Audit Sheet
  if (bCopyDetails && bCopyDetails.length > 0) {
    const bRows = bCopyDetails.map((b, i) => ({
      'क्र.': i + 1,
      'कमरा': b.roomName,
      'कक्षा': b.className,
      'सेक्शन': b.section || '',
      'रोल नंबर': b.rollNo,
      'परीक्षार्थी नाम': b.name || '',
      "पूरक 'B' कॉपियां": b.bCount || 1,
      'B-कॉपी नंबर': Array.isArray(b.bCopyNumbers) ? b.bCopyNumbers.join(', ') : '',
      'A-कॉपी सीरियल': b.aCopyNumber || '',
    }));
    const ws2 = XLSX.utils.json_to_sheet(bRows);
    XLSX.utils.book_append_sheet(workbook, ws2, 'B_कॉपी_विशेष_विवरण');
  }

  // 3. Absentee Audit Sheet
  if (absentDetails && absentDetails.length > 0) {
    const abRows = absentDetails.map((a, i) => ({
      'क्र.': i + 1,
      'कमरा': a.roomName,
      'कक्षा': a.className,
      'सेक्शन': a.section || '',
      'रोल नंबर': a.rollNo,
      'परीक्षार्थी नाम': a.name || '',
      'स्थिति': 'अनुपस्थित (ABSENT)',
    }));
    const ws3 = XLSX.utils.json_to_sheet(abRows);
    XLSX.utils.book_append_sheet(workbook, ws3, 'अनुपस्थित_छात्र_सूची');
  }

  const fileName = `2D_Copy_Distribution_Matrix_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
