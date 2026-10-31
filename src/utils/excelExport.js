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
      'अनुपस्थित रोल नंबर (Absent Rolls)': cls.absentStudents.map((s) => `#${s.rollNo}`).join(', ') || 'निरंक',
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
      'अनुपस्थित रोल नंबर (Absent Rolls)': rm.absentRollsText || 'निरंक',
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
