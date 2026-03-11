import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

const adminService = new AdminService();

export class AdminController {
  async getUsers(_req: Request, res: Response) {
    try {
      res.json(await adminService.getUsers());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async blockUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const userId = Number.parseInt(req.params.id, 10);
      const isBlocked = Boolean(req.body.isBlocked);
      res.json(await adminService.setUserBlocked(userId, isBlocked, req.user.userId));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getLogs(_req: Request, res: Response) {
    try {
      res.json(await adminService.getLogs());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(_req: Request, res: Response) {
    try {
      res.json(await adminService.getStats());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBackups(_req: Request, res: Response) {
    try {
      res.json(await adminService.getBackups());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createBackup(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const backup = await adminService.createBackup(req.user.userId);
      res.status(201).json(backup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async restoreBackup(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const result = await adminService.restoreBackup(req.params.id, req.user.userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
