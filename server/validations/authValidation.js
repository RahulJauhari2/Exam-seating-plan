import { z } from 'zod';

// Login schema supporting either phone+pin (teachers) or username+password (admins/principals)
export const LoginValidationSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  pin: z.string().optional(),
}).refine((data) => {
  return (data.phone && data.pin) || (data.username && data.password);
}, {
  message: 'कृपया मोबाइल नंबर + पिन अथवा यूज़रनेम + पासवर्ड दर्ज करें।',
});

// User creation/management schema
export const UserValidationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  name: z.string().min(1, 'Full name is required'),
  role: z.enum(['superadmin', 'admin', 'principal', 'coordinator', 'teacher']).default('teacher'),
  phone: z.string().optional().default(''),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').optional().default('1234'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().default('pass1234'),
  assignedTeacherId: z.union([z.string(), z.number()]).optional(),
  active: z.boolean().default(true),
});

// Absentee toggle schema
export const AbsenteeToggleSchema = z.object({
  rollNo: z.coerce.number().int().positive('Roll number is required'),
  isAbsent: z.boolean(),
  roomName: z.string().min(1, 'Room name is required'),
  sessionName: z.string().default('Half_Yearly_2026_27'),
  date: z.string().default(''),
  shift: z.enum(['shift_1', 'shift_2']).default('shift_1'),
  studentName: z.string().optional().default(''),
  className: z.string().optional().default(''),
  section: z.string().optional().default(''),
  markedBy: z.string().optional().default('Staff'),
});
