import { Router } from "express";
import userController from "../controllers/userController";
import { asyncHandler } from "../middleware/errorMiddleware";
import { validateRequest } from "../middleware/validationMiddleware";
import { body } from "express-validator";

const authRouter = Router();

authRouter.post('/registration',
    [
        body('username')
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
    ],
    validateRequest,
    asyncHandler(userController.registration)
)
authRouter.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
    ],
    asyncHandler(userController.login)
)
authRouter.post('/logout',
    asyncHandler(userController.logout)
)

authRouter.get('/refresh',

    asyncHandler(userController.refresh)
)
// authRouter.get('/users')

export default authRouter;