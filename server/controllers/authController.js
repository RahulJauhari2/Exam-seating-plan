import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { LoginValidationSchema, UserValidationSchema } from '../validations/authValidation.js';
import { DEFAULT_TEACHERS } from '../../src/data/defaultTeachers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'exam_seating_secret_key_2026_abvic';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      assignedTeacherId: user.assignedTeacherId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Seed initial default accounts if database is empty
export const seedInitialUsers = async () => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const count = await User.countDocuments();
    if (count > 0) return; // Already seeded

    console.log('🌱 Seeding initial default accounts (SuperAdmin, Principal, Coordinator, Teachers)...');

    const hashedAdminPass = await bcrypt.hash('admin@123', 10);
    const hashedPrincipalPass = await bcrypt.hash('principal@123', 10);
    const hashedCoordPass = await bcrypt.hash('exam@123', 10);
    const defaultPinHash = await bcrypt.hash('1234', 10);

    const initialUsers = [
      {
        username: 'superadmin',
        name: 'सुपर एडमिन (Super Admin)',
        role: 'superadmin',
        phone: '9999999999',
        password: hashedAdminPass,
        pin: defaultPinHash,
      },
      {
        username: 'principal',
        name: 'प्रधानाचार्य (Principal)',
        role: 'principal',
        phone: '9876543210',
        password: hashedPrincipalPass,
        pin: defaultPinHash,
      },
      {
        username: 'coordinator',
        name: 'परीक्षा प्रभारी (Exam Incharge)',
        role: 'coordinator',
        phone: '9876543211',
        password: hashedCoordPass,
        pin: defaultPinHash,
      },
    ];

    // Seed Teachers from defaultTeachers list
    DEFAULT_TEACHERS.forEach((t, idx) => {
      const cleanPhone = t.phone || `98000000${String(idx + 1).padStart(2, '0')}`;
      initialUsers.push({
        username: `teacher_${t.id}`,
        name: t.name,
        role: 'teacher',
        phone: cleanPhone,
        pin: defaultPinHash,
        password: defaultPinHash,
        assignedTeacherId: t.id,
      });
    });

    await User.insertMany(initialUsers);
    console.log(`✅ Seeded ${initialUsers.length} initial users into MongoDB!`);
  } catch (error) {
    console.error('Failed to seed users:', error.message);
  }
};

// 1. User Login (Supports Phone + 4-digit PIN OR Username + Password)
export const loginUser = async (req, res) => {
  try {
    const valResult = LoginValidationSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        message: valResult.error.issues[0]?.message || 'अमान्य लॉगिन डेटा।',
      });
    }

    const { phone, pin, username, password } = valResult.data;

    let user = null;

    // A. Teacher Login using Mobile Number + 4-digit PIN
    if (phone && pin) {
      const cleanPhone = String(phone).trim();
      user = await User.findOne({ phone: cleanPhone, active: true });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: `मोबाइल नंबर '${cleanPhone}' पंजीकृत नहीं है। कृपया एडमिन या परीक्षा प्रभारी से संपर्क करें।`,
        });
      }

      const isPinMatch = await user.comparePin(pin);
      if (!isPinMatch) {
        return res.status(401).json({
          success: false,
          message: 'अमान्य 4-अंकों का पिन (Incorrect PIN)। डिफ़ॉल्ट पिन 1234 है।',
        });
      }
    } 
    // B. Admin / Principal / Coordinator login via Username + Password
    else if (username && password) {
      const cleanUsername = String(username).trim().toLowerCase();
      user = await User.findOne({ username: cleanUsername, active: true });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: `उपयोगकर्ता '${cleanUsername}' नहीं मिला।`,
        });
      }

      const isPassMatch = await user.comparePassword(password);
      if (!isPassMatch) {
        return res.status(401).json({
          success: false,
          message: 'अमान्य पासवर्ड (Incorrect Password)।',
        });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'लॉगिन विफल।' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: `${user.name} के रूप में सफलतापूर्वक लॉगिन हुआ!`,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        assignedTeacherId: user.assignedTeacherId,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: `लॉगिन में त्रुटि: ${error.message}`,
    });
  }
};

// 2. Get Current Authenticated User Profile
export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};

// 3. Get all users (Admin & Principal only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password -pin').sort({ role: 1, name: 1 });
    return res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Create or assign new user / change role (Principal & SuperAdmin)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, name, phone, pin, active } = req.body;

    const updateFields = {};
    if (role) updateFields.role = role;
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (active !== undefined) updateFields.active = active;
    if (pin) updateFields.pin = await bcrypt.hash(String(pin), 10);

    const updated = await User.findByIdAndUpdate(userId, updateFields, { new: true }).select('-password -pin');

    return res.json({
      success: true,
      message: `उपयोगकर्ता '${updated?.name}' का रोल '${updated?.role}' अपडेट कर दिया गया।`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
