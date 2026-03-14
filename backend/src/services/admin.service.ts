import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../index';
import { AuditService } from './audit.service';
import { AIService } from './ai.service';

interface BackupPayload {
  roles: any[];
  users: any[];
  conferences: any[];
  divisions: any[];
  teams: any[];
  players: any[];
  teamStats: any[];
  matches: any[];
  historicalData: any[];
  predictions: any[];
  auditLogs: any[];
}

export class AdminService {
  private audit = new AuditService();
  private aiService = new AIService();

  async getUsers() {
    const users = await prisma.user.findMany({
      include: {
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      username: this.makeUsername(user.email, user.name),
      name: user.name,
      role: user.role.name,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    }));
  }

  async setUserBlocked(userId: number, isBlocked: boolean, actorUserId: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked },
      include: {
        role: true,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: isBlocked ? 'BLOCK' : 'UNBLOCK',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, isBlocked },
    });

    return {
      id: user.id,
      email: user.email,
      username: this.makeUsername(user.email, user.name),
      name: user.name,
      role: user.role.name,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    };
  }

  async getStats() {
    const [totalUsers, totalTeams, totalPlayers, totalMatches, totalPredictions, totalBackups, accuracy, latestBackup] =
      await Promise.all([
        prisma.user.count(),
        prisma.team.count(),
        prisma.player.count(),
        prisma.match.count(),
        prisma.prediction.count(),
        prisma.backup.count(),
        this.aiService.evaluateModel(),
        prisma.backup.findFirst({ orderBy: { createdAt: 'desc' } }),
      ]);

    return {
      totalUsers,
      totalTeams,
      totalPlayers,
      totalMatches,
      totalPredictions,
      totalBackups,
      accuracy: accuracy === null ? null : Number((accuracy * 100).toFixed(2)),
      lastBackupAt: latestBackup?.createdAt || null,
    };
  }

  async getLogs() {
    return this.audit.getLogs();
  }

  async getBackups() {
    return prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBackup(actorUserId: number) {
    const backupDir = this.getBackupDirectory();
    await fs.mkdir(backupDir, { recursive: true });

    const payload: BackupPayload = {
      roles: await prisma.role.findMany({ orderBy: { id: 'asc' } }),
      users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
      conferences: await prisma.conference.findMany({ orderBy: { id: 'asc' } }),
      divisions: await prisma.division.findMany({ orderBy: { id: 'asc' } }),
      teams: await prisma.team.findMany({ orderBy: { id: 'asc' } }),
      players: await prisma.player.findMany({ orderBy: { id: 'asc' } }),
      teamStats: await prisma.teamStats.findMany({ orderBy: { id: 'asc' } }),
      matches: await prisma.match.findMany({ orderBy: { id: 'asc' } }),
      historicalData: await prisma.historicalData.findMany({ orderBy: { createdAt: 'asc' } }),
      predictions: await prisma.prediction.findMany({ orderBy: { createdAt: 'asc' } }),
      auditLogs: await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
    };

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(backupDir, filename);
    const contents = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, contents, 'utf8');

    const stat = await fs.stat(filePath);
    const backup = await prisma.backup.create({
      data: {
        filename,
        size: stat.size,
        type: 'manual',
        status: 'completed',
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'BACKUP',
      entity: 'System',
      details: { filename },
    });

    return backup;
  }

  async restoreBackup(backupId: string, actorUserId: number) {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) {
      throw new Error('Backup not found');
    }

    const filePath = path.join(this.getBackupDirectory(), backup.filename);
    const raw = await fs.readFile(filePath, 'utf8');
    const payload = JSON.parse(raw) as BackupPayload;

    await prisma.$transaction(async (tx) => {
      await tx.backup.updateMany({ data: { createdBy: null } });
      await tx.auditLog.deleteMany({});
      await tx.prediction.deleteMany({});
      await tx.historicalData.deleteMany({});
      await tx.playerStats.deleteMany({});
      await tx.matchStats.deleteMany({});
      await tx.match.deleteMany({});
      await tx.teamStats.deleteMany({});
      await tx.player.deleteMany({});
      await tx.team.deleteMany({});
      await tx.division.deleteMany({});
      await tx.conference.deleteMany({});
      await tx.user.deleteMany({});
      await tx.role.deleteMany({});

      if (payload.roles.length > 0) {
        await tx.role.createMany({ data: payload.roles });
      }
      if (payload.users.length > 0) {
        await tx.user.createMany({ data: payload.users });
      }
      if (payload.conferences.length > 0) {
        await tx.conference.createMany({ data: payload.conferences });
      }
      if (payload.divisions.length > 0) {
        await tx.division.createMany({ data: payload.divisions });
      }
      if (payload.teams.length > 0) {
        await tx.team.createMany({ data: payload.teams });
      }
      if (payload.players.length > 0) {
        await tx.player.createMany({ data: payload.players });
      }
      if (payload.teamStats.length > 0) {
        await tx.teamStats.createMany({ data: payload.teamStats });
      }
      if (payload.matches.length > 0) {
        await tx.match.createMany({ data: payload.matches });
      }
      if (payload.historicalData.length > 0) {
        await tx.historicalData.createMany({ data: payload.historicalData });
      }
      if (payload.predictions.length > 0) {
        await tx.prediction.createMany({ data: payload.predictions });
      }
      if (payload.auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: payload.auditLogs });
      }
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'RESTORE',
      entity: 'System',
      details: { backupId, filename: backup.filename },
    });

    return { restored: true, backup };
  }

  private getBackupDirectory() {
    return path.resolve(process.cwd(), 'backups');
  }

  private makeUsername(email: string, name: string) {
    if (email.includes('@')) {
      return email.split('@')[0];
    }

    return name.toLowerCase().replace(/\s+/g, '_');
  }
}
