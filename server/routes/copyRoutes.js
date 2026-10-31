import express from 'express';
import { updateStudentCopies, getLiveCopies, resetCopies } from '../controllers/copyController.js';
import { verifyAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get live copies map
router.get('/', getLiveCopies);

// Record or update B-copies for a student
router.post('/update', verifyAuth, updateStudentCopies);

// Reset copies
router.post('/reset', verifyAuth, requireRole(['principal', 'coordinator', 'admin', 'teacher', 'superadmin']), resetCopies);

export default router;
