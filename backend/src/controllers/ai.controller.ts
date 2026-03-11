import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { AuditService } from '../services/audit.service';

const aiService = new AIService();
const audit = new AuditService();

export class AIController {
  async predict(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const team1Id = req.body.team1Id ?? req.body.team1_id;
      const team2Id = req.body.team2Id ?? req.body.team2_id;

      if (!team1Id || !team2Id) {
        return res.status(400).json({ error: 'Both team ids are required' });
      }

      if (team1Id === team2Id) {
        return res.status(400).json({ error: 'Teams must be different' });
      }

      const result = await aiService.predictMatch(Number(team1Id), Number(team2Id), req.user.userId);

      await audit.log({
        userId: req.user.userId,
        action: 'PREDICT',
        entity: 'Prediction',
        details: {
          team1Id: Number(team1Id),
          team2Id: Number(team2Id),
          probabilityTeam1: result.probabilityTeam1,
          probabilityTeam2: result.probabilityTeam2,
        },
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMyPredictions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      res.json(await aiService.getUserPredictions(req.user.userId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPredictionById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const prediction = await aiService.getPredictionById(req.params.id);

      if (!prediction) {
        return res.status(404).json({ error: 'Prediction not found' });
      }

      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async trainOnMatch(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await aiService.trainOnActualResult(Number.parseInt(req.params.matchId, 10));
      res.json({ message: 'Model updated from finished match' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async evaluateModel(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authorization required' });
      }

      const accuracy = await aiService.evaluateModel();

      if (accuracy === null) {
        return res.json({
          accuracy: null,
          message: 'Not enough historical data to evaluate the model',
        });
      }

      res.json({
        accuracy: Number((accuracy * 100).toFixed(2)),
        message: `Model accuracy is ${(accuracy * 100).toFixed(2)}%`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getModelStats(_req: Request, res: Response) {
    try {
      res.json(await aiService.getModelStatsSnapshot());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
