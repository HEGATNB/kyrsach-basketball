import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { AuditService } from '../services/audit.service';

const aiService = new AIService();
const audit = new AuditService();

export class AIController {
  
  // Создать прогноз
  async predict(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const { team1Id, team2Id } = req.body;

      if (!team1Id || !team2Id) {
        return res.status(400).json({ error: 'Необходимо указать ID обеих команд' });
      }

      if (team1Id === team2Id) {
        return res.status(400).json({ error: 'Команды должны быть разными' });
      }

      const result = await aiService.predictMatch(team1Id, team2Id, req.user.userId);

      await audit.log({
        userId: req.user.userId,
        action: 'PREDICT',
        entity: 'Prediction',
        details: {
          team1Id,
          team2Id,
          probabilityTeam1: result.probabilityTeam1,
          probabilityTeam2: result.probabilityTeam2
        }
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Получить историю прогнозов пользователя
  async getMyPredictions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const predictions = await aiService.getUserPredictions(req.user.userId);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Получить прогноз по ID
  async getPredictionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const prediction = await aiService.getPredictionById(id);

      if (!prediction) {
        return res.status(404).json({ error: 'Прогноз не найден' });
      }

      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Обучить модель на реальном результате
  async trainOnMatch(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Только администратор может обучать модель' });
      }

      const { matchId } = req.params;
      await aiService.trainOnActualResult(parseInt(matchId));

      res.json({ message: 'Модель успешно обучена на реальном результате' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ОЦЕНКА ТОЧНОСТИ МОДЕЛИ
  async evaluateModel(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      console.log('📊 Запрос на оценку модели...');
      const accuracy = await aiService.evaluateModel();
      
      if (accuracy === null) {
        return res.json({ 
          accuracy: null,
          message: 'Недостаточно данных для оценки модели'
        });
      }

      res.json({ 
        accuracy: Number((accuracy * 100).toFixed(2)),
        message: `Точность модели: ${(accuracy * 100).toFixed(2)}%`
      });
    } catch (error: any) {
      console.error('❌ Ошибка при оценке модели:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Получить статистику модели
  async getModelStats(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Только администратор' });
      }

      const totalPredictions = await aiService.getTotalPredictions();
      const totalTrainingData = await aiService.getTotalTrainingData();
      const accuracy = await aiService.evaluateModel();

      res.json({
        totalPredictions,
        totalTrainingData,
        accuracy: accuracy ? Number((accuracy * 100).toFixed(2)) : null,
        modelVersion: 'v3.0-ml-enhanced'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}