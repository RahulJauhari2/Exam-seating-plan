import { Teacher } from '../models/Teacher.js';
import { User } from '../models/User.js';
import { DEFAULT_TEACHERS } from '../../src/data/defaultTeachers.js';
import bcrypt from 'bcryptjs';

// Seed or fetch all teachers from MongoDB
export const getAllTeachers = async (req, res) => {
  try {
    let teachers = await Teacher.find().sort({ teacherCode: 1, createdAt: 1 });

    // Auto-seed if collection is empty
    if (teachers.length === 0) {
      console.log('🌱 Seeding initial teachers from DEFAULT_TEACHERS...');
      await Teacher.insertMany(DEFAULT_TEACHERS);
      teachers = await Teacher.find().sort({ teacherCode: 1, createdAt: 1 });
    }

    res.json({
      success: true,
      data: teachers,
      count: teachers.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new teacher (SuperAdmin / Principal only)
export const createTeacher = async (req, res) => {
  try {
    const { name, englishName, fatherName, designation, subject, mobile, dob, joiningDate, aadharNo, isClassTeacher, assignedClass, assignedSection } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'शिक्षक का नाम और मोबाइल नंबर आवश्यक है।' });
    }

    // Generate teacher code
    const count = await Teacher.countDocuments();
    const teacherCode = `T${String(count + 1).padStart(2, '0')}`;

    const newTeacher = await Teacher.create({
      teacherCode,
      name,
      englishName: englishName || '',
      fatherName: fatherName || '',
      designation: designation || 'सहायक अध्यापक',
      subject: subject || '',
      mobile: mobile.trim(),
      dob: dob || '',
      joiningDate: joiningDate || '',
      aadharNo: aadharNo || '',
      isClassTeacher: !!isClassTeacher,
      assignedClass: assignedClass || '',
      assignedSection: assignedSection || '',
      isPresent: true,
    });

    // Also create or link a login User account with default PIN '1234'
    const cleanPhone = mobile.trim();
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (!existingUser) {
      const defaultPinHash = await bcrypt.hash('1234', 10);
      await User.create({
        username: `teacher_${cleanPhone}`,
        name: name,
        role: 'teacher',
        phone: cleanPhone,
        pin: defaultPinHash,
        assignedTeacherId: newTeacher._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'शिक्षक का विवरण सफलतापूर्वक जोड़ा गया।',
      data: newTeacher,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update existing teacher (SuperAdmin / Principal only)
export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const teacher = await Teacher.findByIdAndUpdate(id, updateData, { new: true });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'शिक्षक रिकॉर्ड नहीं मिला।' });
    }

    // Sync User login phone if mobile was updated
    if (updateData.mobile) {
      const cleanPhone = updateData.mobile.trim();
      await User.findOneAndUpdate(
        { assignedTeacherId: id },
        { phone: cleanPhone, name: teacher.name },
        { upsert: false }
      );
    }

    res.json({
      success: true,
      message: 'शिक्षक रिकॉर्ड सफलतापूर्वक अपडेट किया गया।',
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete teacher (SuperAdmin / Principal only)
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByIdAndDelete(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'शिक्षक रिकॉर्ड नहीं मिला।' });
    }

    // Deactivate associated user login
    await User.findOneAndUpdate({ phone: teacher.mobile }, { active: false });

    res.json({
      success: true,
      message: 'शिक्षक रिकॉर्ड हटाया गया।',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk Import from Excel (Replace or merge teacher list)
export const bulkImportTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ success: false, message: 'वैध शिक्षक सूची प्रदान करें।' });
    }

    const defaultPinHash = await bcrypt.hash('1234', 10);

    for (const t of teachers) {
      if (!t.name || !t.mobile) continue;
      const cleanPhone = String(t.mobile).replace(/\D/g, '').slice(-10);
      if (!cleanPhone) continue;

      await Teacher.findOneAndUpdate(
        { mobile: cleanPhone },
        {
          name: t.name,
          englishName: t.englishName || '',
          fatherName: t.fatherName || '',
          designation: t.designation || 'सहायक अध्यापक',
          subject: t.subject || '',
          mobile: cleanPhone,
          dob: t.dob || '',
          joiningDate: t.joiningDate || '',
          aadharNo: t.aadharNo || '',
          isClassTeacher: !!t.isClassTeacher,
          assignedClass: t.assignedClass || '',
          assignedSection: t.assignedSection || '',
          isPresent: t.isPresent !== false,
        },
        { upsert: true, new: true }
      );

      // Ensure user account exists
      const existingUser = await User.findOne({ phone: cleanPhone });
      if (!existingUser) {
        await User.create({
          username: `teacher_${cleanPhone}`,
          name: t.name,
          role: 'teacher',
          phone: cleanPhone,
          pin: defaultPinHash,
        });
      }
    }

    const updatedList = await Teacher.find().sort({ teacherCode: 1, createdAt: 1 });
    res.json({
      success: true,
      message: `${teachers.length} शिक्षकों का डेटा सफलतापूर्वक सिंक किया गया।`,
      data: updatedList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
