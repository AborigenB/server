import { Request, Response } from 'express';
import navidromeService from '../services/navidromeService';
import userService from '../services/userService';
import { AuthRequest } from '../middleware/authMiddleware';
import { ApiError } from '../exceptions/apiErrors';

export class MusicController {
    // Получить список треков
    async getTracks(req: AuthRequest, res: Response) {
        const { limit = 50, offset = 0 } = req.query;

        const tracks = await navidromeService.getTracks(
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
            data: tracks
        });
    }

    // Поиск музыки
    async search(req: AuthRequest, res: Response) {
        const { q, limit = 20 } = req.query;

        if (!q || typeof q !== 'string') {
            throw ApiError.BadRequest('Search query is required');
        }

        const results = await navidromeService.search(q, parseInt(limit as string));

        res.json({
            success: true,
            data: results
        });
    }

    // Получить информацию о треке
    async getTrack(req: AuthRequest, res: Response) {
        const { trackId } = req.params;

        const track = await navidromeService.getTrackById(trackId);

        if (!track) {
            throw ApiError.NotFound('Track not found');
        }

        res.json({
            success: true,
            data: track
        });
    }

    // Добавить трек в избранное
    async addToFavorites(req: AuthRequest, res: Response) {
        const { trackId } = req.body;
        const userId = req.user._id;

        if (!trackId) {
            throw ApiError.BadRequest('Track ID is required');
        }

        // Проверяем что трек существует
        const track = await navidromeService.getTrackById(trackId);
        if (!track) {
            throw ApiError.NotFound('Track not found');
        }

        // Добавляем в избранное
        await userService.addToFavorites(userId, trackId);

        res.json({
            success: true,
            message: 'Track added to favorites'
        });
    }

    // Отметить прослушивание
    async trackListening(req: AuthRequest, res: Response) {
        const { trackId, duration } = req.body;
        const userId = req.user._id;

        if (!trackId || !duration) {
            throw ApiError.BadRequest('Track ID and duration are required');
        }

        // Отмечаем прослушивание в Navidrome
        await navidromeService.scrobble(trackId);

        // Обновляем статистику пользователя
        await userService.addListeningHistory(userId, trackId, duration);

        res.json({
            success: true,
            message: 'Listening tracked'
        });
    }

    // Создать плейлист
    async createPlaylist(req: AuthRequest, res: Response) {
        const { name, trackIds } = req.body;
        const userId = req.user._id;

        if (!name || !trackIds || !Array.isArray(trackIds)) {
            throw ApiError.BadRequest('Playlist name and track IDs are required');
        }

        const playlistId = await navidromeService.createPlaylist(name, trackIds);

        // Сохраняем информацию о плейлисте в профиле пользователя
        await userService.addPlaylist(userId, playlistId, name, trackIds.length);

        res.json({
            success: true,
            message: 'Playlist created successfully',
            data: { playlistId }
        });
    }

    // Получить рекомендации
    async getRecommendations(req: AuthRequest, res: Response) {
        const userId = req.user._id;
        const user = await userService.getUserById(userId);

        if (!user) {
            throw ApiError.NotFound('User not found');
        }

        const recommendations = await this.generateRecommendations(user);

        res.json({
            success: true,
            data: recommendations
        });
    }

    private async generateRecommendations(user: any) {
        // Нужно придумать систему рекомендации
        return await navidromeService.getTracks(20);
    }
}

export default new MusicController();