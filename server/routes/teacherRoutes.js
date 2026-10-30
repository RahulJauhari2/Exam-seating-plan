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

// Protected: SuperAdmin, Principal, Coordinator & Staff can create, edit, delete, or bulk import
router.post('/', verifyAuth, requireRole(['principal', 'coordinator', 'admin', 'teacher']), createTeacher);
router.put('/:id', verifyAuth, requireRole(['principal', 'coordinator', 'admin', 'teacher']), updateTeacher);
router.delete('/:id', verifyAuth, requireRole(['principal', 'coordinator', 'admin', 'teacher']), deleteTeacher);
router.post('/bulk-import', verifyAuth, requireRole(['principal', 'coordinator', 'admin', 'teacher']), bulkImportTeachers);

export default router;
