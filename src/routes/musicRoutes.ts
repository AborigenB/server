import { Router } from 'express';
import { body } from 'express-validator';
import musicController from '../controllers/musicController';
import { authenticateToken, updateLastSeen } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(updateLastSeen);

// Получение треков
router.get('/tracks', asyncHandler(musicController.getTracks));

// Получение информации о треке
router.get('/tracks/:trackId', asyncHandler(musicController.getTrack));

// Поиск
router.get('/search', asyncHandler(musicController.search));

// Избранное
router.post(
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
router.post(
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
router.post(
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
router.get('/recommendations', asyncHandler(musicController.getRecommendations));

export default router;