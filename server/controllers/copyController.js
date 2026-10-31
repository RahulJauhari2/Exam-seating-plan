import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { CopyRecord } from '../models/CopyRecord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_COPIES_FILE = path.join(DATA_DIR, 'local_copies.json');

// Helper to read local copies file
const readLocalCopies = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_COPIES_FILE)) {
      fs.writeFileSync(LOCAL_COPIES_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(LOCAL_COPIES_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Error reading local copies:', err.message);
    return [];
  }
};

// Helper to write local copies file
const writeLocalCopies = (records) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_COPIES_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local copies:', err.message);
  }
};

// 1. Record or update B-Copies for a student
export const updateStudentCopies = async (req, res) => {
  try {
    const {
      rollNo,
      bCopiesCount = 1,
      bCopyNumbers = [],
      aCopyNumber = '',
      roomName,
      sessionName = 'Half_Yearly_2026_27',
      date = '',
      shift = 'shift_1',
      studentName = '',
      className = '',
      section = '',
    } = req.body;

    if (!rollNo || !roomName) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and room name are required.',
      });
    }

    const markedBy = req.user?.name || req.body.markedBy || 'Teacher';
    const markedByRole = req.user?.role || req.body.markedByRole || 'teacher';

    const recordData = {
      rollNo: Number(rollNo),
      bCopiesCount: Math.max(0, Number(bCopiesCount) || 0),
      bCopyNumbers: Array.isArray(bCopyNumbers) ? bCopyNumbers : (bCopyNumbers ? [String(bCopyNumbers)] : []),
      aCopyNumber: String(aCopyNumber || ''),
      roomName,
      sessionName,
      date,
      shift,
      studentName,
      className,
      section,
      markedBy,
      markedByRole,
      updatedAt: new Date(),
    };

    let savedRecord = null;

    if (mongoose.connection.readyState === 1) {
      if (recordData.bCopiesCount > 0 || recordData.aCopyNumber) {
        savedRecord = await CopyRecord.findOneAndUpdate(
          { rollNo: recordData.rollNo, shift },
          recordData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        // If count is 0 and no A-copy serial, remove record
        await CopyRecord.deleteMany({ rollNo: recordData.rollNo, shift });
        savedRecord = { ...recordData, bCopiesCount: 0 };
      }
    }

    // Mirror to local JSON
    let local = readLocalCopies();
    if (recordData.bCopiesCount > 0 || recordData.aCopyNumber) {
      const idx = local.findIndex((r) => r.rollNo === recordData.rollNo && r.shift === shift);
      if (idx >= 0) local[idx] = { ...local[idx], ...recordData };
      else local.push(recordData);
    } else {
      local = local.filter((r) => !(r.rollNo === recordData.rollNo && r.shift === shift));
    }
    writeLocalCopies(local);

    return res.json({
      success: true,
      message: `रोल नंबर ${rollNo} की उत्तर पुस्तिका (B-कॉपी: ${recordData.bCopiesCount}) दर्ज की गई।`,
      data: savedRecord || recordData,
    });
  } catch (error) {
    console.error('Update copies error:', error);
    return res.status(500).json({
      success: false,
      message: `कॉपी दर्ज करने में त्रुटि: ${error.message}`,
    });
  }
};

// 2. Get Live Copies
export const getLiveCopies = async (req, res) => {
  try {
    const { sessionName, shift, roomName } = req.query;

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
      records = await CopyRecord.find(filter).sort({ updatedAt: -1 });
    } else {
      const local = readLocalCopies();
      records = local.filter((r) => {
        if (shift && r.shift !== shift) return false;
        if (roomName && r.roomName !== roomName) return false;
        return true;
      });
    }

    // Build fast lookup map: { [rollNo]: record }
    const copyMap = {};
    let totalBCopies = 0;
    records.forEach((r) => {
      if (!copyMap[r.rollNo]) {
        copyMap[r.rollNo] = r;
        totalBCopies += (r.bCopiesCount || 0);
      }
    });

    return res.json({
      success: true,
      count: records.length,
      totalBCopies,
      copyMap,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching copies:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Reset Copies
export const resetCopies = async (req, res) => {
  try {
    const { shift, roomName } = req.body;
    const filter = {};
    if (shift) filter.shift = shift;
    if (roomName) filter.roomName = roomName;

    if (mongoose.connection.readyState === 1) {
      await CopyRecord.deleteMany(filter);
    }
    let local = readLocalCopies();
    local = local.filter((r) => {
      if (shift && r.shift === shift && (!roomName || r.roomName === roomName)) return false;
      return true;
    });
    writeLocalCopies(local);

    return res.json({
      success: true,
      message: 'उत्तर पुस्तिका रिकॉर्ड रीसेट किया गया।',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
