import { prisma } from '../index';
import { AuditService } from './audit.service';

export class TeamService {
  private audit = new AuditService();

  // Получить все команды
  async getAllTeams() {
    return prisma.team.findMany({
      orderBy: { wins: 'desc' },
      include: {
        conference: true,
        division: true
      }
    });
  }

  // Получить команду по ID
  async getTeamById(id: number) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        conference: true,
        division: true,
        homeMatches: {
          take: 5,
          orderBy: { date: 'desc' }
        },
        awayMatches: {
          take: 5,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!team) {
      throw new Error('Команда не найдена');
    }

    return team;
  }

  // Создать команду (только admin/operator)
  async createTeam(data: any, userId: number) {
    // Получаем конференцию и дивизион по умолчанию
    const defaultConference = await prisma.conference.findFirst({
      where: { name: 'Western' }
    });
    
    const defaultDivision = await prisma.division.findFirst({
      where: { name: 'Pacific' }
    });

    if (!defaultConference || !defaultDivision) {
      throw new Error('Конференции или дивизионы не найдены. Сначала выполните импорт команд.');
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        city: data.city || null,
        arena: data.arena || null,
        foundedYear: data.foundedYear || null,
        wins: data.wins || 0,
        losses: data.losses || 0,
        pointsFor: data.pointsFor || 0,
        pointsAgainst: data.pointsAgainst || 0,
        
        // Обязательные связи
        conferenceId: defaultConference.id,
        divisionId: defaultDivision.id
      }
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Team',
      entityId: team.id,
      details: { name: team.name }
    });

    return team;
  }

  // Обновить команду
  async updateTeam(id: number, data: any, userId: number) {
    const team = await prisma.team.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        arena: data.arena,
        foundedYear: data.foundedYear,
        wins: data.wins,
        losses: data.losses,
        pointsFor: data.pointsFor,
        pointsAgainst: data.pointsAgainst
      }
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Team',
      entityId: team.id,
      details: { name: team.name }
    });

    return team;
  }

  // Удалить команду (только admin)
  async deleteTeam(id: number, userId: number) {
    const team = await prisma.team.delete({
      where: { id }
    });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Team',
      entityId: team.id,
      details: { name: team.name }
    });

    return team;
  }

  // Получить статистику команды
  async getTeamStats(id: number) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        teamStats: {
          orderBy: { season: 'desc' }
        },
        players: {
          where: { isActive: true },
          orderBy: { pointsPerGame: 'desc' },
          take: 10
        }
      }
    });

    return team;
  }
}