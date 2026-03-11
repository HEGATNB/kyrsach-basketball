import { prisma } from '../index';

export class PlayerService {
  async getAllPlayers(filters?: { teamId?: number; search?: string; limit?: number }) {
    return prisma.player.findMany({
      where: {
        ...(filters?.teamId ? { teamId: filters.teamId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { fullName: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        team: true,
      },
      orderBy: [{ pointsPerGame: 'desc' }, { fullName: 'asc' }],
      ...(filters?.limit ? { take: filters.limit } : {}),
    });
  }

  async getPlayerById(id: number) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    return player;
  }
}
