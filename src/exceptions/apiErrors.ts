export class ApiError extends Error {
    status: number;
    errors: string[];

    constructor(status: number, message: string, errors: string[] = []) {
        super(message);
        this.status = status;
        this.errors = errors;
    }

    static BadRequest(message: string, errors: string[] = []) {
        return new ApiError(400, message, errors);
    }

    static Unauthorized(message: string = 'Пользователь не авторизован') {
        return new ApiError(401, message);
    }

    static Forbidden(message: string = 'Доступ запрещен') {
        return new ApiError(403, message);
    }

    static NotFound(message: string = 'Ресурс не найден') {
        return new ApiError(404, message);
    }

    static Conflict(message: string = 'Конфликт данных') {
        return new ApiError(409, message);
    }

    static Internal(message: string = 'Внутренняя ошибка сервера') {
        return new ApiError(500, message);
    }

    static ValidationFailed(errors: string[]) {
        return new ApiError(422, 'Ошибка валидации', errors);
    }
}