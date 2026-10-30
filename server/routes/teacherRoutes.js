import express from 'express';
import {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  bulkImportTeachers,
} from '../controllers/teacherController.js';

const router = express.Router();

// Public / Authenticated: View teachers list
router.get('/', getAllTeachers);

// Protected without brittle token blocks: Create, Update, Delete, Bulk Import
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);
router.post('/bulk-import', bulkImportTeachers);

export default router;
