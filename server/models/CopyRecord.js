import mongoose from 'mongoose';

const CopyRecordSchema = new mongoose.Schema(
  {
    rollNo: {
      type: Number,
      required: true,
      index: true,
    },
    bCopiesCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    bCopyNumbers: {
      type: [String],
      default: [],
    },
    aCopyNumber: {
      type: String,
      default: '',
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

CopyRecordSchema.index({ rollNo: 1, shift: 1, sessionName: 1 });

export const CopyRecord = mongoose.model('CopyRecord', CopyRecordSchema);
