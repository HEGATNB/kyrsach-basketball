import { prisma } from '../index';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
      }

      const result = await authService.register(email, password, name, role);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      res.json({ user: req.user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async initDatabase(req: Request, res: Response) {
    try {
      await authService.initRoles();
      await authService.initTestUsers();
      res.json({ message: 'База данных инициализирована' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}