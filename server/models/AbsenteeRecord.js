import mongoose from 'mongoose';

const AbsenteeRecordSchema = new mongoose.Schema(
  {
    rollNo: {
      type: Number,
      required: true,
      index: true,
    },
    isAbsent: {
      type: Boolean,
      required: true,
      default: true,
    },
    roomName: {
      type: String,
      required: true,
      index: true,
    },
    sessionName: {
      type: String,
      default: 'Half_Yearly_2026_27',
      index: true,
    },
    date: {
      type: String,
      default: '',
      index: true,
    },
    shift: {
      type: String,
      enum: ['shift_1', 'shift_2'],
      default: 'shift_1',
      index: true,
    },
    studentName: {
      type: String,
      default: '',
    },
    className: {
      type: String,
      default: '',
    },
    section: {
      type: String,
      default: '',
    },
    markedBy: {
      type: String,
      default: 'Staff',
    },
    markedByRole: {
      type: String,
      default: 'teacher',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so one record exists per rollNo per date & shift
AbsenteeRecordSchema.index({ rollNo: 1, date: 1, shift: 1, sessionName: 1 }, { unique: true });

export const AbsenteeRecord = mongoose.model('AbsenteeRecord', AbsenteeRecordSchema);
