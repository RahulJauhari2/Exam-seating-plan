import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'exam_seating_secret_key_2026_abvic';

// Authenticate JWT Token
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'अनधिकृत पहुंच! कृपया पहले लॉगिन करें (Authorization Token Missing).',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'सत्र समाप्त हो गया है या अमान्य टोकन है। कृपया पुनः लॉगिन करें।',
    });
  }
};

// Check if user has required roles (e.g. ['superadmin', 'principal'])
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'उपयोगकर्ता प्रमाणीकृत नहीं है।' });
    }

    // superadmin has universal access
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `पहुंच अस्वीकृत! इस कार्य के लिए [${roles.join(', ')}] की अनुमति आवश्यक है। आपकी भूमिका: ${req.user.role}`,
    });
  };
};
