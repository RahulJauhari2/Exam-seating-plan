import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { AbsenteeRecord } from '../models/AbsenteeRecord.js';
import { AbsenteeToggleSchema } from '../validations/authValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_ABSENTEES_FILE = path.join(DATA_DIR, 'local_absentees.json');

// Helper to read local absentees file
const readLocalAbsentees = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_ABSENTEES_FILE)) {
      fs.writeFileSync(LOCAL_ABSENTEES_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(LOCAL_ABSENTEES_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Error reading local absentees:', err.message);
    return [];
  }
};

// Helper to write local absentees file
const writeLocalAbsentees = (records) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_ABSENTEES_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local absentees:', err.message);
  }
};

// 1. Toggle or Record Absentee Status
export const toggleAbsentee = async (req, res) => {
  try {
    const valResult = AbsenteeToggleSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        success: false,
        message: 'अमान्य अनुपस्थिति डेटा।',
        errors: valResult.error.issues,
      });
    }

    const {
      rollNo,
      isAbsent,
      roomName,
      sessionName = 'Half_Yearly_2026_27',
      date = '',
      shift = 'shift_1',
      studentName = '',
      className = '',
      section = '',
    } = valResult.data;

    const markedBy = req.user?.name || req.body.markedBy || 'Teacher';
    const markedByRole = req.user?.role || req.body.markedByRole || 'teacher';

    const recordData = {
      rollNo,
      isAbsent,
      roomName,
      sessionName,
      date,
      shift,
      studentName,
      className,
      section,
      markedBy,
      markedByRole,
      updatedAt: new Date().toISOString(),
    };

    let savedRecord = null;

    if (mongoose.connection.readyState === 1) {
      if (isAbsent) {
        // Mark student absent: upsert record for this student & shift
        savedRecord = await AbsenteeRecord.findOneAndUpdate(
          { rollNo, shift },
          { ...recordData, updatedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        // Mark student present: completely remove from AbsenteeRecord so no ghost record lingers!
        await AbsenteeRecord.deleteMany({ rollNo, shift });
        savedRecord = { ...recordData, isAbsent: false };
      }
    }

    // Always mirror to local JSON file
    let localRecords = readLocalAbsentees();
    if (isAbsent) {
      const existingIdx = localRecords.findIndex(
        (r) => r.rollNo === rollNo && r.shift === shift
      );
      if (existingIdx >= 0) {
        localRecords[existingIdx] = { ...localRecords[existingIdx], ...recordData };
      } else {
        localRecords.push(recordData);
      }
    } else {
      localRecords = localRecords.filter(
        (r) => !(r.rollNo === rollNo && r.shift === shift)
      );
    }
    writeLocalAbsentees(localRecords);

    return res.json({
      success: true,
      message: `रोल नंबर ${rollNo} को ${isAbsent ? 'अनुपस्थित (ABSENT)' : 'उपस्थित (PRESENT)'} मार्क किया गया।`,
      data: savedRecord || recordData,
    });
  } catch (error) {
    console.error('Absentee toggle error:', error);
    return res.status(500).json({
      success: false,
      message: `अनुपस्थिति दर्ज करने में त्रुटि: ${error.message}`,
    });
  }
};

// 2. Get Live Absentees for current Date, Shift, and Session
export const getLiveAbsentees = async (req, res) => {
  try {
    const { sessionName, date, shift, roomName } = req.query;

    const filter = {};
    if (sessionName) {
      const cleanSession = sessionName.trim().replace(/\s+/g, '_');
      const spacedSession = sessionName.trim().replace(/\s+/g, ' ');
      filter.sessionName = {
        $in: [sessionName, cleanSession, spacedSession, 'Half Yearly  Examination 2026', 'Half_Yearly_2026_27'],
      };
    }
    if (shift) filter.shift = shift;
    if (roomName) filter.roomName = roomName;

    let records = [];

    if (mongoose.connection.readyState === 1) {
      records = await AbsenteeRecord.find(filter).sort({ updatedAt: -1 });
    } else {
      // Fallback to local file
      const local = readLocalAbsentees();
      records = local.filter((r) => {
        if (shift && r.shift !== shift) return false;
        if (roomName && r.roomName !== roomName) return false;
        return true;
      });
    }

    // Create a fast lookup map: { [rollNo]: record }
    // Only take the first/newest record per rollNo (since records is sorted { updatedAt: -1 })
    const absenteeMap = {};
    let totalAbsent = 0;
    records.forEach((r) => {
      if (!absenteeMap[r.rollNo]) {
        absenteeMap[r.rollNo] = r;
        if (r.isAbsent) totalAbsent++;
      }
    });

    return res.json({
      success: true,
      count: records.length,
      totalAbsent,
      timestamp: new Date().toISOString(),
      absenteeMap,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching absentees:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Clear or Reset Absentees for a Room / Date
export const resetAbsentees = async (req, res) => {
  try {
    const { sessionName, date, shift, roomName } = req.body;
    const filter = {};
    if (sessionName) filter.sessionName = sessionName;
    if (date) filter.date = date;
    if (shift) filter.shift = shift;
    if (roomName) filter.roomName = roomName;

    if (mongoose.connection.readyState === 1) {
      await AbsenteeRecord.deleteMany(filter);
    }

    const local = readLocalAbsentees();
    const remaining = local.filter((r) => {
      if (sessionName && r.sessionName === sessionName && (!date || r.date === date) && (!shift || r.shift === shift) && (!roomName || r.roomName === roomName)) {
        return false;
      }
      return true;
    });
    writeLocalAbsentees(remaining);

    return res.json({
      success: true,
      message: 'अनुपस्थिति रिकॉर्ड सफलतापूर्वक रीसेट किया गया।',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
