import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export let lastConnectionError = null;
export const getLastConnectionError = () => lastConnectionError;

const LOCAL_FALLBACK_URI = 'mongodb://127.0.0.1:27017/exam_seating_db';

export const getMongoUri = () => {
  // Parse multiline string if saved under process.env.Env or ENV (as seen in Coolify modal)
  const rawEnv = process.env.Env || process.env.ENV || process.env.env || '';
  if (rawEnv.includes('MONGODB_URI=')) {
    const match = rawEnv.split('\n').find(l => l.trim().startsWith('MONGODB_URI='));
    if (match) {
      const val = match.trim().slice('MONGODB_URI='.length).trim();
      if (val) process.env.MONGODB_URI = val;
    }
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || LOCAL_FALLBACK_URI;
  return uri.trim();
};

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  // Reuse existing connection in warm serverless instances to avoid reconnect delay
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return true;
  }

  if (cached.conn) {
    return true;
  }

  const uri = getMongoUri();
  if (!uri) {
    lastConnectionError = 'MONGODB_URI environment variable is not defined.';
    return false;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    }).then((conn) => {
      console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
      cached.conn = conn;
      lastConnectionError = null;
      return true;
    }).catch((error) => {
      cached.promise = null;
      lastConnectionError = error.message;
      console.warn(`⚠️ MongoDB Connection Notice: Could not connect to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
      console.warn(`   Reason: ${error.message}`);
      console.warn(`   Tip: To use local MongoDB, make sure MongoDB Service is running, or add your MongoDB Atlas URI in .env file.`);
      return false;
    });
  }

  return await cached.promise;
};
