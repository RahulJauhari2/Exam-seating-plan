import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import examRoutes from './routes/examRoutes.js';
import authRoutes from './routes/authRoutes.js';
import absenteeRoutes from './routes/absenteeRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import copyRoutes from './routes/copyRoutes.js';
import { seedInitialUsers } from './controllers/authController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/copies', copyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Serve frontend build static files (dist/)
app.use(express.static(distPath));

// SPA Client-side Routing Fallback (for non-API requests)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
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
