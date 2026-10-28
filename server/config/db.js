import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_seating_db';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
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
