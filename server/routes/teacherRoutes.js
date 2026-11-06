import express from 'express';
import {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  bulkImportTeachers,
} from '../controllers/teacherController.js';
import { verifyAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Authenticated: View teachers list
router.get('/', getAllTeachers);

// Protected: Only Admin/Principal/Coordinator can modify teacher records
router.post('/', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), createTeacher);
router.put('/:id', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), updateTeacher);
router.delete('/:id', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), deleteTeacher);
router.post('/bulk-import', verifyAuth, requireRole(['principal', 'coordinator', 'superadmin', 'admin']), bulkImportTeachers);

export default router;
