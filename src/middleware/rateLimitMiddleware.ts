import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip;
  const limit = 100; // максимальное количество запросов
  const windowMs = 15 * 60 * 1000; // 15 минут

  if (!ip) {
    return next();
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  // Очистка старых записей
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < windowStart) {
      requestCounts.delete(key);
    }
  }

  const current = requestCounts.get(ip);

  if (!current) {
    requestCounts.set(ip, { count: 1, resetTime: now });
    return next();
  }

  if (current.count >= limit) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((current.resetTime + windowMs - now) / 1000)
    });
  }

  current.count++;
  next();
};

// Более строгий лимит для аутентификации
export const authRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip;
  const limit = 5; // всего 5 попыток входа
  const windowMs = 15 * 60 * 1000; // 15 минут

  if (!ip) {
    return next();
  }

  const current = requestCounts.get(`auth-${ip}`) || { count: 0, resetTime: Date.now() };

  if (current.count >= limit) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.'
    });
  }

  requestCounts.set(`auth-${ip}`, {
    count: current.count + 1,
    resetTime: current.resetTime
  });

  next();
};