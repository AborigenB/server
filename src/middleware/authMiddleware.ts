// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import tokenService from '../services/tokenService';
import userService from '../services/userService';
import { AuthErrors } from '../exceptions/authErrors';
import { UserErrors } from '../exceptions/userErrors';

export interface AuthRequest extends Request {
    user?: any;
}

// src/middleware/authMiddleware.ts
export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw AuthErrors.TokenRequired();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        throw AuthErrors.TokenRequired();
    }

    const userData = tokenService.validateAccessToken(token);

    if (!userData) {
        throw AuthErrors.InvalidToken();
    }

    const user = await userService.getUserById(userData.id);

    if (!user) {
        throw UserErrors.UserNotFound();
    }

    req.user = user;
    next();
};

export const authorizeUser = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const requestedUserId = req.params.id;
    const currentUserId = req.user?._id?.toString();

    if (!currentUserId) {
        throw AuthErrors.TokenRequired();
    }

    if (requestedUserId && requestedUserId !== currentUserId) {
        throw UserErrors.AccessDenied();
    }

    next();
};