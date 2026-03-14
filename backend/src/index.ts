import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { AuthController } from './controllers/auth.controller';
import { TeamController } from './controllers/team.controller';
import { MatchController } from './controllers/match.controller';
import { AIController } from './controllers/ai.controller';
import { PlayerController } from './controllers/player.controller';
import { AdminController } from './controllers/admin.controller';
import { authenticate, requireAdmin, requireAdminOrOperator } from './middleware/auth';
import { BootstrapService } from './services/bootstrap.service';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const port = Number.parseInt(process.env.PORT || '8000', 10);

const authController = new AuthController();
const teamController = new TeamController();
const matchController = new MatchController();
const aiController = new AIController();
const playerController = new PlayerController();
const adminController = new AdminController();
const bootstrapService = new BootstrapService();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => authController.register(req, res));
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.post('/api/auth/init', (req, res) => authController.initDatabase(req, res));
app.get('/api/auth/me', authenticate, (req, res) => authController.getMe(req, res));

app.get('/api/teams', (req, res) => teamController.getAll(req, res));
app.get('/api/teams/:id', (req, res) => teamController.getById(req, res));
app.post('/api/teams', authenticate, requireAdminOrOperator, (req, res) => teamController.create(req, res));
app.put('/api/teams/:id', authenticate, requireAdminOrOperator, (req, res) => teamController.update(req, res));
app.delete('/api/teams/:id', authenticate, requireAdmin, (req, res) => teamController.delete(req, res));

app.get('/api/players', (req, res) => playerController.getAll(req, res));
app.get('/api/players/:id', (req, res) => playerController.getById(req, res));

app.get('/api/matches', (req, res) => matchController.getAll(req, res));
app.get('/api/matches/:id', (req, res) => matchController.getById(req, res));
app.post('/api/matches', authenticate, requireAdminOrOperator, (req, res) => matchController.create(req, res));
app.put('/api/matches/:id/result', authenticate, requireAdminOrOperator, (req, res) => matchController.updateResult(req, res));
app.delete('/api/matches/:id', authenticate, requireAdmin, (req, res) => matchController.delete(req, res));

app.post('/api/predict', authenticate, (req, res) => aiController.predict(req, res));
app.get('/api/predictions/my', authenticate, (req, res) => aiController.getMyPredictions(req, res));
app.get('/api/predictions/:id', authenticate, (req, res) => aiController.getPredictionById(req, res));
app.post('/api/predictions/train/:matchId', authenticate, requireAdmin, (req, res) => aiController.trainOnMatch(req, res));
app.get('/api/predict/evaluate', authenticate, (req, res) => aiController.evaluateModel(req, res));
app.get('/api/predict/stats', (req, res) => aiController.getModelStats(req, res));

app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => adminController.getUsers(req, res));
app.put('/api/admin/users/:id/block', authenticate, requireAdmin, (req, res) => adminController.blockUser(req, res));
app.get('/api/admin/logs', authenticate, requireAdmin, (req, res) => adminController.getLogs(req, res));
app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => adminController.getStats(req, res));
app.get('/api/admin/backups', authenticate, requireAdmin, (req, res) => adminController.getBackups(req, res));
app.post('/api/admin/backup', authenticate, requireAdmin, (req, res) => adminController.createBackup(req, res));
app.post('/api/admin/restore/:id', authenticate, requireAdmin, (req, res) => adminController.restoreBackup(req, res));

async function start() {
  await bootstrapService.ensureSeeded();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
  });
}

start().catch(async (error) => {
  console.error('Failed to start backend', error);
  await prisma.$disconnect();
  process.exit(1);
});
