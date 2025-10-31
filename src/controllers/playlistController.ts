// src/controllers/playlistController.ts
import { Request, Response } from 'express';
import playlistService from '../services/playlistService';
import { AuthRequest } from '../middleware/authMiddleware';
import { ApiError } from '../exceptions/apiErrors';

export class PlaylistController {
    // Создание плейлиста
    async createPlaylist(req: AuthRequest, res: Response) {
        const { name, description, isPublic, tags } = req.body;
        const userId = req.user._id;

        const playlist = await playlistService.createPlaylist(userId, {
            name,
            description,
            isPublic: isPublic || false,
            tags: tags || []
        });

        res.status(201).json({
            success: true,
            message: 'Playlist created successfully',
            data: playlist
        });
    }

    // Получение плейлистов пользователя
    async getUserPlaylists(req: AuthRequest, res: Response) {
        const userId = req.user._id;

        const playlists = await playlistService.getUserPlaylists(userId);

        res.json({
            success: true,
            data: playlists
        });
    }

    // Получение плейлиста по ID с треками
    async getPlaylist(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const userId = req.user._id;

        const playlist = await playlistService.getPlaylistById(playlistId);

        if (!playlist) {
            throw ApiError.NotFound('Playlist not found');
        }

        // Проверяем доступ (только владелец или публичный плейлист)
        const isOwner = (playlist.owner as any)._id.toString() === userId;

        if (!playlist.isPublic && !isOwner) {
            throw ApiError.Forbidden('Access denied to this playlist');
        }

        // Получаем треки плейлиста из Navidrome
        const tracks = await playlistService.getPlaylistTracks(playlistId);

        res.json({
            success: true,
            data: {
                ...(typeof playlist.toObject === 'function' ? playlist.toObject() : playlist),
                tracks: tracks
            }
        });
    }

    // Обновление плейлиста (только метаданные)
    async updatePlaylist(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const userId = req.user._id;
        const { name, description, isPublic, tags } = req.body;

        const playlist = await playlistService.updatePlaylist(playlistId, userId, {
            name,
            description,
            isPublic,
            tags
        });

        res.json({
            success: true,
            message: 'Playlist updated successfully',
            data: playlist
        });
    }

    // Удаление плейлиста
    async deletePlaylist(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const userId = req.user._id;

        await playlistService.deletePlaylist(playlistId, userId);

        res.json({
            success: true,
            message: 'Playlist deleted successfully'
        });
    }

    // Добавление трека в плейлист
    async addTrack(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const { trackId } = req.body;
        const userId = req.user._id;

        if (!trackId) {
            throw ApiError.BadRequest('Track ID is required');
        }

        const playlist = await playlistService.addTrackToPlaylist(playlistId, userId, trackId);

        res.json({
            success: true,
            message: 'Track added to playlist',
            data: playlist
        });
    }

    // Удаление трека из плейлиста
    async removeTrack(req: AuthRequest, res: Response) {
        const { playlistId, trackId } = req.params;
        const userId = req.user._id;

        const playlist = await playlistService.removeTrackFromPlaylist(
            playlistId,
            userId,
            trackId
        );

        res.json({
            success: true,
            message: 'Track removed from playlist',
            data: playlist
        });
    }

    // Перемещение треков в плейлисте
    async reorderTracks(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const { fromIndex, toIndex } = req.body;
        const userId = req.user._id;

        if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') {
            throw ApiError.BadRequest('Invalid indices');
        }

        const playlist = await playlistService.reorderTracks(
            playlistId,
            userId,
            fromIndex,
            toIndex
        );

        res.json({
            success: true,
            message: 'Tracks reordered successfully',
            data: playlist
        });
    }

    // Получение треков плейлиста
    async getPlaylistTracks(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const userId = req.user._id;

        // Сначала проверяем доступ к плейлисту
        const playlist = await playlistService.getPlaylistById(playlistId);

        if (!playlist) {
            throw ApiError.NotFound('Playlist not found');
        }

        const isOwner = (playlist.owner as any)._id.toString() === userId;

        if (!playlist.isPublic && !isOwner) {
            throw ApiError.Forbidden('Access denied to this playlist');
        }

        // Получаем треки из Navidrome
        const tracks = await playlistService.getPlaylistTracks(playlistId);

        res.json({
            success: true,
            data: tracks
        });
    }

    // Лайк/анлайк плейлиста
    async toggleLike(req: AuthRequest, res: Response) {
        const { playlistId } = req.params;
        const userId = req.user._id;

        const result = await playlistService.toggleLike(playlistId, userId);

        res.json({
            success: true,
            message: result.liked ? 'Playlist liked' : 'Playlist unliked',
            data: result
        });
    }

    // Получение публичных плейлистов
    async getPublicPlaylists(req: AuthRequest, res: Response) {
        const { limit = 50, page = 1 } = req.query;

        const result = await playlistService.getPublicPlaylists(
            parseInt(limit as string),
            parseInt(page as string)
        );

        res.json({
            success: true,
            data: result
        });
    }

    // Поиск плейлистов
    async searchPlaylists(req: AuthRequest, res: Response) {
        const { q, limit = 20 } = req.query;

        if (!q || typeof q !== 'string') {
            throw ApiError.BadRequest('Search query is required');
        }

        const playlists = await playlistService.searchPlaylists(q, parseInt(limit as string));

        res.json({
            success: true,
            data: playlists
        });
    }

    // Синхронизация всех плейлистов пользователя с Navidrome
    async syncPlaylists(req: AuthRequest, res: Response) {
        const userId = req.user._id;

        // Получаем все плейлисты пользователя
        const playlists = await playlistService.getUserPlaylists(userId);

        // Синхронизируем каждый плейлист
        const syncResults = await Promise.allSettled(
            playlists.map(playlist =>
                playlistService.getPlaylistById(playlist._id.toString())
            )
        );

        const syncedCount = syncResults.filter(result =>
            result.status === 'fulfilled'
        ).length;

        res.json({
            success: true,
            message: `Synced ${syncedCount} out of ${playlists.length} playlists`,
            data: {
                total: playlists.length,
                synced: syncedCount,
                failed: playlists.length - syncedCount
            }
        });
    }
}

export default new PlaylistController();