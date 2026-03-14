import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { AuthService } from './auth.service';
import { CONFERENCES, DIVISIONS, TEAM_CATALOG } from '../data/league';

const csv = require('csv-parser');

interface TeamSummaryRow {
  season: string;
  lg: string;
  abbreviation: string;
  w: string;
  l: string;
  arena: string;
}

interface TeamPerGameRow {
  season: string;
  lg: string;
  abbreviation: string;
  pts_per_game: string;
  trb_per_game: string;
  ast_per_game: string;
}

interface OpponentPerGameRow {
  season: string;
  lg: string;
  abbreviation: string;
  opp_pts_per_game: string;
}

interface PlayerCareerRow {
  player_id: string;
  birth_date: string;
  ht_in_in: string;
  wt: string;
  pos: string;
}

interface PlayerPerGameRow {
  season: string;
  lg: string;
  player: string;
  player_id: string;
  team: string;
  pos: string;
  mp_per_game: string;
  pts_per_game: string;
  trb_per_game: string;
  ast_per_game: string;
  stl_per_game: string;
  blk_per_game: string;
  fg_percent: string;
  x3p_percent: string;
  ft_percent: string;
}

export class BootstrapService {
  private authService = new AuthService();
  private currentSeason = '2026';

  async ensureSeeded() {
    await this.authService.initRoles();
    await this.authService.initTestUsers();
    await this.seedLeague();

    if ((await prisma.player.count()) < 120) {
      await this.seedPlayers();
    }

    await this.syncPlayerHeadshots();

    if ((await prisma.match.count()) === 0) {
      await this.seedMatches();
    }

    if ((await prisma.historicalData.count()) === 0) {
      await this.seedHistoricalData();
    }
  }

  private async seedLeague() {
    const teamSummaries = await this.readCsv<TeamSummaryRow>('Team Summaries.csv');
    const teamPerGame = await this.readCsv<TeamPerGameRow>('Team Stats Per Game.csv');
    const opponentPerGame = await this.readCsv<OpponentPerGameRow>('Opponent Stats Per Game.csv');

    const summaryByAbbrev = new Map(
      teamSummaries
        .filter((row) => row.season === this.currentSeason && row.lg === 'NBA')
        .map((row) => [row.abbreviation, row]),
    );
    const perGameByAbbrev = new Map(
      teamPerGame
        .filter((row) => row.season === this.currentSeason && row.lg === 'NBA')
        .map((row) => [row.abbreviation, row]),
    );
    const oppByAbbrev = new Map(
      opponentPerGame
        .filter((row) => row.season === this.currentSeason && row.lg === 'NBA')
        .map((row) => [row.abbreviation, row]),
    );

    for (const conference of CONFERENCES) {
      await prisma.conference.upsert({
        where: { name: conference.name },
        update: { shortName: conference.shortName },
        create: conference,
      });
    }

    const conferenceMap = new Map(
      (await prisma.conference.findMany()).map((conference) => [conference.name, conference.id]),
    );

    for (const division of DIVISIONS) {
      await prisma.division.upsert({
        where: { name: division.name },
        update: { conferenceId: conferenceMap.get(division.conference)! },
        create: {
          name: division.name,
          conferenceId: conferenceMap.get(division.conference)!,
        },
      });
    }

    const divisionMap = new Map((await prisma.division.findMany()).map((division) => [division.name, division.id]));

    for (const team of TEAM_CATALOG) {
      const summary = summaryByAbbrev.get(team.abbrev);
      const perGame = perGameByAbbrev.get(team.abbrev);
      const opponent = oppByAbbrev.get(team.abbrev);
      const wins = summary ? this.asInt(summary.w) : 0;
      const losses = summary ? this.asInt(summary.l) : 0;
      const pointsPerGame = perGame ? this.asFloat(perGame.pts_per_game) : 0;
      const pointsAgainst = opponent ? this.asFloat(opponent.opp_pts_per_game) : 0;

      const dbTeam = await prisma.team.upsert({
        where: { name: team.name },
        update: {
          abbrev: team.abbrev,
          fullName: team.name,
          nickname: team.nickname,
          city: team.city,
          arena: summary?.arena || team.arena,
          foundedYear: team.foundedYear,
          conferenceId: conferenceMap.get(team.conference)!,
          divisionId: divisionMap.get(team.division)!,
          wins,
          losses,
          seasonWins: wins,
          seasonLosses: losses,
          pointsFor: pointsPerGame,
          pointsAgainst,
          pointsPerGame,
        },
        create: {
          name: team.name,
          abbrev: team.abbrev,
          fullName: team.name,
          nickname: team.nickname,
          city: team.city,
          arena: summary?.arena || team.arena,
          foundedYear: team.foundedYear,
          conferenceId: conferenceMap.get(team.conference)!,
          divisionId: divisionMap.get(team.division)!,
          wins,
          losses,
          seasonWins: wins,
          seasonLosses: losses,
          pointsFor: pointsPerGame,
          pointsAgainst,
          pointsPerGame,
        },
      });

      await prisma.teamStats.upsert({
        where: {
          teamId_season: {
            teamId: dbTeam.id,
            season: this.currentSeason,
          },
        },
        update: {
          wins,
          losses,
          winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
          pointsPerGame,
          reboundsPerGame: perGame ? this.asFloat(perGame.trb_per_game) : 0,
          assistsPerGame: perGame ? this.asFloat(perGame.ast_per_game) : 0,
        },
        create: {
          teamId: dbTeam.id,
          season: this.currentSeason,
          wins,
          losses,
          winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
          pointsPerGame,
          reboundsPerGame: perGame ? this.asFloat(perGame.trb_per_game) : 0,
          assistsPerGame: perGame ? this.asFloat(perGame.ast_per_game) : 0,
        },
      });
    }
  }

  private async seedPlayers() {
    const teams = await prisma.team.findMany();
    const teamIdByAbbrev = new Map(teams.map((team) => [team.abbrev, team.id]));

    const careerRows = await this.readCsv<PlayerCareerRow>('Player Career Info.csv');
    const perGameRows = await this.readCsv<PlayerPerGameRow>('Player Per Game.csv');
    const careerByPlayerId = new Map(careerRows.map((row) => [row.player_id, row]));
    const latestRowsByPlayer = this.getLatestPlayerRows(perGameRows);

    const rowsByTeam = new Map<string, PlayerPerGameRow[]>();
    for (const row of latestRowsByPlayer.values()) {
      if (!teamIdByAbbrev.has(row.team)) {
        continue;
      }

      const rows = rowsByTeam.get(row.team) || [];
      rows.push(row);
      rowsByTeam.set(row.team, rows);
    }

    for (const [teamAbbrev, rows] of rowsByTeam.entries()) {
      const teamId = teamIdByAbbrev.get(teamAbbrev);
      if (!teamId) {
        continue;
      }

      const selectedRows = rows
        .sort((left, right) => this.asFloat(right.mp_per_game) - this.asFloat(left.mp_per_game))
        .slice(0, 8);

      for (const row of selectedRows) {
        const career = careerByPlayerId.get(row.player_id);
        const [firstName, ...rest] = row.player.split(' ');
        const lastName = rest.join(' ');

        await prisma.player.upsert({
          where: { fullName: row.player },
          update: {
            firstName,
            lastName,
            birthDate: career?.birth_date ? new Date(career.birth_date) : null,
            height: career?.ht_in_in ? Math.round(this.asFloat(career.ht_in_in) * 2.54) : null,
            weight: career?.wt ? Math.round(this.asFloat(career.wt) * 0.453592) : null,
            position: this.normalizePosition(row.pos || career?.pos),
            jerseyNumber: this.makeJerseyNumber(row.player_id),
            teamId,
            pointsPerGame: this.asFloat(row.pts_per_game),
            reboundsPerGame: this.asFloat(row.trb_per_game),
            assistsPerGame: this.asFloat(row.ast_per_game),
            stealsPerGame: this.asFloat(row.stl_per_game),
            blocksPerGame: this.asFloat(row.blk_per_game),
            minutesPerGame: this.asFloat(row.mp_per_game),
            fgPercentage: this.asFloat(row.fg_percent) * 100,
            threePercentage: row.x3p_percent === 'NA' ? 0 : this.asFloat(row.x3p_percent) * 100,
            ftPercentage: row.ft_percent === 'NA' ? 0 : this.asFloat(row.ft_percent) * 100,
            photoUrl: this.makePlayerPhotoUrl(row.player_id),
            isActive: true,
          },
          create: {
            firstName,
            lastName,
            fullName: row.player,
            birthDate: career?.birth_date ? new Date(career.birth_date) : null,
            height: career?.ht_in_in ? Math.round(this.asFloat(career.ht_in_in) * 2.54) : null,
            weight: career?.wt ? Math.round(this.asFloat(career.wt) * 0.453592) : null,
            position: this.normalizePosition(row.pos || career?.pos),
            jerseyNumber: this.makeJerseyNumber(row.player_id),
            teamId,
            pointsPerGame: this.asFloat(row.pts_per_game),
            reboundsPerGame: this.asFloat(row.trb_per_game),
            assistsPerGame: this.asFloat(row.ast_per_game),
            stealsPerGame: this.asFloat(row.stl_per_game),
            blocksPerGame: this.asFloat(row.blk_per_game),
            minutesPerGame: this.asFloat(row.mp_per_game),
            fgPercentage: this.asFloat(row.fg_percent) * 100,
            threePercentage: row.x3p_percent === 'NA' ? 0 : this.asFloat(row.x3p_percent) * 100,
            ftPercentage: row.ft_percent === 'NA' ? 0 : this.asFloat(row.ft_percent) * 100,
            photoUrl: this.makePlayerPhotoUrl(row.player_id),
            isActive: true,
          },
        });
      }
    }
  }

  private async syncPlayerHeadshots() {
    const perGameRows = await this.readCsv<PlayerPerGameRow>('Player Per Game.csv');
    const latestRowsByPlayer = this.getLatestPlayerRows(perGameRows);

    for (const row of latestRowsByPlayer.values()) {
      await prisma.player.updateMany({
        where: { fullName: row.player },
        data: {
          photoUrl: this.makePlayerPhotoUrl(row.player_id),
        },
      });
    }
  }

  private async seedMatches() {
    const admin = await prisma.user.findFirst({
      where: {
        role: {
          name: 'admin',
        },
      },
      include: {
        role: true,
      },
    });

    if (!admin) {
      return;
    }

    const teams = await prisma.team.findMany({ orderBy: { wins: 'desc' } });
    const today = new Date();

    for (let index = 0; index < 24; index += 1) {
      const homeTeam = teams[index % teams.length];
      let awayTeam = teams[(index * 7 + 5) % teams.length];
      if (awayTeam.id === homeTeam.id) {
        awayTeam = teams[(index * 7 + 6) % teams.length];
      }

      const matchDate = new Date(today);
      matchDate.setDate(today.getDate() + index - 11);
      matchDate.setHours(19 + (index % 3) * 2, 0, 0, 0);

      const isFinished = index < 12;
      const scores = this.simulateScore(homeTeam, awayTeam, index + 1);

      await prisma.match.create({
        data: {
          date: matchDate,
          status: isFinished ? 'finished' : 'scheduled',
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: isFinished ? scores.homeScore : null,
          awayScore: isFinished ? scores.awayScore : null,
          createdById: admin.id,
        },
      });
    }
  }

  private async seedHistoricalData() {
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });

    for (let index = 0; index < 180; index += 1) {
      const team1 = teams[index % teams.length];
      let team2 = teams[(index * 11 + 7) % teams.length];
      if (team2.id === team1.id) {
        team2 = teams[(index * 11 + 8) % teams.length];
      }

      const team1WinRate = team1.wins + team1.losses > 0 ? team1.wins / (team1.wins + team1.losses) : 0.5;
      const team2WinRate = team2.wins + team2.losses > 0 ? team2.wins / (team2.wins + team2.losses) : 0.5;
      const team1Strength = team1WinRate + team1.pointsPerGame / 300;
      const team2Strength = team2WinRate + team2.pointsPerGame / 300;
      const threshold = team1Strength / (team1Strength + team2Strength);
      const actualWinnerId = this.seededRatio(index + team1.id + team2.id) < threshold ? team1.id : team2.id;
      const scores = this.simulateScore(team1, team2, index + 41);
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() - (200 - index));

      await prisma.historicalData.create({
        data: {
          team1Id: team1.id,
          team2Id: team2.id,
          matchDate,
          season: this.currentSeason,
          team1WinRate,
          team1AvgScore: team1.pointsPerGame || team1.pointsFor || 108,
          team1AvgConceded: team1.pointsAgainst || 108,
          team2WinRate,
          team2AvgScore: team2.pointsPerGame || team2.pointsFor || 108,
          team2AvgConceded: team2.pointsAgainst || 108,
          team1Form: this.makeForm(team1WinRate, index),
          team2Form: this.makeForm(team2WinRate, index + 3),
          headToHeadWins1: Math.round(this.seededRatio(index + 15) * 5),
          headToHeadWins2: Math.round(this.seededRatio(index + 22) * 5),
          actualWinnerId,
          actualScore1: scores.homeScore,
          actualScore2: scores.awayScore,
          pointDifference: Math.abs(scores.homeScore - scores.awayScore),
          usedForTraining: false,
        },
      });
    }
  }

  private async readCsv<T>(fileName: string): Promise<T[]> {
    const rows: T[] = [];
    const filePath = path.resolve(process.cwd(), 'data', fileName);

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: T) => rows.push(row))
        .on('end', () => resolve())
        .on('error', reject);
    });

    return rows;
  }

  private normalizePosition(position?: string) {
    if (!position) {
      return 'G';
    }

    const [primary] = position.split('-');
    return primary || position;
  }

  private getLatestPlayerRows(rows: PlayerPerGameRow[]) {
    const latestRowsByPlayer = new Map<string, PlayerPerGameRow>();

    for (const row of rows) {
      if (row.season !== this.currentSeason || row.lg !== 'NBA' || row.team === 'TOT') {
        continue;
      }

      const current = latestRowsByPlayer.get(row.player_id);
      if (!current || this.asFloat(row.mp_per_game) > this.asFloat(current.mp_per_game)) {
        latestRowsByPlayer.set(row.player_id, row);
      }
    }

    return latestRowsByPlayer;
  }

  private makeJerseyNumber(seed: string) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 98) + 1;
  }

  private makePlayerPhotoUrl(playerId: string) {
    return `https://www.basketball-reference.com/req/202106291/images/headshots/${playerId}.jpg`;
  }

  private makeForm(winRate: number, seed: number) {
    return Array.from({ length: 5 }, (_, index) =>
      this.seededRatio(seed + index) < winRate ? 'W' : 'L',
    ).join('');
  }

  private simulateScore(team1: { pointsPerGame: number; pointsAgainst: number }, team2: { pointsPerGame: number; pointsAgainst: number }, seed: number) {
    const homeBase = ((team1.pointsPerGame || 109) + (team2.pointsAgainst || 109)) / 2;
    const awayBase = ((team2.pointsPerGame || 109) + (team1.pointsAgainst || 109)) / 2;

    return {
      homeScore: Math.round(homeBase + this.seededRange(seed + 1, -9, 11)),
      awayScore: Math.round(awayBase + this.seededRange(seed + 7, -11, 9)),
    };
  }

  private seededRange(seed: number, min: number, max: number) {
    return min + this.seededRatio(seed) * (max - min);
  }

  private seededRatio(seed: number) {
    const raw = Math.sin(seed * 12.9898) * 43758.5453;
    return raw - Math.floor(raw);
  }

  private asInt(value?: string) {
    return Number.parseInt(value || '0', 10) || 0;
  }

  private asFloat(value?: string) {
    return Number.parseFloat(value || '0') || 0;
  }
}
