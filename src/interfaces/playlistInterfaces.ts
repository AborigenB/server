import { Document, Types } from 'mongoose';

export interface IPlaylist extends Document {
    _id: Types.ObjectId; // Добавляем тип для _id
    navidromeId: string; // ID плейлиста в Navidrome
    name: string;
    description?: string;
    owner: Types.ObjectId;
    isPublic: boolean;
    coverArt?: string;
    trackCount: number;
    duration: number; // Total duration in seconds
    plays: number;
    likes: Types.ObjectId[]; // Users who liked
    tags: string[];
    // Треки хранятся только в Navidrome, у нас только IDs для быстрого доступа
    trackIds: string[]; // Navidrome track IDs (для быстрого поиска)
    syncedAt: Date; // Когда последний раз синхронизировали с Navidrome
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdatePlaylistData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}
