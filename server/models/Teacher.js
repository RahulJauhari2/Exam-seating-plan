import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema(
  {
    teacherCode: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    englishName: {
      type: String,
      trim: true,
      default: '',
    },
    fatherName: {
      type: String,
      trim: true,
      default: '',
    },
    designation: {
      type: String,
      trim: true,
      default: 'सहायक अध्यापक',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dob: {
      type: String,
      default: '',
    },
    joiningDate: {
      type: String,
      default: '',
    },
    aadharNo: {
      type: String,
      default: '',
    },
    // Class Teacher configuration
    isClassTeacher: {
      type: Boolean,
      default: false,
    },
    assignedClass: {
      type: String, // e.g. "9", "10", "11", "12"
      default: '',
    },
    assignedSection: {
      type: String, // e.g. "A", "B", "C"
      default: '',
    },
    isPresent: {
      type: Boolean,
      default: true,
    },
    // Exam Incharge / Duty Exemption configuration
    isExamIncharge: {
      type: Boolean,
      default: false,
    },
    exemptDuty: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Teacher = mongoose.model('Teacher', TeacherSchema);
