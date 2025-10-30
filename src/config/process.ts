import { resolve } from "path";
import dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, "../../.env") });

export const config = {
  port: process.env.PORT,
  mongodbUri: process.env.MONGO_DB_URL,
  jwtAccessToken: process.env.JWT_ACCESS_TOKEN,
  jwtRefreshToken: process.env.JWT_REFRESH_TOKEN,
  dbName: process.env.DB_NAME || 'testdb',
  nodeEnv: process.env.NODE_ENV,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  navidromeUrl: process.env.NAVIDROME_URL || 'http://localhost:4533',
  navidromeUser: process.env.NAVIDROME_USER,
  navidromePassword: process.env.NAVIDROME_PASSWORD,
  musicCacheTTL: process.env.MUSIC_CACHE_TTL,
  maxPlaylistSize: process.env.MAX_PLAYLIST_SIZE,

};

export default process.env;