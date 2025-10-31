import { body } from 'express-validator';
import { Router } from 'express';
import playlistController from '../controllers/playlistController';
import { authenticateToken, updateLastSeen } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';

const playlistRouter = Router();

playlistRouter.use(authenticateToken);
playlistRouter.use(updateLastSeen);

// Создание и управление плейлистами
playlistRouter.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('Playlist name is required')
      .isLength({ max: 100 })
      .withMessage('Playlist name cannot exceed 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
  ],
  validateRequest,
  asyncHandler(playlistController.createPlaylist)
);

playlistRouter.get('/', asyncHandler(playlistController.getUserPlaylists));
playlistRouter.get('/public', asyncHandler(playlistController.getPublicPlaylists));
playlistRouter.get('/search', asyncHandler(playlistController.searchPlaylists));
playlistRouter.post('/sync', asyncHandler(playlistController.syncPlaylists)); // Новая ручка для синхронизации

// Операции с конкретным плейлистом
playlistRouter.get('/:playlistId', asyncHandler(playlistController.getPlaylist));
playlistRouter.put('/:playlistId', asyncHandler(playlistController.updatePlaylist));
playlistRouter.delete('/:playlistId', asyncHandler(playlistController.deletePlaylist));

// Управление треками в плейлисте
playlistRouter.get('/:playlistId/tracks', asyncHandler(playlistController.getPlaylistTracks)); // Получение треков
playlistRouter.post(
  '/:playlistId/tracks',
  [
    body('trackId')
      .notEmpty()
      .withMessage('Track ID is required')
  ],
  validateRequest,
  asyncHandler(playlistController.addTrack)
);

playlistRouter.delete('/:playlistId/tracks/:trackId', asyncHandler(playlistController.removeTrack));
playlistRouter.put('/:playlistId/reorder', asyncHandler(playlistController.reorderTracks));

// Лайки
playlistRouter.post('/:playlistId/like', asyncHandler(playlistController.toggleLike));

export default playlistRouter;