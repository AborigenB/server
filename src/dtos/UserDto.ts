import { Types } from 'mongoose';

export class UserDto {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  isPremium?: boolean;
  favoriteGenres?: string[];

  constructor(model: any) {
    this.id = model._id ? model._id.toString() : model.id;
    this.email = model.email;
    this.username = model.username;
    this.avatar = model.avatar;
    this.isPremium = model.isPremium || false;
    this.favoriteGenres = model.favoriteGenres || [];
  }

  // Статический метод для создания из модели
  static fromUser(user: any): UserDto {
    return new UserDto(user);
  }

  // Для создания упрощенной версии (только основные поля)
  static toPlain(user: any): Partial<UserDto> {
    return {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar
    };
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      avatar: this.avatar,
      isPremium: this.isPremium,
      favoriteGenres: this.favoriteGenres
    };
  }
}