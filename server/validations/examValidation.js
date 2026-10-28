import { z } from 'zod';

// 1. Student Schema
export const StudentValidationSchema = z.object({
  id: z.string().optional(),
  rollNo: z.coerce.number().int().positive('Roll number must be a positive integer'),
  srNo: z.string().optional().default(''),
  formNumber: z.union([z.string(), z.number()]).optional(),
  boardRollNo: z.coerce.number().optional(),
  name: z.string().min(1, 'Student name is required'),
  nameHindi: z.string().optional().default(''),
  fatherName: z.string().optional().default(''),
  motherName: z.string().optional().default(''),
  gender: z.string().optional().default('M'),
  dob: z.string().optional().default(''),
  mobile: z.string().optional().default(''),
  medium: z.enum(['Hindi', 'English']).default('Hindi'),
  className: z.string().min(1, 'Class name is required'),
  section: z.string().min(1, 'Section is required'),
  subject: z.string().optional().default(''),
  subjects: z.array(z.string()).optional().default([]),
  classKey: z.string().optional(),
  color: z.string().optional(),
});

// 2. Class Schema
export const ClassValidationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Class name is required'),
  section: z.string().min(1, 'Section is required'),
  subject: z.string().optional().default(''),
  medium: z.enum(['Hindi', 'English']).default('Hindi'),
  startRoll: z.coerce.number().int().min(1, 'Start roll must be positive'),
  totalStudents: z.coerce.number().int().min(1, 'Total students must be at least 1'),
  color: z.string().optional().default(''),
  studentList: z.array(StudentValidationSchema).optional().default([]),
});

// 3. Room Schema
export const RoomValidationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Room name is required'),
  benches: z.coerce.number().int().min(1, 'Benches must be at least 1'),
  columns: z.coerce.number().int().min(1, 'Columns must be at least 1').default(3),
  customColBenches: z.array(z.coerce.number().int()).optional(),
});

// 4. Teacher Schema
export const TeacherValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().min(1, 'Teacher name is required'),
  subject: z.string().optional().default('General'),
  onLeave: z.boolean().default(false),
  phone: z.string().optional().default(''),
});

// 5. Exam Details Schema
export const ExamDetailsValidationSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  examName: z.string().min(1, 'Exam name is required'),
  timeRange: z.string().optional().default(''),
  date: z.string().optional().default(''),
});

// 6. Subject Max Marks Configuration Schema
export const SubjectConfigValidationSchema = z.record(
  z.string(),
  z.object({
    maxTheory: z.coerce.number().min(0).default(70),
    maxPractical: z.coerce.number().min(0).default(30),
    minPassPercent: z.coerce.number().min(0).max(100).default(33),
  })
);

// 7. Student Subject Marks Schema
export const MarksDataValidationSchema = z.record(
  z.string(), // studentKey (e.g. "9_A_9101")
  z.record(
    z.string(), // subjectName (e.g. "HINDI")
    z.object({
      theory: z.union([z.coerce.number(), z.literal('')]).optional().default(''),
      practical: z.union([z.coerce.number(), z.literal('')]).optional().default(''),
    })
  )
);

// 8. Full Exam Session Schema (for saving & loading complete school exam state)
export const ExamSessionValidationSchema = z.object({
  sessionName: z.string().min(1, 'Session name is required (e.g. Half_Yearly_2026_27)'),
  activeShift: z.enum(['shift_1', 'shift_2']).default('shift_1'),
  examDetails: ExamDetailsValidationSchema,
  classes: z.array(ClassValidationSchema).min(1, 'At least one class is required'),
  rooms: z.array(RoomValidationSchema).min(1, 'At least one room is required'),
  teachers: z.array(TeacherValidationSchema).optional().default([]),
  dutyRoster: z.record(z.string(), z.any()).optional().default({}),
  marksData: MarksDataValidationSchema.optional().default({}),
  subjectConfig: SubjectConfigValidationSchema.optional().default({}),
  notes: z.string().optional().default(''),
});

// 9. Partial update / patch schema
export const ExamSessionUpdateSchema = ExamSessionValidationSchema.partial();
