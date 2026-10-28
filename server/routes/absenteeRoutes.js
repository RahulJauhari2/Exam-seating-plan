import express from 'express';
import { toggleAbsentee, getLiveAbsentees, resetAbsentees } from '../controllers/absenteeController.js';
import { verifyAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get live absentee records (Open/pollable or token authenticated)
router.get('/', getLiveAbsentees);

// Toggle student absent/present (Teachers, Principal, Coordinator, SuperAdmin)
router.post('/toggle', verifyAuth, toggleAbsentee);

// Reset absentees for a room or shift (Principal, Coordinator, SuperAdmin)
router.post('/reset', verifyAuth, requireRole(['principal', 'coordinator']), resetAbsentees);

export default router;
