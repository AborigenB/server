// src/middleware/loggingMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const requestLogger = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user ? req.user._id : 'anonymous';
    
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: user,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

// Middleware для логирования изменений пользователя
export const userActivityLogger = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.json;
  
  res.json = function(body) {
    if (req.user && body.success) {
      console.log(`User activity: ${req.user._id} - ${req.method} ${req.url}`);
    }
    return originalSend.call(this, body);
  };

  next();
};