import { Request, Response } from 'express';
import { PlayerService } from '../services/player.service';

const playerService = new PlayerService();

export class PlayerController {
  async getAll(req: Request, res: Response) {
    try {
      const teamIdParam = (req.query.teamId || req.query.team_id) as string | undefined;
      const limitParam = req.query.limit as string | undefined;
      const searchParam = req.query.search as string | undefined;

      const players = await playerService.getAllPlayers({
        teamId: teamIdParam ? Number.parseInt(teamIdParam, 10) : undefined,
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
        search: searchParam,
      });

      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const player = await playerService.getPlayerById(Number.parseInt(req.params.id, 10));
      res.json(player);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}
