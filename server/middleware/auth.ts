import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        planId: string;
        profileImageUrl?: string;
        usageCount?: number;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    // Fetch user details from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Set user data in request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      planId: user.planId,
      profileImageUrl: user.profileImageUrl,
      usageCount: user.usageCount,
    };
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (user: { id: string; email: string; role: string; planId: string }) => {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(
    { 
      userId: user.id,  // Changed from 'id' to 'userId' to match the decode
      email: user.email, 
      role: user.role, 
      planId: user.planId 
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
};
