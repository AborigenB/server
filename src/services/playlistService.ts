import Playlist from '../models/playlist';
import { IPlaylist, CreatePlaylistData, UpdatePlaylistData  } from '../interfaces/playlistInterfaces';
import User from '../models/user';
import { ApiError } from '../exceptions/apiErrors';
import { UserErrors } from '../exceptions/userErrors';
import navidromeService from './navidromeService';
import { Types } from 'mongoose';

export class PlaylistService {
    // Создание плейлиста (в Navidrome и нашей БД)
  async createPlaylist(userId: string, data: CreatePlaylistData): Promise<IPlaylist> {
    try {
      // 1. Создаем плейлист в Navidrome
      const navidromePlaylistId = await navidromeService.createPlaylist(data.name, []);

      // 2. Создаем запись в нашей БД
      const playlist = new Playlist({
        navidromeId: navidromePlaylistId,
        ...data,
        owner: userId,
        trackIds: [],
        trackCount: 0,
        duration: 0
      });

      const savedPlaylist = await playlist.save();

      // 3. Обновляем профиль пользователя
      await User.findByIdAndUpdate(userId, {
        $push: {
          playlists: {
            playlistId: savedPlaylist._id,
            role: 'owner'
          }
        },
        $inc: { playlistCount: 1 }
      });

      return savedPlaylist;

    } catch (error) {
      console.error('Error creating playlist:', error);
      throw ApiError.Internal('Failed to create playlist');
    }
  }

  async getUserPlaylists(userId: string): Promise<IPlaylist[]> {
    return await Playlist.find({ owner: userId })
      .sort({ createdAt: -1 })
      .populate('owner', 'username avatar');
  }

  // Получение плейлиста по ID с синхронизацией данных из Navidrome
  async getPlaylistById(playlistId: string): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId)
      .populate('owner', 'username avatar');

    if (!playlist) {
      return null;
    }

    // Синхронизируем данные с Navidrome если нужно
    await this.syncPlaylistWithNavidrome(playlist);

    return playlist;
  }

  // Получение плейлиста по Navidrome ID
  async getPlaylistByNavidromeId(navidromeId: string): Promise<IPlaylist | null> {
    return await Playlist.findOne({ navidromeId })
      .populate('owner', 'username avatar');
  }

  // Обновление плейлиста (только метаданные, треки управляются через Navidrome)
  async updatePlaylist(
    playlistId: string, 
    userId: string, 
    data: UpdatePlaylistData
  ): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    // Проверяем права доступа
    if (playlist.owner.toString() !== userId.toString()) {
      throw UserErrors.AccessDenied();
    }

    // Обновляем только в нашей БД (метаданные)
    return await Playlist.findByIdAndUpdate(
      playlistId,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  // Удаление плейлиста (из Navidrome и нашей БД)
  async deletePlaylist(playlistId: string, userId: string): Promise<boolean> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    // Только владелец может удалить
    if (playlist.owner.toString() !== userId.toString()) {
      throw UserErrors.AccessDenied();
    }

    try {
      // 1. Удаляем из Navidrome
      // Note: Navidrome API не имеет прямого метода удаления плейлиста
      // Вместо этого мы можем очистить плейлист и пометить как удаленный
      await this.clearPlaylistInNavidrome(playlist.navidromeId);
      
      // 2. Удаляем из нашей БД
      await Playlist.findByIdAndDelete(playlistId);

      // 3. Удаляем из профиля пользователя
      await User.findByIdAndUpdate(userId, {
        $pull: { playlists: { playlistId: playlistId } },
        $inc: { playlistCount: -1 }
      });

      return true;

    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw ApiError.Internal('Failed to delete playlist');
    }
  }

  // Добавление трека в плейлист (в Navidrome)
  async addTrackToPlaylist(
    playlistId: string, 
    userId: string, 
    trackId: string
  ): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    // Проверяем права доступа
    if (playlist.owner.toString() !== userId.toString()) {
      throw UserErrors.AccessDenied();
    }

    try {
      // 1. Добавляем трек в Navidrome плейлист
      // Для этого нужно получить текущие треки и добавить новый
      const currentTracks = await this.getPlaylistTracksFromNavidrome(playlist.navidromeId);
      const updatedTrackIds = [...currentTracks.map(t => t.id), trackId];
      
      // Обновляем плейлист в Navidrome
      await this.updatePlaylistInNavidrome(playlist.navidromeId, updatedTrackIds);

      // 2. Обновляем кэш в нашей БД
      playlist.trackIds = updatedTrackIds;
      playlist.trackCount = updatedTrackIds.length;
      
      // Обновляем длительность
      const tracks = await Promise.all(
        updatedTrackIds.map(id => navidromeService.getTrackById(id))
      );
      playlist.duration = tracks.reduce((total, track) => total + (track?.duration || 0), 0);
      
      playlist.syncedAt = new Date();

      return await playlist.save();

    } catch (error) {
      console.error('Error adding track to playlist:', error);
      throw ApiError.Internal('Failed to add track to playlist');
    }
  }

  // Удаление трека из плейлиста (из Navidrome)
  async removeTrackFromPlaylist(
    playlistId: string, 
    userId: string, 
    trackId: string
  ): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    if (playlist.owner.toString() !== userId.toString()) {
      throw UserErrors.AccessDenied();
    }

    try {
      // 1. Удаляем трек из Navidrome плейлиста
      const currentTracks = await this.getPlaylistTracksFromNavidrome(playlist.navidromeId);
      const updatedTrackIds = currentTracks.map(t => t.id).filter(id => id !== trackId);
      
      await this.updatePlaylistInNavidrome(playlist.navidromeId, updatedTrackIds);

      // 2. Обновляем кэш в нашей БД
      playlist.trackIds = updatedTrackIds;
      playlist.trackCount = updatedTrackIds.length;
      
      // Обновляем длительность
      const tracks = await Promise.all(
        updatedTrackIds.map(id => navidromeService.getTrackById(id))
      );
      playlist.duration = tracks.reduce((total, track) => total + (track?.duration || 0), 0);
      
      playlist.syncedAt = new Date();

      return await playlist.save();

    } catch (error) {
      console.error('Error removing track from playlist:', error);
      throw ApiError.Internal('Failed to remove track from playlist');
    }
  }

  // Получение треков плейлиста из Navidrome
  async getPlaylistTracks(playlistId: string): Promise<any[]> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    return await this.getPlaylistTracksFromNavidrome(playlist.navidromeId);
  }

  // Перемещение треков в плейлисте (в Navidrome)
  async reorderTracks(
    playlistId: string,
    userId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    if (playlist.owner.toString() !== userId.toString()) {
      throw UserErrors.AccessDenied();
    }

    try {
      // Получаем текущие треки
      const currentTracks = await this.getPlaylistTracksFromNavidrome(playlist.navidromeId);
      const trackIds = currentTracks.map(t => t.id);

      if (fromIndex < 0 || fromIndex >= trackIds.length ||
          toIndex < 0 || toIndex >= trackIds.length) {
        throw ApiError.BadRequest('Invalid track indices');
      }

      // Перемещаем трек
      const [movedTrack] = trackIds.splice(fromIndex, 1);
      trackIds.splice(toIndex, 0, movedTrack);

      // Обновляем в Navidrome
      await this.updatePlaylistInNavidrome(playlist.navidromeId, trackIds);

      // Обновляем кэш
      playlist.trackIds = trackIds;
      playlist.syncedAt = new Date();

      return await playlist.save();

    } catch (error) {
      console.error('Error reordering tracks:', error);
      throw ApiError.Internal('Failed to reorder tracks');
    }
  }

  // Синхронизация плейлиста с Navidrome
  private async syncPlaylistWithNavidrome(playlist: IPlaylist): Promise<void> {
    // Синхронизируем раз в 5 минут
    const syncThreshold = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - playlist.syncedAt.getTime() < syncThreshold) {
      return;
    }

    try {
      const tracks = await this.getPlaylistTracksFromNavidrome(playlist.navidromeId);
      const trackIds = tracks.map(t => t.id);
      
      // Обновляем длительность
      const trackDurations = await Promise.all(
        trackIds.map(id => navidromeService.getTrackById(id))
      );
      const duration = trackDurations.reduce((total, track) => total + (track?.duration || 0), 0);

      await Playlist.findByIdAndUpdate(playlist._id, {
        trackIds,
        trackCount: trackIds.length,
        duration,
        syncedAt: new Date()
      });

    } catch (error) {
      console.error('Error syncing playlist with Navidrome:', error);
    }
  }

  // Вспомогательные методы для работы с Navidrome API

  private async getPlaylistTracksFromNavidrome(playlistId: string): Promise<any[]> {
    // Navidrome API не имеет прямого метода получения треков плейлиста
    // Используем обходной путь через получение информации о плейлисте
    try {
      // Этот метод может потребовать кастомной реализации
      // в зависимости от возможностей Navidrome API
      const response = await navidromeService.getPlaylistInfo(playlistId);
      return response.tracks || [];
    } catch (error) {
      console.error('Error getting playlist tracks from Navidrome:', error);
      return [];
    }
  }

  private async updatePlaylistInNavidrome(playlistId: string, trackIds: string[]): Promise<void> {
    // Navidrome API ограничен в управлении плейлистами
    // Может потребоваться удалить и пересоздать плейлист
    try {
      // Временное решение - используем существующий метод
      await navidromeService.updatePlaylist(playlistId, trackIds);
    } catch (error) {
      console.error('Error updating playlist in Navidrome:', error);
      throw error;
    }
  }

  private async clearPlaylistInNavidrome(playlistId: string): Promise<void> {
    try {
      // Очищаем плейлист, устанавливая пустой список треков
      await this.updatePlaylistInNavidrome(playlistId, []);
    } catch (error) {
      console.error('Error clearing playlist in Navidrome:', error);
    }
  }

  // Остальные методы (лайки, поиск и т.д.) остаются без изменений
  async toggleLike(playlistId: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw UserErrors.NotFound();
    }

    const userObjectId = new Types.ObjectId(userId);
    const hasLiked = playlist.likes.some(likeId => likeId.equals(userObjectId));

    if (hasLiked) {
      playlist.likes = playlist.likes.filter(likeId => !likeId.equals(userObjectId));
      await User.findByIdAndUpdate(userId, {
        $pull: { likedPlaylists: playlistId }
      });
    } else {
      playlist.likes.push(userObjectId);
      await User.findByIdAndUpdate(userId, {
        $push: { likedPlaylists: playlistId }
      });
    }

    await playlist.save();

    return {
      liked: !hasLiked,
      likes: playlist.likes.length
    };
  }

  async getPublicPlaylists(limit: number = 50, page: number = 1): Promise<{
    playlists: IPlaylist[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [playlists, total] = await Promise.all([
      Playlist.find({ isPublic: true })
        .populate('owner', 'username avatar')
        .sort({ likes: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Playlist.countDocuments({ isPublic: true })
    ]);

    return {
      playlists,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async searchPlaylists(query: string, limit: number = 20): Promise<IPlaylist[]> {
    return await Playlist.find({
      isPublic: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    })
      .populate('owner', 'username avatar')
      .limit(limit);
  }
}

export default new PlaylistService();