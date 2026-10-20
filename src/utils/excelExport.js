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
 * Exports Absentee Summary to Excel
 */
export function exportAbsenteeListToExcel(absenteeSummary, examDetails) {
  const rows = absenteeSummary.map((item, idx) => ({
    'क्र.सं. (S.No)': idx + 1,
    'कमरा / हॉल नं.': item.roomName,
    'कुल आबंटित छात्र': item.totalSeated,
    'उपस्थित छात्र (Present)': item.presentCount,
    'अनुपस्थित छात्र (Absent)': item.absentCount,
    'अनुपस्थित रोल नंबर (Absent Roll Numbers)': item.absentRollsText || 'कोई नहीं (None)',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Room Absentee List');

  const fileName = `Room_Wise_Absentee_List_${(examDetails.examName || 'Exam').replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

