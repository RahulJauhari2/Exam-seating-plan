import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'principal', 'coordinator', 'teacher'],
      default: 'teacher',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    pin: {
      type: String, // Hashed 4-digit PIN for teachers
      default: '',
    },
    password: {
      type: String, // Hashed password for admin/principal
      default: '',
    },
    assignedTeacherId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to verify 4-digit PIN
UserSchema.methods.comparePin = async function (enteredPin) {
  if (!this.pin) return false;
  return await bcrypt.compare(String(enteredPin), this.pin);
};

export const User = mongoose.model('User', UserSchema);
