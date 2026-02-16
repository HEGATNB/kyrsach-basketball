import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface TeamTotal {
  Season: string;
  Team: string;
  Abbrev: string;
  G: string;      // Games
  W: string;      // Wins
  L: string;      // Losses
  'W/L%': string;
  Finish: string;
  'Playoffs': string;
  'Division': string;
  'Conference': string;
}

async function importMatches() {
  console.log('🏀 Начинаем импорт матчей и сезонов...');

  // Получаем все команды из БД для маппинга
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  teams.forEach(team => {
    // Пробуем найти по имени
    teamMap.set(team.name, team.id);
    // Также по аббревиатуре (нужно будет сопоставить)
  });

  console.log(`📋 Найдено ${teams.length} команд в БД`);

  const seasonStats: any[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../data/Team Totals.csv'))
      .pipe(csv())
      .on('data', (data: any) => seasonStats.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📊 Загружено ${seasonStats.length} записей сезонов`);

  let importedCount = 0;
  let skippedCount = 0;

  // Группируем по сезонам
  const seasons = new Map();
  
  for (const stat of seasonStats) {
    const teamName = stat.Team;
    const season = stat.Season;
    const teamId = teamMap.get(teamName);
    
    if (!teamId) {
      skippedCount++;
      continue;
    }

    if (!seasons.has(season)) {
      seasons.set(season, []);
    }
    seasons.get(season).push({
      teamId,
      teamName,
      wins: parseInt(stat.W) || 0,
      losses: parseInt(stat.L) || 0,
      games: parseInt(stat.G) || 0,
      winPct: parseFloat(stat['W/L%']) || 0,
      finish: stat.Finish,
      playoffs: stat.Playoffs === 'Y',
    });
  }

  console.log(`📅 Найдено ${seasons.size} сезонов`);

  // Создаем записи TeamStats
  for (const [season, teams_data] of seasons) {
    for (const team of teams_data) {
      try {
        await prisma.teamStats.upsert({
          where: {
            teamId_season: {
              teamId: team.teamId,
              season: season
            }
          },
          update: {
            wins: team.wins,
            losses: team.losses,
            winPct: team.winPct,
          },
          create: {
            teamId: team.teamId,
            season: season,
            wins: team.wins,
            losses: team.losses,
            winPct: team.winPct,
            pointsPerGame: 0,
            reboundsPerGame: 0,
            assistsPerGame: 0,
          }
        });
        importedCount++;
      } catch (error) {
        console.error(`❌ Ошибка при импорте сезона ${season} для команды ${team.teamName}:`, error);
      }
    }
  }

  console.log(`✅ Импортировано: ${importedCount} записей сезонов`);
  console.log(`⏭️ Пропущено: ${skippedCount} (команды не найдены в БД)`);
}

async function main() {
  try {
    await importMatches();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();