import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import examRoutes from './routes/examRoutes.js';
import authRoutes from './routes/authRoutes.js';
import absenteeRoutes from './routes/absenteeRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import { seedInitialUsers } from './controllers/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allows requests from Vite frontend (localhost:5173, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', examRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/absentees', absenteeRoutes);
app.use('/api/teachers', teacherRoutes);

// Root test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Exam Seating Plan & Result Management System API with RBAC & Live Absentee Sync',
    database: 'MongoDB + Mongoose',
    validation: 'Zod Validation Engine',
    status: 'Running',
    version: '2.0.0',
    documentation: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/login, GET /api/auth/me, GET /api/auth/users',
      absentees: 'GET /api/absentees, POST /api/absentees/toggle',
      sessions: 'GET /api/sessions, POST /api/sessions',
      singleSession: 'GET /api/sessions/:sessionName',
      marks: 'POST /api/marks',
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server and Connect DB
const startServer = async () => {
  await connectDB();
  await seedInitialUsers();
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check available at http://localhost:${PORT}/api/health`);
    console.log(`🔒 RBAC Auth & Live Absentee Sync endpoints ready`);
  });
};

startServer();
