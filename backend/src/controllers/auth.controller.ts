import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name, username, role } = req.body;
      const displayName = name || username;

      if (!email || !password || !displayName) {
        return res.status(400).json({ error: 'Email, password and name are required' });
      }

      res.json(await authService.register(email, password, displayName, role));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, username, identifier, password } = req.body;
      const loginValue = identifier || email || username;

      if (!loginValue || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
      }

      res.json(await authService.login(loginValue, password));
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json(await authService.getMe(req.user.userId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async initDatabase(_req: Request, res: Response) {
    try {
      await authService.initRoles();
      await authService.initTestUsers();
      res.json({ message: 'Database initialized' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
