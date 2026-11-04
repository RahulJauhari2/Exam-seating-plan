import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExamSession } from '../models/ExamSession.js';
import { 
  ExamSessionValidationSchema, 
  MarksDataValidationSchema 
} from '../validations/examValidation.js';
import { getLastConnectionError, getMongoUri, connectDB } from '../config/db.js';

// Setup local JSON file storage fallback when MongoDB is offline
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const LOCAL_SESSIONS_FILE = path.join(DATA_DIR, 'local_sessions.json');

const ensureLocalFile = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_SESSIONS_FILE)) {
    fs.writeFileSync(LOCAL_SESSIONS_FILE, JSON.stringify({}), 'utf-8');
  }
};

const readLocalSessions = () => {
  try {
    ensureLocalFile();
    const content = fs.readFileSync(LOCAL_SESSIONS_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch {
    return {};
  }
};

const writeLocalSessions = (data) => {
  try {
    ensureLocalFile();
    fs.writeFileSync(LOCAL_SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write local sessions file', err);
    return false;
  }
};

// 1. Health check & DB status
export const getHealth = async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const uri = getMongoUri();
  const isAtlas = uri.includes('mongodb.net') || uri.includes('+srv');
  const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  
  return res.json({
    status: isConnected ? 'healthy' : 'local_fallback',
    database: {
      connected: isConnected,
      mode: isConnected ? 'MongoDB (Connected)' : 'Local File Storage (Auto-Fallback Active)',
      state: states[mongoose.connection.readyState] || 'Unknown',
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      isAtlas,
      configuredUri: sanitizedUri,
      hasCustomUri: Boolean(process.env.MONGODB_URI),
      lastError: getLastConnectionError() || null,
    },
    timestamp: new Date().toISOString(),
  });
};

// 2. Save or Update full exam session (Validated with Zod)
export const saveExamSession = async (req, res) => {
  try {
    // ZOD VALIDATION STEP (Always strictly validates payload)
    const validationResult = ExamSessionValidationSchema.safeParse(req.body);

    if (!validationResult.success) {
      // Format Zod errors cleanly for client
      const formattedErrors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'डेटा सत्यापन विफल (Zod Validation Failed)',
        errors: formattedErrors,
      });
    }

    const validatedData = validationResult.data;

    // A. If MongoDB is connected: use MongoDB
    if (mongoose.connection.readyState === 1) {
      // Preserve existing dutyRoster & evaluationAllotment if the incoming one is empty
      const existing = await ExamSession.findOne({ 
        sessionName: validatedData.sessionName, 
        activeShift: validatedData.activeShift 
      });
      if (existing) {
        if ((!validatedData.dutyRoster || Object.keys(validatedData.dutyRoster).length === 0) && existing.dutyRoster && Object.keys(existing.dutyRoster).length > 0) {
          validatedData.dutyRoster = existing.dutyRoster;
        }
        if ((!validatedData.evaluationAllotment || Object.keys(validatedData.evaluationAllotment).length === 0) && existing.evaluationAllotment && Object.keys(existing.evaluationAllotment).length > 0) {
          validatedData.evaluationAllotment = existing.evaluationAllotment;
          validatedData.marksLocks = existing.marksLocks || {};
        }
      }

      const session = await ExamSession.findOneAndUpdate(
        { 
          sessionName: validatedData.sessionName, 
          activeShift: validatedData.activeShift 
        },
        validatedData,
        { new: true, upsert: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        storage: 'mongodb',
        message: `सत्र '${session.sessionName}' (${session.activeShift}) सफलतापूर्वक MongoDB में सुरक्षित हो गया!`,
        data: session,
      });
    }

    // B. Fallback: Save to Server Local Storage so work is never lost!
    const localData = readLocalSessions();
    const key = `${validatedData.sessionName}_${validatedData.activeShift}`;
    const now = new Date().toISOString();
    localData[key] = {
      ...validatedData,
      createdAt: localData[key]?.createdAt || now,
      updatedAt: now,
    };
    writeLocalSessions(localData);

    return res.status(200).json({
      success: true,
      storage: 'local_fallback',
      message: `सत्र '${validatedData.sessionName}' सुरक्षित हुआ (सर्वर स्टोरेज मोड - MongoDB ऑफ़लाइन था)।`,
      data: localData[key],
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({
      success: false,
      message: `सत्र सुरक्षित करने में त्रुटि: ${error.message}`,
    });
  }
};

// 3. Get all saved sessions summary list
export const getAllSessions = async (req, res) => {
  try {
    // If MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      const sessions = await ExamSession.find(
        {},
        'sessionName activeShift examDetails.schoolName examDetails.examName updatedAt createdAt'
      ).sort({ updatedAt: -1 });

      return res.json({
        success: true,
        storage: 'mongodb',
        count: sessions.length,
        data: sessions,
      });
    }

    // Local Fallback list
    const localData = readLocalSessions();
    const sessions = Object.values(localData).map((s) => ({
      sessionName: s.sessionName,
      activeShift: s.activeShift,
      examDetails: s.examDetails,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    })).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return res.json({
      success: true,
      storage: 'local_fallback',
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Get specific session by name and shift
export const getSessionByName = async (req, res) => {
  try {
    const { sessionName } = req.params;
    const { shift = 'shift_1' } = req.query;

    if (mongoose.connection.readyState === 1) {
      let session = await ExamSession.findOne({ 
        sessionName: sessionName, 
        activeShift: shift 
      });

      // Flexible fallback: match regex or match most recent session for this shift
      if (!session) {
        session = await ExamSession.findOne({
          activeShift: shift,
          $or: [
            { sessionName: { $regex: sessionName.replace(/[_\\s]+/g, '.*'), $options: 'i' } },
            { 'examDetails.examName': { $regex: sessionName.replace(/[_\\s]+/g, '.*'), $options: 'i' } }
          ]
        });
      }

      if (!session) {
        session = await ExamSession.findOne({ activeShift: shift }).sort({ updatedAt: -1 });
      }

      if (!session) {
        return res.status(404).json({
          success: false,
          message: `सत्र '${sessionName}' (${shift}) नहीं मिला।`,
        });
      }

      // Convert mongoose doc to plain object if needed
      const sessionObj = session.toObject ? session.toObject() : { ...session };

      // Cross-Shift Fallback: If dutyRoster in this shift is empty, retrieve dutyRoster from any other active session
      if (!sessionObj.dutyRoster || Object.keys(sessionObj.dutyRoster).length === 0) {
        const altSession = await ExamSession.findOne({
          dutyRoster: { $exists: true, $ne: {} },
        }).sort({ updatedAt: -1 });
        if (altSession && altSession.dutyRoster && Object.keys(altSession.dutyRoster).length > 0) {
          sessionObj.dutyRoster = altSession.dutyRoster;
        }
      }

      // Automatically expand all date aliases so frontend client can query with any date format
      if (sessionObj.dutyRoster) {
        sessionObj.dutyRoster = expandDutyRosterAliases(sessionObj.dutyRoster);
      }

      // Cross-Shift Fallback: If evaluationAllotment is empty, retrieve from any session with allotments
      if (!sessionObj.evaluationAllotment || Object.keys(sessionObj.evaluationAllotment).length === 0) {
        const altSession = await ExamSession.findOne({
          evaluationAllotment: { $exists: true, $ne: {} },
        }).sort({ updatedAt: -1 });
        if (altSession && altSession.evaluationAllotment && Object.keys(altSession.evaluationAllotment).length > 0) {
          sessionObj.evaluationAllotment = altSession.evaluationAllotment;
          sessionObj.marksLocks = altSession.marksLocks || {};
        }
      }

      return res.json({
        success: true,
        storage: 'mongodb',
        data: sessionObj,
      });
    }

    // Local Fallback
    const localData = readLocalSessions();
    const key = `${sessionName}_${shift}`;
    const session = localData[key];

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `सत्र '${sessionName}' (${shift}) नहीं मिला।`,
      });
    }

    return res.json({
      success: true,
      storage: 'local_fallback',
      data: session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 5. Delete a session
export const deleteSession = async (req, res) => {
  try {
    const { sessionName } = req.params;
    const { shift = 'shift_1' } = req.query;

    if (mongoose.connection.readyState === 1) {
      const deleted = await ExamSession.findOneAndDelete({
        sessionName: sessionName,
        activeShift: shift,
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `सत्र '${sessionName}' नहीं मिला।`,
        });
      }

      return res.json({
        success: true,
        storage: 'mongodb',
        message: `सत्र '${sessionName}' सफलतापूर्वक हटा दिया गया।`,
      });
    }

    // Local Fallback
    const localData = readLocalSessions();
    const key = `${sessionName}_${shift}`;
    if (!localData[key]) {
      return res.status(404).json({
        success: false,
        message: `सत्र '${sessionName}' नहीं मिला।`,
      });
    }

    delete localData[key];
    writeLocalSessions(localData);

    return res.json({
      success: true,
      storage: 'local_fallback',
      message: `सत्र '${sessionName}' सफलतापूर्वक हटा दिया गया।`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 6. Save or update marks specifically (Validated with Zod)
export const saveMarks = async (req, res) => {
  try {
    const { sessionName = 'default_session', activeShift = 'shift_1', marksData } = req.body;

    // ZOD VALIDATION FOR MARKS
    const validationResult = MarksDataValidationSchema.safeParse(marksData);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'अंक डेटा सत्यापन विफल (Zod Marks Validation Failed)',
        errors: formattedErrors,
      });
    }

    if (mongoose.connection.readyState === 1) {
      const session = await ExamSession.findOneAndUpdate(
        { sessionName, activeShift },
        { $set: { marksData: validationResult.data } },
        { new: true }
      );

      return res.json({
        success: true,
        storage: 'mongodb',
        message: 'अंक सफलतापूर्वक MongoDB में सुरक्षित हो गए!',
        data: session?.marksData || validationResult.data,
      });
    }

    // Local Fallback
    const localData = readLocalSessions();
    const key = `${sessionName}_${activeShift}`;
    if (!localData[key]) {
      localData[key] = {
        sessionName,
        activeShift,
        classes: [],
        rooms: [],
        examDetails: { schoolName: 'A B V I C', examName: 'Exam' },
      };
    }
    localData[key].marksData = validationResult.data;
    localData[key].updatedAt = new Date().toISOString();
    writeLocalSessions(localData);

    return res.json({
      success: true,
      storage: 'local_fallback',
      message: 'अंक सुरक्षित हो गए (सर्वर स्टोरेज मोड)!',
      data: validationResult.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const TIMETABLE_DATE_MAP = {
  d1: ['2026-10-31', '31-10-2026', '31-10-26'],
  d2: ['2026-11-02', '02-11-2026', '02-11-26'],
  d3: ['2026-11-03', '03-11-2026', '03-11-26'],
  d4: ['2026-11-04', '04-11-2026', '04-11-26'],
  d5: ['2026-11-05', '05-11-2026', '05-11-26'],
  d6: ['2026-11-06', '06-11-2026', '06-11-26'],
  d7: ['2026-11-07', '07-11-2026', '07-11-26'],
};

// Helper to expand aliases so duty roster slots are accessible by both day ID and real date
const expandDutyRosterAliases = (roster = {}) => {
  const expanded = { ...roster };
  for (const [dayId, dateAliases] of Object.entries(TIMETABLE_DATE_MAP)) {
    ['shift_1', 'shift_2'].forEach((sh) => {
      const srcKey = `${dayId}_${sh}`;
      const srcData = roster[srcKey];
      if (srcData && typeof srcData === 'object' && Object.keys(srcData.rooms || {}).length > 0) {
        dateAliases.forEach((alias) => {
          const aliasKey = `${alias}_${sh}`;
          expanded[aliasKey] = srcData;
        });
      }
    });
  }
  return expanded;
};

// 7. Save or Update Duty Roster specifically in MongoDB (Atomic Deep-Merge, Zero-Wipeout)
export const saveDutyRoster = async (req, res) => {
  try {
    const { sessionName, activeShift = 'shift_1', dutyRoster = {} } = req.body;

    if (!sessionName) {
      return res.status(400).json({
        success: false,
        message: 'सत्र का नाम आवश्यक है (sessionName is required)',
      });
    }

    if (mongoose.connection.readyState === 1) {
      let target = await ExamSession.findOne({ sessionName, activeShift });
      if (!target) {
        target = await ExamSession.findOne({
          $or: [
            { sessionName: { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
            { 'examDetails.examName': { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } }
          ]
        });
      }
      const actualName = target ? target.sessionName : sessionName;

      // 1. Fetch all existing sessions to deep-merge existing rosters
      const existingSessions = await ExamSession.find({
        $or: [
          { sessionName: actualName },
          { sessionName: { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
          { 'examDetails.examName': { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } }
        ]
      });

      // 2. Accumulate all existing slots so no slot/shift is ever wiped
      let mergedRoster = {};
      existingSessions.forEach((s) => {
        if (s.dutyRoster && typeof s.dutyRoster === 'object') {
          mergedRoster = { ...mergedRoster, ...s.dutyRoster };
        }
      });

      // 3. Deep-merge incoming slots with Server-Side PIN Lock Protection
      for (const [slotKey, slotData] of Object.entries(dutyRoster)) {
        if (slotData && typeof slotData === 'object') {
          const existingSlot = mergedRoster[slotKey];
          const isCurrentlyLocked = Boolean(existingSlot?.isLocked);
          const isUnlocking = slotData.isLocked === false;

          // If slot is locked in database and not explicitly being unlocked, protect rooms and relievers
          if (isCurrentlyLocked && !isUnlocking) {
            const incomingPin = slotData.lockPin || slotData.pin || req.body.lockPin || req.body.pin;
            const savedPin = existingSlot?.lockPin || existingSlot?.pin;
            if (savedPin && String(incomingPin || '').trim() !== String(savedPin).trim()) {
              // Keep locked slot safe from background auto-sync overwrites
              continue;
            }
          }

          mergedRoster[slotKey] = {
            ...(existingSlot || {}),
            ...slotData,
            rooms: {
              ...(existingSlot?.rooms || {}),
              ...(slotData.rooms || {})
            }
          };
          if (Array.isArray(slotData.relievers)) {
            mergedRoster[slotKey].relievers = slotData.relievers;
          }
          if (slotData.isLocked !== undefined) {
            mergedRoster[slotKey].isLocked = Boolean(slotData.isLocked);
          }
          const finalPin = slotData.lockPin !== undefined ? slotData.lockPin : slotData.pin;
          if (finalPin !== undefined) {
            mergedRoster[slotKey].lockPin = finalPin;
            mergedRoster[slotKey].pin = finalPin;
          }
        }
      }

      // 4. Automatically expand date aliases
      mergedRoster = expandDutyRosterAliases(mergedRoster);

      // 5. Update ALL matching sessions for both shift_1 and shift_2
      await ExamSession.updateMany(
        {
          $or: [
            { sessionName: actualName },
            { sessionName: { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
            { 'examDetails.examName': { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } }
          ]
        },
        { 
          $set: { dutyRoster: mergedRoster } 
        }
      );

      return res.status(200).json({
        success: true,
        storage: 'mongodb',
        message: `सत्र '${actualName}' का ड्यूटी रोस्टर MongoDB में सुरक्षित हो गया!`,
        data: mergedRoster,
      });
    }

    // Local Fallback: update both shift keys
    const localData = readLocalSessions();
    ['shift_1', 'shift_2'].forEach((sh) => {
      const k = `${sessionName}_${sh}`;
      if (!localData[k]) {
        localData[k] = {
          sessionName,
          activeShift: sh,
          classes: [],
          rooms: [],
          dutyRoster,
          createdAt: new Date().toISOString(),
        };
      } else {
        localData[k].dutyRoster = dutyRoster;
        localData[k].updatedAt = new Date().toISOString();
      }
    });
    writeLocalSessions(localData);

    return res.status(200).json({
      success: true,
      storage: 'local_fallback',
      message: `ड्यूटी रोस्टर सुरक्षित हुआ (लोकल बैकअप मोड - MongoDB ऑफलाइन था)।`,
      data: dutyRoster,
    });
  } catch (error) {
    console.error('Error saving duty roster:', error);
    return res.status(500).json({
      success: false,
      message: `ड्यूटी रोस्टर सुरक्षित करने में त्रुटि: ${error.message}`,
    });
  }
};

// 8. Save or Update Evaluation Allotment & Locks in MongoDB
export const saveEvaluationAllotment = async (req, res) => {
  try {
    const { sessionName, activeShift = 'shift_1', evaluationAllotment = {}, marksLocks = {} } = req.body;

    if (!sessionName) {
      return res.status(400).json({
        success: false,
        message: 'सत्र का नाम आवश्यक है (sessionName is required)',
      });
    }

    if (mongoose.connection.readyState === 1) {
      let target = await ExamSession.findOne({ sessionName, activeShift });
      if (!target) {
        target = await ExamSession.findOne({
          $or: [
            { sessionName: { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
            { 'examDetails.examName': { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
          ],
        });
      }
      const actualName = target ? target.sessionName : sessionName;

      // Update ALL matching sessions for both shifts so evaluation allotment is synchronized
      await ExamSession.updateMany(
        {
          $or: [
            { sessionName: actualName },
            { sessionName: { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } },
            { 'examDetails.examName': { $regex: sessionName.replace(/[_\s]+/g, '.*'), $options: 'i' } }
          ]
        },
        {
          $set: { evaluationAllotment, marksLocks },
        }
      );

      const updatedSession = await ExamSession.findOneAndUpdate(
        { sessionName: actualName, activeShift },
        {
          $set: { evaluationAllotment, marksLocks },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        storage: 'mongodb',
        message: `कॉपी मूल्यांकन आवंटन सत्र '${actualName}' (${activeShift}) हेतु MongoDB में सुरक्षित हुआ!`,
        data: {
          evaluationAllotment: updatedSession.evaluationAllotment || {},
          marksLocks: updatedSession.marksLocks || {},
        },
      });
    }

    // Local Fallback: update both shift keys
    const localData = readLocalSessions();
    ['shift_1', 'shift_2'].forEach((sh) => {
      const k = `${sessionName}_${sh}`;
      if (!localData[k]) {
        localData[k] = {
          sessionName,
          activeShift: sh,
          classes: [],
          rooms: [],
          evaluationAllotment,
          marksLocks,
          createdAt: new Date().toISOString(),
        };
      } else {
        localData[k].evaluationAllotment = evaluationAllotment;
        localData[k].marksLocks = marksLocks;
        localData[k].updatedAt = new Date().toISOString();
      }
    });
    writeLocalSessions(localData);

    return res.status(200).json({
      success: true,
      storage: 'local_fallback',
      message: `कॉपी आवंटन सुरक्षित हुआ (लोकल बैकअप)।`,
      data: { evaluationAllotment, marksLocks },
    });
  } catch (error) {
    console.error('Error saving evaluation allotment:', error);
    return res.status(500).json({
      success: false,
      message: `कॉपी आवंटन सुरक्षित करने में त्रुटि: ${error.message}`,
    });
  }
};
