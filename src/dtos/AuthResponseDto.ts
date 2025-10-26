import { UserDto } from './UserDto';

export class AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;

  constructor(user: UserDto, accessToken: string, refreshToken: string) {
    this.user = user;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  toJSON() {
    return {
      user: this.user.toJSON(),
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    };
  }
}