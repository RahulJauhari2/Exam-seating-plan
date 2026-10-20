/**
 * Intelligent Multi-Class Exam Seating Allocation Engine
 * 
 * Rules:
 * 1. Two students per bench (Left Seat, Right Seat).
 * 2. Crucial Anti-Cheating:
 *    - In every room, ALL classes are mixed together!
 *      (e.g., 9th, 10th, 11th, and 12th in Shift 1; 6th, 7th, and 8th in Shift 2).
 *    - Adjacent seats on the same bench MUST NOT be from the same class/subject.
 * 3. Fallback / Spillover ("तीसरी क्लास"):
 *    - When one class finishes, system dynamically balances with remaining classes.
 * 4. Last Room Grace Rule:
 *    - "last room me na mix ho pye to koi baat nahi"
 *    - In the last room, if all other classes have completed and only one class remains,
 *      remaining students can sit together (preferably different sections) so that
 *      no student is left unseated.
 * 5. Main Gate Notice Board:
 *    - Aggregates Roll Numbers From - To and total students per class for each room.
 */

export function generateSeatingPlan({ classes, rooms }) {
  // Step 1: Create queues of students for each class and section
  // Structure: { [gradeName]: { [section]: [students...] } }
  // Also flat queue per grade: { [gradeName]: [students...] }
  const gradeQueues = {};
  const allStudentsList = [];

  classes.forEach((cls) => {
    const grade = cls.name.trim();
    const section = cls.section.trim().toUpperCase();
    const classKey = `${grade}-${section}`;
    const start = Number(cls.startRoll) || 1;
    const count = Number(cls.totalStudents) || 0;

    if (!gradeQueues[grade]) {
      gradeQueues[grade] = [];
    }

    for (let i = 0; i < count; i++) {
      const roll = start + i;
      const student = {
        id: `${classKey}-${roll}`,
        rollNo: roll,
        className: grade,
        section: section,
        subject: cls.subject || 'General',
        classKey: classKey,
        gradeGroup: grade,
        color: cls.color,
      };
      gradeQueues[grade].push(student);
      allStudentsList.push(student);
    }
  });

  const totalStudents = allStudentsList.length;

  // Distinct sorted grades (e.g. ['9', '10', '11', '12'] or ['6', '7', '8'])
  const distinctGrades = Object.keys(gradeQueues).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Track allocation
  const roomAllocations = [];
  let totalBenchesUsed = 0;
  let totalCapacity = 0;

  // Helper function to pick next student from a specific grade queue
  function popFromGrade(grade) {
    if (gradeQueues[grade] && gradeQueues[grade].length > 0) {
      return gradeQueues[grade].shift();
    }
    return null;
  }

  // Helper to find any available student avoiding a specific grade
  function popAnyAvoiding(avoidGrade = null) {
    // Look for grades with students that are not avoidGrade
    for (const g of distinctGrades) {
      if (g !== avoidGrade && gradeQueues[g] && gradeQueues[g].length > 0) {
        return gradeQueues[g].shift();
      }
    }
    // If no distinct grade is available, return null
    return null;
  }

  // Helper to count remaining students across all grades
  function countRemainingStudents() {
    return Object.values(gradeQueues).reduce((acc, q) => acc + q.length, 0);
  }

  // Helper to count remaining distinct grades with active students
  function getRemainingDistinctGrades() {
    return distinctGrades.filter((g) => gradeQueues[g] && gradeQueues[g].length > 0);
  }

  // Pattern sequences for mixing ALL classes
  let benchCounter = 0;

  // Allocation Room by Room
  for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
    const room = rooms[rIdx];
    const isLastRoom = rIdx === rooms.length - 1;
    const benchCount = Number(room.benches) || 0;
    const roomCapacity = benchCount * 2;
    totalCapacity += roomCapacity;

    const benches = [];
    const studentsInRoom = [];

    for (let bIndex = 1; bIndex <= benchCount; bIndex++) {
      if (countRemainingStudents() === 0) {
        // No more students left
        benches.push({
          benchNumber: bIndex,
          leftSeat: null,
          rightSeat: null,
          status: 'empty',
        });
        continue;
      }

      totalBenchesUsed++;
      benchCounter++;

      let leftStudent = null;
      let rightStudent = null;

      const remainingGrades = getRemainingDistinctGrades();

      // Determine target grades for Left and Right seats based on total active grades
      if (distinctGrades.length >= 4) {
        // e.g. 9, 10, 11, 12:
        // Rotate through all classes:
        // Even bench: Class 9 (Left) & Class 11 (Right)
        // Odd bench: Class 10 (Left) & Class 12 (Right)
        // This mixes 9th, 10th, 11th, and 12th in EVERY ROOM!
        const g9 = distinctGrades[0];
        const g10 = distinctGrades[1];
        const g11 = distinctGrades[2];
        const g12 = distinctGrades[3];

        if (benchCounter % 2 === 1) {
          // Attempt Pair A: g9 + g11
          leftStudent = popFromGrade(g9) || popFromGrade(g10) || popAnyAvoiding(null);
          if (leftStudent) {
            rightStudent =
              popFromGrade(g11) ||
              popFromGrade(g12) ||
              popAnyAvoiding(leftStudent.gradeGroup);
          }
        } else {
          // Attempt Pair B: g10 + g12
          leftStudent = popFromGrade(g10) || popFromGrade(g9) || popAnyAvoiding(null);
          if (leftStudent) {
            rightStudent =
              popFromGrade(g12) ||
              popFromGrade(g11) ||
              popAnyAvoiding(leftStudent.gradeGroup);
          }
        }
      } else if (distinctGrades.length === 3) {
        // e.g. 6, 7, 8:
        // Rotate all 3 classes:
        // Bench 1: 6 & 7
        // Bench 2: 7 & 8
        // Bench 3: 8 & 6
        // This mixes 6th, 7th, and 8th in EVERY ROOM!
        const g0 = distinctGrades[0];
        const g1 = distinctGrades[1];
        const g2 = distinctGrades[2];

        const step = benchCounter % 3;
        if (step === 0) {
          leftStudent = popFromGrade(g0) || popAnyAvoiding(null);
          if (leftStudent) rightStudent = popFromGrade(g1) || popAnyAvoiding(leftStudent.gradeGroup);
        } else if (step === 1) {
          leftStudent = popFromGrade(g1) || popAnyAvoiding(null);
          if (leftStudent) rightStudent = popFromGrade(g2) || popAnyAvoiding(leftStudent.gradeGroup);
        } else {
          leftStudent = popFromGrade(g2) || popAnyAvoiding(null);
          if (leftStudent) rightStudent = popFromGrade(g0) || popAnyAvoiding(leftStudent.gradeGroup);
        }
      } else if (distinctGrades.length === 2) {
        // 2 Grades: Left = Grade 0, Right = Grade 1
        const g0 = distinctGrades[0];
        const g1 = distinctGrades[1];
        leftStudent = popFromGrade(g0) || popFromGrade(g1);
        if (leftStudent) {
          rightStudent = popAnyAvoiding(leftStudent.gradeGroup);
        }
      } else {
        // 1 Grade with multiple sections (or single section)
        leftStudent = popAnyAvoiding(null);
        if (leftStudent) {
          // Try different section
          const activeG = distinctGrades[0];
          if (gradeQueues[activeG] && gradeQueues[activeG].length > 0) {
            const secIdx = gradeQueues[activeG].findIndex((s) => s.section !== leftStudent.section);
            if (secIdx !== -1) {
              rightStudent = gradeQueues[activeG].splice(secIdx, 1)[0];
            } else if (isLastRoom || remainingGrades.length <= 1) {
              // Last room grace: allow remaining students
              rightStudent = gradeQueues[activeG].shift();
            }
          }
        }
      }

      // If left student was picked but right student couldn't be paired with a DIFFERENT grade:
      if (leftStudent && !rightStudent) {
        const remaining = getRemainingDistinctGrades();
        if (remaining.length > 0) {
          // Try to get any other student
          rightStudent = popAnyAvoiding(leftStudent.gradeGroup);
        }

        // LAST ROOM GRACE RULE:
        // "last room me na mix ho pye to koi baat nahi"
        // If we are in the last room (or only 1 grade has remaining students anywhere in center):
        if (!rightStudent && (isLastRoom || remaining.length <= 1)) {
          // Take any remaining student so no student is left unseated
          for (const g of distinctGrades) {
            if (gradeQueues[g] && gradeQueues[g].length > 0) {
              rightStudent = gradeQueues[g].shift();
              break;
            }
          }
        }
      }

      // Record seated students
      if (leftStudent) {
        leftStudent.benchNumber = bIndex;
        leftStudent.seatPosition = 'Left';
        leftStudent.roomName = room.name;
        studentsInRoom.push(leftStudent);
      }

      if (rightStudent) {
        rightStudent.benchNumber = bIndex;
        rightStudent.seatPosition = 'Right';
        rightStudent.roomName = room.name;
        studentsInRoom.push(rightStudent);
      }

      benches.push({
        benchNumber: bIndex,
        leftSeat: leftStudent,
        rightSeat: rightStudent,
        status:
          leftStudent && rightStudent
            ? 'full'
            : leftStudent || rightStudent
            ? 'single'
            : 'empty',
      });
    }

    // Step 4: Summarize Room data for Main Gate Notice Board
    // Group by Class & Section
    const classSummaryMap = {};

    studentsInRoom.forEach((st) => {
      if (!classSummaryMap[st.classKey]) {
        classSummaryMap[st.classKey] = {
          className: st.className,
          section: st.section,
          subject: st.subject,
          color: st.color,
          rollNumbers: [],
        };
      }
      classSummaryMap[st.classKey].rollNumbers.push(st.rollNo);
    });

    const gateSummaryItems = [];
    Object.keys(classSummaryMap).forEach((key) => {
      const item = classSummaryMap[key];
      const sortedRolls = item.rollNumbers.sort((a, b) => a - b);

      // Compute contiguous ranges (e.g. 901-909 or 901, 905...)
      const ranges = [];
      let rangeStart = sortedRolls[0];
      let rangeEnd = sortedRolls[0];

      for (let i = 1; i < sortedRolls.length; i++) {
        if (sortedRolls[i] === rangeEnd + 1) {
          rangeEnd = sortedRolls[i];
        } else {
          ranges.push(
            rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart} - ${rangeEnd}`
          );
          rangeStart = sortedRolls[i];
          rangeEnd = sortedRolls[i];
        }
      }
      ranges.push(
        rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart} - ${rangeEnd}`
      );

      gateSummaryItems.push({
        classKey: key,
        className: item.className,
        section: item.section,
        subject: item.subject,
        color: item.color,
        fromRoll: sortedRolls[0],
        toRoll: sortedRolls[sortedRolls.length - 1],
        rangeText: ranges.join(', '),
        totalStudents: sortedRolls.length,
      });
    });

    // Sort summary items by Class name, then Section
    gateSummaryItems.sort((a, b) => {
      const diff = (parseInt(a.className) || 0) - (parseInt(b.className) || 0);
      if (diff !== 0) return diff;
      return a.section.localeCompare(b.section);
    });

    roomAllocations.push({
      roomId: room.id,
      roomName: room.name,
      benchesCount: benchCount,
      columns: room.columns || 3,
      capacity: roomCapacity,
      seatedCount: studentsInRoom.length,
      benches: benches,
      gateSummary: gateSummaryItems,
      students: studentsInRoom,
    });
  }

  // Any unseated students left over?
  const unseatedStudents = [];
  distinctGrades.forEach((g) => {
    if (gradeQueues[g] && gradeQueues[g].length > 0) {
      unseatedStudents.push(...gradeQueues[g]);
    }
  });

  // Global Gate Notice Rows (flat list for entire center)
  const masterGateNotice = [];
  roomAllocations.forEach((rm) => {
    if (rm.gateSummary.length > 0) {
      rm.gateSummary.forEach((gs) => {
        masterGateNotice.push({
          roomName: rm.roomName,
          className: gs.className,
          section: gs.section,
          subject: gs.subject,
          rangeText: gs.rangeText,
          fromRoll: gs.fromRoll,
          toRoll: gs.toRoll,
          totalStudents: gs.totalStudents,
          color: gs.color,
        });
      });
    }
  });

  return {
    rooms: roomAllocations,
    masterGateNotice,
    totalStudents,
    totalCapacity,
    totalSeated: totalStudents - unseatedStudents.length,
    unseatedCount: unseatedStudents.length,
    unseatedStudents,
    totalBenchesUsed,
  };
}
