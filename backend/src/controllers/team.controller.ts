import { Request, Response } from 'express';
import { TeamService } from '../services/team.service';

const teamService = new TeamService();

export class TeamController {
  async getAll(req: Request, res: Response) {
    try {
      const teams = await teamService.getAllTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const team = await teamService.getTeamById(id);
      res.json(team);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const team = await teamService.createTeam(req.body, req.user.userId);
      res.status(201).json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const id = parseInt(req.params.id);
      const team = await teamService.updateTeam(id, req.body, req.user.userId);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const id = parseInt(req.params.id);
      const team = await teamService.deleteTeam(id, req.user.userId);
      res.json({ message: 'Команда удалена', team });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}