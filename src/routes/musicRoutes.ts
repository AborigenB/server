import { Router } from 'express';
import { body } from 'express-validator';
import musicController from '../controllers/musicController';
import { authenticateToken, updateLastSeen } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';

const musicRouter = Router();

musicRouter.use(authenticateToken);
musicRouter.use(updateLastSeen);

// Получение треков
musicRouter.get('/tracks', asyncHandler(musicController.getTracks));

// Получение информации о треке
musicRouter.get('/tracks/:trackId', asyncHandler(musicController.getTrack));

// Поиск
musicRouter.get('/search', asyncHandler(musicController.search));

// Избранное
musicRouter.post(
  '/favorites',
  [
    body('trackId')
      .notEmpty()
      .withMessage('Track ID is required')
  ],
  validateRequest,
  asyncHandler(musicController.addToFavorites)
);

// Отслеживание прослушивания
musicRouter.post(
  '/listen',
  [
    body('trackId')
      .notEmpty()
      .withMessage('Track ID is required'),
    body('duration')
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive number')
  ],
  validateRequest,
  asyncHandler(musicController.trackListening)
);

// Плейлисты
musicRouter.post(
  '/playlists',
  [
    body('name')
      .notEmpty()
      .withMessage('Playlist name is required'),
    body('trackIds')
      .isArray()
      .withMessage('Track IDs must be an array')
  ],
  validateRequest,
  asyncHandler(musicController.createPlaylist)
);

// Рекомендации
musicRouter.get('/recommendations', asyncHandler(musicController.getRecommendations));

export default musicRouter;