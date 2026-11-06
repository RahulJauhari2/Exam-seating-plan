import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { CopyRecord } from '../models/CopyRecord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_COPIES_FILE = path.join(DATA_DIR, 'local_copies.json');

// Standard Date Normalizer to canonical 'YYYY-MM-DD'
export const normalizeToCanonicalDate = (d) => {
  if (!d) return '';
  const str = String(d).trim().replace(/\//g, '-');
  const parts = str.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts[2].length === 2) {
      return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return str;
};

// Generates all standard format variations of a date for backwards-compatible matching
export const getAllDateVariations = (d) => {
  if (!d || d === 'all') return [];
  const canonical = normalizeToCanonicalDate(d);
  const variations = new Set([String(d).trim(), canonical]);
  const parts = canonical.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const yyyy = parts[0];
    const yy = yyyy.slice(2);
    const mm = parts[1];
    const dd = parts[2];
    variations.add(`${dd}-${mm}-${yyyy}`);
    variations.add(`${dd}-${mm}-${yy}`);
    variations.add(`${dd}/${mm}/${yyyy}`);
    variations.add(`${dd}/${mm}/${yy}`);
    variations.add(`${yyyy}/${mm}/${dd}`);
  }
  return Array.from(variations);
};

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
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    const effectiveDate = normalizeToCanonicalDate(date || new Date().toISOString().split('T')[0]);
    const dateVariations = getAllDateVariations(effectiveDate);

    const recordData = {
      rollNo: Number(rollNo),
      bCopiesCount: Math.max(0, Number(bCopiesCount) || 0),
      bCopyNumbers: Array.isArray(bCopyNumbers) ? bCopyNumbers : (bCopyNumbers ? [String(bCopyNumbers)] : []),
      aCopyNumber: String(aCopyNumber || ''),
      roomName,
      sessionName,
      date: effectiveDate,
      shift,
      studentName,
      className,
      section,
      markedBy,
      markedByRole,
      clientIp,
      userAgent,
      updatedAt: new Date(),
    };

    const queryFilter = { rollNo: recordData.rollNo, shift, date: { $in: dateVariations } };

    let savedRecord = null;

    if (mongoose.connection.readyState === 1) {
      if (recordData.bCopiesCount > 0 || recordData.aCopyNumber) {
        savedRecord = await CopyRecord.findOneAndUpdate(
          queryFilter,
          { ...recordData, date: effectiveDate },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        // If count is 0 and no A-copy serial, remove record for this date & shift
        await CopyRecord.deleteMany(queryFilter);
        savedRecord = { ...recordData, bCopiesCount: 0 };
      }
    }

    // Mirror to local JSON
    let local = readLocalCopies();
    if (recordData.bCopiesCount > 0 || recordData.aCopyNumber) {
      const idx = local.findIndex((r) => r.rollNo === recordData.rollNo && r.shift === shift && (!recordData.date || normalizeToCanonicalDate(r.date) === effectiveDate));
      if (idx >= 0) local[idx] = { ...local[idx], ...recordData };
      else local.push(recordData);
    } else {
      local = local.filter((r) => !(r.rollNo === recordData.rollNo && r.shift === shift && (!recordData.date || normalizeToCanonicalDate(r.date) === effectiveDate)));
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
    let { sessionName, shift, roomName, date } = req.query;

    // Defend against array parameters caused by duplicate query string keys
    if (Array.isArray(sessionName)) sessionName = sessionName[0];
    if (Array.isArray(shift)) shift = shift[0];
    if (Array.isArray(roomName)) roomName = roomName[0];
    if (Array.isArray(date)) date = date[0];

    if (typeof sessionName === 'string') sessionName = sessionName.trim();
    if (typeof shift === 'string') shift = shift.trim();
    if (typeof roomName === 'string') roomName = roomName.trim();
    if (typeof date === 'string') date = date.trim();

    const filter = {};
    if (sessionName) {
      const cleanSession = sessionName.trim().replace(/\s+/g, '_');
      const spacedSession = sessionName.trim().replace(/\s+/g, ' ');
      filter.sessionName = {
        $in: [sessionName, cleanSession, spacedSession, 'Half Yearly  Examination 2026', 'Half_Yearly_2026_27'],
      };
    }
    if (shift && shift !== 'all') filter.shift = shift;
    if (roomName && roomName !== 'all') filter.roomName = roomName;
    if (date && date !== 'all') {
      const dateVariations = getAllDateVariations(date);
      filter.date = { $in: dateVariations };
    }

    let records = [];

    if (mongoose.connection.readyState === 1) {
      records = await CopyRecord.find(filter).sort({ updatedAt: -1 });
    } else {
      const local = readLocalCopies();
      const canonicalTargetDate = date && date !== 'all' ? normalizeToCanonicalDate(date) : null;
      records = local.filter((r) => {
        if (canonicalTargetDate && r.date) {
          const rCanonical = normalizeToCanonicalDate(r.date);
          if (rCanonical !== canonicalTargetDate) return false;
        }
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
