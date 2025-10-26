// src/middleware/errorMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../exceptions/apiErrors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/process';

export interface CustomError extends Error {
    statusCode?: number;
    code?: number;
}

export const errorHandler = (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', error);

    // ApiError ошибки
    if (error instanceof ApiError) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
            errors: error.errors,
            ...(config.nodeEnv === 'dev' && { stack: error.stack })
        });
    }

    // MongoDB ошибки
    if (error.name === 'CastError') {
        const apiError = ApiError.BadRequest('Неверный формат ID');
        return res.status(apiError.status).json({
            success: false,
            message: apiError.message,
            errors: apiError.errors
        });
    }

    if (error.code === 11000) {
        const field = Object.keys((error as any).keyPattern)[0];
        const apiError = ApiError.Conflict(`Пользователь с таким ${field} уже существует`);
        return res.status(apiError.status).json({
            success: false,
            message: apiError.message,
            errors: apiError.errors
        });
    }

    if (error.name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map((err: any) => err.message);
        const apiError = ApiError.ValidationFailed(errors);
        return res.status(apiError.status).json({
            success: false,
            message: apiError.message,
            errors: apiError.errors
        });
    }

    // JWT ошибки
    if (error instanceof JsonWebTokenError) {
        const apiError = ApiError.Unauthorized('Невалидный токен');
        return res.status(apiError.status).json({
            success: false,
            message: apiError.message,
            errors: apiError.errors
        });
    }

    if (error instanceof TokenExpiredError) {
        const apiError = ApiError.Unauthorized('Токен истек');
        return res.status(apiError.status).json({
            success: false,
            message: apiError.message,
            errors: apiError.errors
        });
    }

    // Дефолтная ошибка
    const apiError = ApiError.Internal();
    res.status(apiError.status).json({
        success: false,
        message: apiError.message,
        ...(config.nodeEnv === 'dev' && { stack: error.stack })
    });
};

export const asyncHandler = (fn: Function) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
    const apiError = ApiError.NotFound(`Маршрут не найден: ${req.originalUrl}`);
    res.status(apiError.status).json({
        success: false,
        message: apiError.message
    });
};