// src/controllers/userController.ts
import { NextFunction, Request, Response } from 'express';
import userService from '../services/userService';
import { UserCreate, UserUpdate } from '../interfaces/userInterfaces';
import { AuthErrors } from '../exceptions/authErrors';


export class UserController {
  async registration(req: Request, res: Response) {
    const userData: UserCreate = req.body;
    const user = await userService.createUser(userData);

    res.cookie('refreshToken', user.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true })

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: user
    });
  }

  async login(req: Request, res: Response) {
    const {email, password} = req.body;
    const userData = await userService.login(email, password)

    res.cookie('refreshToken', userData.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true})

    res.status(200).json({
      success: true,
      message: 'Пользователь успешно авторизован',
      data: userData,
    })
  }

  async logout(req: Request, res: Response) {
    const {refreshToken} = req.cookies
    if(!refreshToken){
      throw AuthErrors.RefreshTokenRequired();
    }
    const token = userService.logout(refreshToken)

    res.clearCookie('refreshToken')

    res.status(200).json({
      success: true,
      message: 'Пользователь успешно вышел из системы',
    })
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    const {refreshToken} = req.cookies;
    const userData = await userService.refresh(refreshToken)
    res.cookie('refreshToken', userData.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true})
    res.status(201).json({
      success: true,
      message: 'Токен успешно обновлён',
      data: userData,
    })
  }

  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UserUpdate = req.body;

      const user = await userService.updateUser(id, updateData);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error updating user'
      });
    }
  }

  async addListeningTime(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { minutes } = req.body;

      const user = await userService.addListeningTime(id, minutes);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating listening time'
      });
    }
  }
}

export default new UserController();