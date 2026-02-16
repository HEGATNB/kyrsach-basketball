import { prisma } from '../index';
import { AuditService } from './audit.service';

export class MatchService {
  private audit = new AuditService();

  // Получить все матчи
  async getAllMatches(filters?: any) {
    return prisma.match.findMany({
      where: filters,
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { date: 'desc' }
    });
  }

  // Получить матч по ID
  async getMatchById(id: number) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: true
      }
    });

    if (!match) {
      throw new Error('Матч не найден');
    }

    return match;
  }

  // Создать матч (только admin/operator)
  async createMatch(data: any, userId: number) {
    const match = await prisma.match.create({
      data: {
        date: new Date(data.date),
        status: data.status || 'scheduled',
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        createdById: userId
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Match',
      entityId: match.id,
      details: {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        date: match.date
      }
    });

    return match;
  }

  // Обновить результат матча
  async updateMatchResult(id: number, homeScore: number, awayScore: number, userId: number) {
    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore,
        awayScore,
        status: 'finished'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    // Обновляем статистику команд
    await this.updateTeamStats(match.homeTeamId, match.awayTeamId, homeScore, awayScore);

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Match',
      entityId: match.id,
      details: {
        homeScore,
        awayScore,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name
      }
    });

    return match;
  }

  // Обновить статистику команд после матча
  private async updateTeamStats(homeId: number, awayId: number, homeScore: number, awayScore: number) {
    const homeTeam = await prisma.team.findUnique({ where: { id: homeId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayId } });

    if (!homeTeam || !awayTeam) return;

    // Обновляем победы/поражения
    if (homeScore > awayScore) {
      await prisma.team.update({
        where: { id: homeId },
        data: { wins: homeTeam.wins + 1 }
      });
      await prisma.team.update({
        where: { id: awayId },
        data: { losses: awayTeam.losses + 1 }
      });
    } else {
      await prisma.team.update({
        where: { id: awayId },
        data: { wins: awayTeam.wins + 1 }
      });
      await prisma.team.update({
        where: { id: homeId },
        data: { losses: homeTeam.losses + 1 }
      });
    }

    // Обновляем средние очки
    const homeGames = await prisma.match.count({
      where: { homeTeamId: homeId, status: 'finished' }
    });
    const awayGames = await prisma.match.count({
      where: { awayTeamId: awayId, status: 'finished' }
    });

    await prisma.team.update({
      where: { id: homeId },
      data: {
        pointsFor: (homeTeam.pointsFor * (homeGames - 1) + homeScore) / homeGames,
        pointsAgainst: (homeTeam.pointsAgainst * (homeGames - 1) + awayScore) / homeGames
      }
    });

    await prisma.team.update({
      where: { id: awayId },
      data: {
        pointsFor: (awayTeam.pointsFor * (awayGames - 1) + awayScore) / awayGames,
        pointsAgainst: (awayTeam.pointsAgainst * (awayGames - 1) + homeScore) / awayGames
      }
    });
  }

  // Удалить матч (только admin)
  async deleteMatch(id: number, userId: number) {
    const match = await prisma.match.delete({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Match',
      entityId: match.id,
      details: {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        date: match.date
      }
    });

    return match;
  }
}