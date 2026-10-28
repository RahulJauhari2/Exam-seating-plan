import express from 'express';
import { 
  getHealth, 
  saveExamSession, 
  getAllSessions, 
  getSessionByName, 
  deleteSession,
  saveMarks,
  saveDutyRoster
} from '../controllers/examController.js';

const router = express.Router();

// Health check
router.get('/health', getHealth);

// Sessions CRUD
router.post('/sessions', saveExamSession);
router.get('/sessions', getAllSessions);
router.get('/sessions/:sessionName', getSessionByName);
router.delete('/sessions/:sessionName', deleteSession);

// Marks endpoints
router.post('/marks', saveMarks);

// Duty Roster endpoint
router.post('/duty-roster', saveDutyRoster);

export default router;
