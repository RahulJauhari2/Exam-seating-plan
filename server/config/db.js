import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_seating_db';

export const connectDB = async () => {
  // Reuse existing connection in warm serverless instances to avoid reconnect delay
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return true;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Notice: Could not connect to MongoDB at ${MONGODB_URI}`);
    console.warn(`   Reason: ${error.message}`);
    console.warn(`   Tip: To use local MongoDB, make sure MongoDB Service is running, or add your MongoDB Atlas URI in .env file.`);
    return false;
  }
};
