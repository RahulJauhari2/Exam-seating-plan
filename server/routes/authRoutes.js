import express from 'express';
import { loginUser, getMe, getAllUsers, updateUserRole } from '../controllers/authController.js';
import { verifyAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: Login (Supports phone+pin for teachers OR username+pass for admins)
router.post('/login', loginUser);

// Protected: Get current user profile
router.get('/me', verifyAuth, getMe);

// Protected: Get all registered staff/teachers (Admin, Principal, Coordinator)
router.get('/users', verifyAuth, requireRole(['principal', 'coordinator']), getAllUsers);

// Protected: Update role / details of a user (Principal & SuperAdmin only)
router.put('/users/:userId', verifyAuth, requireRole(['principal']), updateUserRole);

export default router;
