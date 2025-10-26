import { ApiError } from './apiErrors';

export class AuthErrors {
    static TokenRequired() {
        return ApiError.Unauthorized('Токен доступа обязателен');
    }

    static InvalidToken() {
        return ApiError.Unauthorized('Невалидный или просроченный токен');
    }

    static TokenExpired() {
        return ApiError.Unauthorized('Токен истек');
    }

    static RefreshTokenRequired() {
        return ApiError.BadRequest('Refresh token обязателен');
    }

    static InvalidRefreshToken() {
        return ApiError.Unauthorized('Невалидный refresh token');
    }
}