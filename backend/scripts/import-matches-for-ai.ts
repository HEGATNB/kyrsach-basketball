import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface TeamTotal {
  season: string;
  lg: string;
  team: string;
  abbreviation: string;
  g: string;        // games
  w: string;        // wins
  l: string;        // losses
  wl_pct: string;   // win loss percentage
  finish: string;
  playoffs: string;
  pace: string;
  ortg: string;     // offensive rating
  drtg: string;     // defensive rating
  srs: string;      // simple rating system
}

async function importMatchesForAI() {
  console.log('🏀 Начинаем импорт исторических матчей для AI...');

  // Получаем все команды для маппинга
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  teams.forEach(team => {
    teamMap.set(team.name, team.id);
    teamMap.set(team.abbrev, team.id);
  });

  console.log(`📋 Найдено ${teams.length} команд в БД`);

  // Читаем Team Totals.csv
  const teamStats: TeamTotal[] = [];
  const filePath = path.join(__dirname, '../data/Team Totals.csv');
  
  console.log(`📂 Читаем файл: ${filePath}`);
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => teamStats.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${teamStats.length} записей сезонов`);

  // Группируем по сезонам
  const seasons = new Map();
  
  for (const stat of teamStats) {
    const season = stat.season;
    if (!seasons.has(season)) {
      seasons.set(season, []);
    }
    seasons.get(season).push(stat);
  }

  console.log(`📅 Найдено ${seasons.size} сезонов`);

  let matchesCreated = 0;
  let matchesSkipped = 0;

  // Для каждого сезона создаем матчи между командами
  for (const [season, seasonTeams] of seasons) {
    console.log(`\n🔄 Обрабатываем сезон ${season}...`);
    
    // Создаем пары команд для матчей
    for (let i = 0; i < seasonTeams.length; i++) {
      for (let j = i + 1; j < seasonTeams.length; j++) {
        const team1 = seasonTeams[i];
        const team2 = seasonTeams[j];
        
        // Проверяем что обе команды есть в нашей БД
        const team1Id = teamMap.get(team1.team) || teamMap.get(team1.abbreviation);
        const team2Id = teamMap.get(team2.team) || teamMap.get(team2.abbreviation);
        
        if (!team1Id || !team2Id) {
          matchesSkipped++;
          continue;
        }

        try {
          // Создаем исторические данные для AI
          const team1WinRate = parseFloat(team1.w) / parseFloat(team1.g) || 0.5;
          const team2WinRate = parseFloat(team2.w) / parseFloat(team2.g) || 0.5;
          
          const team1AvgScore = parseFloat(team1.ortg) || 100;
          const team2AvgScore = parseFloat(team2.ortg) || 100;
          
          const team1AvgConceded = parseFloat(team1.drtg) || 100;
          const team2AvgConceded = parseFloat(team2.drtg) || 100;

          // Случайный результат (позже можно заменить на реальные данные)
          const winnerId = Math.random() > 0.5 ? team1Id : team2Id;
          const score1 = Math.floor(95 + Math.random() * 20);
          const score2 = Math.floor(95 + Math.random() * 20);

          // Сохраняем в HistoricalData
          await prisma.historicalData.create({
            data: {
              team1Id,
              team2Id,
              matchDate: new Date(`${season}-01-01`),
              season,
              
              team1WinRate,
              team1AvgScore,
              team1AvgConceded,
              
              team2WinRate,
              team2AvgScore,
              team2AvgConceded,
              
              team1Form: 'WWLWW', // Позже можно вычислить реальную форму
              team2Form: 'WLWWL',
              
              headToHeadWins1: Math.floor(Math.random() * 5),
              headToHeadWins2: Math.floor(Math.random() * 5),
              
              actualWinnerId: winnerId,
              actualScore1: score1,
              actualScore2: score2,
              pointDifference: Math.abs(score1 - score2),
              
              usedForTraining: false
            }
          });

          matchesCreated++;
          
          if (matchesCreated % 100 === 0) {
            console.log(`✅ Создано ${matchesCreated} исторических матчей...`);
          }
        } catch (error) {
          console.error(`❌ Ошибка при создании матча ${team1.team} vs ${team2.team}:`, error);
          matchesSkipped++;
        }
      }
    }
  }

  console.log(`\n🎉 Импорт исторических матчей завершен!`);
  console.log(`✅ Создано матчей: ${matchesCreated}`);
  console.log(`⏭️ Пропущено: ${matchesSkipped}`);
}

async function main() {
  try {
    await importMatchesForAI();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();