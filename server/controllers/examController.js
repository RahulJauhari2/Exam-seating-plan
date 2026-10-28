import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExamSession } from '../models/ExamSession.js';
import { 
  ExamSessionValidationSchema, 
  MarksDataValidationSchema 
} from '../validations/examValidation.js';

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
  
  return res.json({
    status: isConnected ? 'healthy' : 'local_fallback',
    database: {
      connected: isConnected,
      mode: isConnected ? 'MongoDB (Connected)' : 'Local File Storage (Auto-Fallback Active)',
      state: states[mongoose.connection.readyState] || 'Unknown',
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
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
      const session = await ExamSession.findOne({ 
        sessionName: sessionName, 
        activeShift: shift 
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: `सत्र '${sessionName}' (${shift}) नहीं मिला।`,
        });
      }

      return res.json({
        success: true,
        storage: 'mongodb',
        data: session,
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

// 7. Save or Update Duty Roster specifically in MongoDB
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
      const updatedSession = await ExamSession.findOneAndUpdate(
        { sessionName, activeShift },
        { 
          $set: { dutyRoster } 
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        storage: 'mongodb',
        message: `सत्र '${sessionName}' (${activeShift}) का ड्यूटी रोस्टर MongoDB में सुरक्षित हो गया!`,
        data: updatedSession.dutyRoster,
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
        dutyRoster,
        createdAt: new Date().toISOString(),
      };
    } else {
      localData[key].dutyRoster = dutyRoster;
      localData[key].updatedAt = new Date().toISOString();
    }
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
