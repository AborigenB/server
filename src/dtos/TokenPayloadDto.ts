export interface TokenPayload {
  id: string;
  email: string;
}
export class TokenPayloadDto implements TokenPayload {
  id: string;
  email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }

  // Альтернативный конструктор из модели пользователя
  static fromUser(user: any): TokenPayloadDto {
    return new TokenPayloadDto(
      user._id ? user._id.toString() : user.id,
      user.email
    );
  }

  // Для создания из существующего объекта
  static fromObject(obj: { id: string; email: string }): TokenPayloadDto {
    return new TokenPayloadDto(obj.id, obj.email);
  }

  toJSON(): TokenPayload {
    return {
      id: this.id,
      email: this.email
    };
  }
}