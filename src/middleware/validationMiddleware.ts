import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Middleware для проверки ошибок валидации
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : error.type,
        message: error.msg
      }))
    });
  }
  
  next();
};

// Middleware для проверки ObjectId
export const validateObjectId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }
  
  next();
};