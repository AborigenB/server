import { ApiError } from './apiErrors';

export class UserErrors {
    static UserNotFound() {
        return ApiError.NotFound('Пользователь не найден');
    }

    static UserAlreadyExists() {
        return ApiError.Conflict('Пользователь с таким email или username уже существует');
    }

    static InvalidCredentials() {
        return ApiError.Unauthorized('Неверный email или пароль');
    }

    static AccessDenied() {
        return ApiError.Forbidden('Нет доступа к этому ресурсу');
    }

    static SelfAction() {
        return ApiError.BadRequest('Невозможно выполнить действие над самим собой');
    }

    static AlreadyFollowing() {
        return ApiError.Conflict('Вы уже подписаны на этого пользователя');
    }

    static NotFollowing() {
        return ApiError.Conflict('Вы не подписаны на этого пользователя');
    }

    static InvalidToken() {
        return ApiError.Unauthorized('Неверный токен');
    }

    static ExpiredToken() {
        return ApiError.Unauthorized('Срок действия токена истек');
    }

    static InvalidRefreshToken() {
        return ApiError.Unauthorized('Неверный refresh токен');
    }

    static ExpiredRefreshToken() {
        return ApiError.Unauthorized('Срок действия refresh токена истек');
    }
}