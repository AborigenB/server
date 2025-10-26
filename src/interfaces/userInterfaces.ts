export interface User {
  _id?: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  lastSeen?: Date;
  isPremium: boolean;
  achievements: string[];
  favoriteGenres: string[];
  totalListeningTime: number;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  favoriteGenres?: string[];
}

export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  avatar?: string;
  lastSeen?: Date;
  isPremium?: boolean;
  achievements?: string[];
  favoriteGenres?: string[];
  totalListeningTime?: number;
}