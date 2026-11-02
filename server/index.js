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

// Load .env from root, current dir, or server dir (covers Docker, Coolify, and local dev)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Auto-parse multiline string if saved under 'Env' or 'ENV' in Coolify modal
const rawEnvBlock = process.env.Env || process.env.ENV || process.env.env || '';
if (rawEnvBlock && rawEnvBlock.includes('=')) {
  rawEnvBlock.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  });
}

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Serve frontend build static files (dist/)
app.use(express.static(distPath));

// SPA Client-side Routing Fallback (for non-API requests)
app.use((req, res, next) => {
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

// Start Server immediately on 0.0.0.0 so Docker/Coolify health check succeeds right away!
const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📋 Health check available at http://0.0.0.0:${PORT}/api/health`);
    console.log(`🔒 RBAC Auth & Live Absentee Sync endpoints ready`);
  });

  // Connect MongoDB in background without blocking server startup or failing health checks
  connectDB()
    .then(async (connected) => {
      if (connected) {
        await seedInitialUsers().catch((err) => console.error('Seed error:', err.message));
      }
    })
    .catch((err) => {
      console.warn('⚠️ Initial MongoDB connection notice:', err.message);
    });

  // Graceful shutdown handling for Docker
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
};

startServer();
