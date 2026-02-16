import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { AuthController } from './controllers/auth.controller';
import { TeamController } from './controllers/team.controller';
import { MatchController } from './controllers/match.controller';
import { AIController } from './controllers/ai.controller';
import { authenticate, requireAdmin, requireAdminOrOperator } from './middleware/auth';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

const authController = new AuthController();
const teamController = new TeamController();
const matchController = new MatchController();
const aiController = new AIController();

app.use(cors());
app.use(express.json());

// Публичные роуты
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth роуты
app.post('/api/auth/register', (req, res) => authController.register(req, res));
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.post('/api/auth/init', (req, res) => authController.initDatabase(req, res));
app.get('/api/auth/me', authenticate, (req, res) => authController.getMe(req, res));

// Teams роуты
app.get('/api/teams', (req, res) => teamController.getAll(req, res));
app.get('/api/teams/:id', (req, res) => teamController.getById(req, res));
app.post('/api/teams', authenticate, requireAdminOrOperator, (req, res) => teamController.create(req, res));
app.put('/api/teams/:id', authenticate, requireAdminOrOperator, (req, res) => teamController.update(req, res));
app.delete('/api/teams/:id', authenticate, requireAdmin, (req, res) => teamController.delete(req, res));

// Matches роуты
app.get('/api/matches', (req, res) => matchController.getAll(req, res));
app.get('/api/matches/:id', (req, res) => matchController.getById(req, res));
app.post('/api/matches', authenticate, requireAdminOrOperator, (req, res) => matchController.create(req, res));
app.put('/api/matches/:id/result', authenticate, requireAdminOrOperator, (req, res) => matchController.updateResult(req, res));
app.delete('/api/matches/:id', authenticate, requireAdmin, (req, res) => matchController.delete(req, res));

// AI Prediction роуты
app.post('/api/predict', authenticate, (req, res) => aiController.predict(req, res));
app.get('/api/predictions/my', authenticate, (req, res) => aiController.getMyPredictions(req, res));
app.get('/api/predictions/:id', authenticate, (req, res) => aiController.getPredictionById(req, res));
app.post('/api/predictions/train/:matchId', authenticate, requireAdmin, (req, res) => aiController.trainOnMatch(req, res));
app.get('/api/predict/evaluate', authenticate, (req, res) => aiController.evaluateModel(req, res)); // ЭТОТ РОУТ
app.get('/api/predict/stats', authenticate, requireAdmin, (req, res) => aiController.getModelStats(req, res));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/init`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`📋 Teams API: http://localhost:${PORT}/api/teams`);
  console.log(`🏀 Matches API: http://localhost:${PORT}/api/matches`);
  console.log(`🤖 AI Prediction: http://localhost:${PORT}/api/predict`);
  console.log(`📈 My Predictions: http://localhost:${PORT}/api/predictions/my`);
  console.log(`📈 AI Evaluate: http://localhost:${PORT}/api/predict/evaluate`);
});