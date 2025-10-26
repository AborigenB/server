import jwt, { Jwt, Secret } from "jsonwebtoken";
import { Types } from "mongoose";
import TokenModel, { Token } from "../models/token";
import { TokenPayload, TokenPayloadDto } from "../dtos/TokenPayloadDto";
import { UserDto } from "../dtos/UserDto";
import { ApiError } from "../exceptions/apiErrors";
import { config } from "../config/process";

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenServiceInterface {
  generateToken(payload: TokenPayload): GeneratedTokens;
  saveToken(userId: string | Types.ObjectId, refreshToken: string): Promise<Token>;
  removeToken(refreshToken: string): Promise<Token | null>;
  findToken(refreshToken: string): Promise<Token | null>;
}

class TokenService {
  generateToken(payload: TokenPayloadDto): GeneratedTokens {
    if (!process.env.JWT_ACCESS_TOKEN || !process.env.JWT_REFRESH_TOKEN) {
      throw ApiError.BadRequest('JWT secrets are not defined', []);
    }
    const plainPayload = payload.toJSON ? payload.toJSON() : { ...payload };
    console.log(plainPayload)
    const accessToken = jwt.sign(plainPayload, process.env.JWT_ACCESS_TOKEN as Secret, { expiresIn: '1h' });
    const refreshToken = jwt.sign(plainPayload, process.env.JWT_REFRESH_TOKEN as Secret, { expiresIn: '30d' });
    console.log(accessToken, refreshToken)
    return {
      accessToken,
      refreshToken
    };
  }

  generateTokenFromUser(user: any): GeneratedTokens {
    const userDto = UserDto.fromUser(user);
    const payload = TokenPayloadDto.fromUser(user);
    return this.generateToken(payload);
  }

  generateTokenFromDto(userDto: UserDto): GeneratedTokens {
    const payload = new TokenPayloadDto(userDto.id, userDto.email);
    return this.generateToken(payload);
  }

  async saveToken(userId: string | Types.ObjectId, refreshToken: string): Promise<Token> {
    const tokenData = await TokenModel.findOne({ user: userId });

    if (tokenData) {
      tokenData.refreshToken = refreshToken;
      return await tokenData.save();
    }

    const token = await TokenModel.create({
      user: userId,
      refreshToken
    });

    return token;
  }

  async removeToken(refreshToken: string): Promise<Token | null> {
    const tokenData = await TokenModel.findOneAndDelete({ refreshToken });
    return tokenData;
  }

  async findToken(refreshToken: string): Promise<Token | null> {
    const tokenData = await TokenModel.findOne({ refreshToken });
    return tokenData;
  }

  validateAccessToken(token: string): TokenPayload | null {
    if (!config.jwtAccessToken) {
      throw ApiError.BadRequest('JWT access secret is not defined', []);
    }
    return jwt.verify(token, config.jwtAccessToken) as TokenPayload;
  }

  validateRefreshToken(token: string): TokenPayload | null {
    if (!config.jwtRefreshToken) {
      throw ApiError.BadRequest('JWT refresh secret is not defined', []);
    }
    return jwt.verify(token, config.jwtRefreshToken) as TokenPayload;
  }
}

export default new TokenService();