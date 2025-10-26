// src/services/userService.ts
import User, { UserDocument, UserModel } from '../models/user';
import token, { Token } from '../models/token';
import { UserCreate, UserUpdate } from '../interfaces/userInterfaces';
import bcrypt from 'bcrypt';
import TokenService, { TokenServiceInterface } from './tokenService';
import { UserDto } from '../dtos/UserDto';
import { UserErrors } from '../exceptions/userErrors';
import tokenService from './tokenService';

export class UserService {
  // Создание пользователя
  async createUser(userData: UserCreate): Promise<UserDocument & { accessToken: string; refreshToken: string }> {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findByEmail(userData.email);

    if (existingUser) {
      throw UserErrors.UserAlreadyExists();
    }

    const hashPassword = await bcrypt.hash(userData.password, 3);

    const user = new User({
      ...userData,
      password: hashPassword,
      followersCount: 0,
      followingCount: 0,
      isPremium: false,
      achievements: [],
      totalListeningTime: 0,
      favoriteGenres: userData.favoriteGenres || []
    });

    const userDto = new UserDto(user);

    const tokens = TokenService.generateTokenFromDto(userDto);

    await TokenService.saveToken(userDto.id, tokens.refreshToken);
    await user.save();

    // Возвращаем объект с правильной структурой
    const userWithTokens: any = {
      ...user.toObject(), // Преобразуем Mongoose документ в обычный объект
      ...tokens
    };

    // Явно добавляем _id если его нет в результате
    if (!userWithTokens._id && user._id) {
      userWithTokens._id = user._id;
    }

    return userWithTokens as UserDocument & { accessToken: string; refreshToken: string };
  }

  async login(email: string, password: string): Promise<UserDocument & { accessToken: string; refreshToken: string }> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw UserErrors.UserNotFound();
    }
    const isPassEquals = await bcrypt.compare(password, user.password);
    if (!isPassEquals) {
      throw UserErrors.InvalidCredentials();
    }

    const userDto = new UserDto(user);
    const tokens = TokenService.generateTokenFromDto(userDto);
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    // Возвращаем объект с правильной структурой
    const userWithTokens: any = {
      ...user.toObject(), // Преобразуем Mongoose документ в обычный объект
      ...tokens
    };

    // Явно добавляем _id если его нет в результате
    if (!userWithTokens._id && user._id) {
      userWithTokens._id = user._id;
    }

    return userWithTokens as UserDocument & { accessToken: string; refreshToken: string };
  }

  async logout(refreshToken:string) {
    const token = await tokenService.removeToken(refreshToken);
    return token;
  }
  
  // token refresh
  async refresh(refreshToken: string): Promise<UserDocument & { accessToken: string; refreshToken: string }> {
    const tokenPayload = TokenService.validateRefreshToken(refreshToken);

    if (!tokenPayload) {
      throw UserErrors.InvalidRefreshToken();
    }

    // Получаем полную информацию о пользователе из базы данных
    const user = await User.findById(tokenPayload.id);
    if (!user) {
      throw UserErrors.UserNotFound();
    }

    // Создаем UserDto из полной информации о пользователе
    const userDto = new UserDto(user);

    const tokens = TokenService.generateTokenFromDto(userDto);

    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    // Возвращаем объект с правильной структурой
    const userWithTokens: any = {
      ...user.toObject(), // Преобразуем Mongoose документ в обычный объект
      ...tokens
    };

    // Явно добавляем _id если его нет в результате
    if (!userWithTokens._id && user._id) {
      userWithTokens._id = user._id;
    }

    return userWithTokens as UserDocument & { accessToken: string; refreshToken: string };
  }

  // Поиск пользователя по ID
  async getUserById(id: string): Promise<UserDocument | null> {
    return await User.findById(id);
  }

  // Поиск пользователя по email
  async getUserByEmail(email: string): Promise<UserDocument | null> {
    return await User.findOne({ email: email.toLowerCase() });
  }

  // Поиск пользователя по username
  async getUserByUsername(username: string): Promise<UserDocument | null> {
    return await User.findOne({ username });
  }

  // Обновление пользователя
  async updateUser(id: string, updateData: UserUpdate): Promise<UserDocument | null> {
    return await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  // Удаление пользователя
  async deleteUser(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return result !== null;
  }

  // Обновление времени последнего визита
  async updateLastSeen(id: string): Promise<UserDocument | null> {
    return await User.findByIdAndUpdate(
      id,
      { $set: { lastSeen: new Date() } },
      { new: true }
    );
  }

  // Добавление достижения
  async addAchievement(id: string, achievement: string): Promise<UserDocument | null> {
    return await User.findByIdAndUpdate(
      id,
      { $addToSet: { achievements: achievement } },
      { new: true }
    );
  }

  // Добавление времени прослушивания
  async addListeningTime(id: string, minutes: number): Promise<UserDocument | null> {
    return await User.findByIdAndUpdate(
      id,
      { $inc: { totalListeningTime: minutes } },
      { new: true }
    );
  }

  // Обновление избранных жанров
  async updateFavoriteGenres(id: string, genres: string[]): Promise<UserDocument | null> {
    return await User.findByIdAndUpdate(
      id,
      { $set: { favoriteGenres: [...new Set(genres)] } },
      { new: true }
    );
  }

  // Получение пользователей с пагинацией
  async getUsers(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt'
  ): Promise<{ users: UserDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments()
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  // Поиск пользователей по имени
  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<{ users: UserDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({
        username: { $regex: query, $options: 'i' }
      })
        .sort({ followersCount: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({
        username: { $regex: query, $options: 'i' }
      })
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit)
    };
  }
}

export default new UserService();