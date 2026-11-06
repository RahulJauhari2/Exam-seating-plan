import express from 'express';
import { 
  getHealth, 
  saveExamSession, 
  getAllSessions, 
  getSessionByName, 
  deleteSession,
  saveMarks,
  saveDutyRoster,
  saveEvaluationAllotment
} from '../controllers/examController.js';
import { verifyAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Health check & Read operations (Public / Read-only)
router.get('/health', getHealth);
router.get('/sessions', getAllSessions);
router.get('/sessions/:sessionName', getSessionByName);

// Protected Operations: Sessions CRUD
router.post('/sessions', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), saveExamSession);
router.delete('/sessions/:sessionName', verifyAuth, requireRole(['principal', 'superadmin', 'admin']), deleteSession);

// Protected Marks endpoints (Teachers, Coordinators, Principal, Admin)
router.post('/marks', verifyAuth, requireRole(['teacher', 'principal', 'coordinator', 'superadmin', 'admin']), saveMarks);

// Protected Duty Roster endpoint (Coordinator, Principal, Admin)
router.post('/duty-roster', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), saveDutyRoster);

// Protected Evaluation Allotment & Locks endpoint (Coordinator, Principal, Admin)
router.post('/allotment', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), saveEvaluationAllotment);

export default router;
