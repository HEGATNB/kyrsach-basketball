import { Request, Response } from 'express';
import { MatchService } from '../services/match.service';

const matchService = new MatchService();

export class MatchController {
  async getAll(req: Request, res: Response) {
    try {
      const filters: any = {};
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.teamId) {
        const teamId = parseInt(req.query.teamId as string);
        filters.OR = [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ];
      }

      const matches = await matchService.getAllMatches(filters);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const match = await matchService.getMatchById(id);
      res.json(match);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const match = await matchService.createMatch(req.body, req.user.userId);
      res.status(201).json(match);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateResult(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const id = parseInt(req.params.id);
      const { homeScore, awayScore } = req.body;

      if (homeScore === undefined || awayScore === undefined) {
        return res.status(400).json({ error: 'Необходимо указать счет' });
      }

      const match = await matchService.updateMatchResult(id, homeScore, awayScore, req.user.userId);
      res.json(match);
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
      const match = await matchService.deleteMatch(id, req.user.userId);
      res.json({ message: 'Матч удален', match });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}