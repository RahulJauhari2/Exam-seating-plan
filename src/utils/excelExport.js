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
 * Exports Absentee List to Excel
 */
export function exportAbsenteeListToExcel(absenteeData, examDetails) {
  const rows = absenteeData.map((item, idx) => ({
    'S.No': idx + 1,
    'Roll Number': item.rollNo,
    'Student Name': item.name || '',
    'Class': item.className || '',
    'Section': item.section || '',
    'Room Name': item.roomName || '',
    'Bench Number': item.benchNumber || '',
    'Subject': item.subject || '',
    'Status': 'ABSENT',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Absent Students');

  const fileName = `Absentee_List_${(examDetails?.examName || 'Exam').replace(/\s+/g, '_')}.xlsx`;
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
