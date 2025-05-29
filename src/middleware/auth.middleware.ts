// /src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies[process.env.COOKIE_NAME!];

  if (!refreshToken) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, (error:any, decoded:any) => {
    if (error) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = decoded as { userId: string }; // Attach user info to request object
    next();
  });
};

export { authMiddleware };
