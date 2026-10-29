// Vercel Serverless Function Entry Point
// This wraps the Express app for Vercel's serverless environment

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from '../server/config/db.js';
import examRoutes from '../server/routes/examRoutes.js';
import authRoutes from '../server/routes/authRoutes.js';
import absenteeRoutes from '../server/routes/absenteeRoutes.js';

dotenv.config();

const app = express();

// CORS — allow your Vercel domain and custom domain
const allowedOrigins = [
  'https://exam.rahuljauhari.in',
  'https://exam-seating-plan-dynamic.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or from allowed origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // permissive for now — tighten after testing
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// DB connection cache — reuse across warm invocations
let isConnected = false;
const ensureDB = async () => {
  if (!isConnected) {
    isConnected = await connectDB();
  }
};

// Middleware to connect DB before each request
app.use(async (req, res, next) => {
  await ensureDB();
  next();
});

// API Routes (same as server/index.js)
app.use('/api', examRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/absentees', absenteeRoutes);

// Root health check
app.get('/', (req, res) => {
  res.json({
    message: 'Exam Seating Plan API — Vercel Serverless',
    status: 'Running',
    database: isConnected ? 'MongoDB Connected' : 'MongoDB Connecting...',
    version: '2.0.0',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
