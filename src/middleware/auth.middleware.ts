// /src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError.js';
import UserModel from '../models/user.model.js';

export interface AuthenticatedRequest extends Request {
  loginUser?: any; // Optionally replace 'any' with your user type
}

const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.[process.env.COOKIE_NAME!] || // get token from cookie
      req.headers?.authorization?.split(' ')[1];
    console.log(process.env.COOKIE_NAME, token);
    if (!token) {
      throw new ApiError(401, 'Authentication token not found in cookies');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    console.log(decoded);

    const user = await UserModel.findById(decoded.userId).select('-password');
    console.log(user);
    if (!user) {
      throw new ApiError(401, 'User not found from token');
    }

    req.loginUser = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export { authMiddleware };
