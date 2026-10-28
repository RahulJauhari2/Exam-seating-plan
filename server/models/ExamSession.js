import mongoose from 'mongoose';

const StudentSubSchema = new mongoose.Schema(
  {
    id: { type: String },
    rollNo: { type: Number, required: true },
    srNo: { type: String, default: '' },
    formNumber: { type: String, default: '' },
    boardRollNo: { type: Number },
    name: { type: String, required: true },
    nameHindi: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    motherName: { type: String, default: '' },
    gender: { type: String, default: 'M' },
    dob: { type: String, default: '' },
    mobile: { type: String, default: '' },
    medium: { type: String, enum: ['Hindi', 'English'], default: 'Hindi' },
    className: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, default: '' },
    subjects: { type: [String], default: [] },
    classKey: { type: String },
    color: { type: String },
  },
  { _id: false }
);

const ClassSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, default: '' },
    medium: { type: String, enum: ['Hindi', 'English'], default: 'Hindi' },
    startRoll: { type: Number, required: true },
    totalStudents: { type: Number, required: true },
    color: { type: String, default: '' },
    studentList: { type: [StudentSubSchema], default: [] },
  },
  { _id: false }
);

const RoomSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    benches: { type: Number, required: true },
    columns: { type: Number, default: 3 },
    customColBenches: { type: [Number], default: [] },
  },
  { _id: false }
);

const TeacherSubSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    subject: { type: String, default: 'General' },
    onLeave: { type: Boolean, default: false },
    phone: { type: String, default: '' },
  },
  { _id: false }
);

const ExamSessionSchema = new mongoose.Schema(
  {
    sessionName: { 
      type: String, 
      required: true, 
      trim: true,
      index: true 
    },
    activeShift: { 
      type: String, 
      enum: ['shift_1', 'shift_2'], 
      default: 'shift_1' 
    },
    examDetails: {
      schoolName: { type: String, required: true },
      examName: { type: String, required: true },
      timeRange: { type: String, default: '' },
      date: { type: String, default: '' },
    },
    classes: { type: [ClassSubSchema], required: true },
    rooms: { type: [RoomSubSchema], required: true },
    teachers: { type: [TeacherSubSchema], default: [] },
    dutyRoster: { type: mongoose.Schema.Types.Mixed, default: {} },
    marksData: { type: mongoose.Schema.Types.Mixed, default: {} },
    subjectConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Compound index so a school can have same session name with shift_1 and shift_2 or unique
ExamSessionSchema.index({ sessionName: 1, activeShift: 1 }, { unique: true });

export const ExamSession = mongoose.model('ExamSession', ExamSessionSchema);
