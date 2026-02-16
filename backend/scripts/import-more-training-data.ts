import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface TeamTotal {
  season: string;
  team: string;
  abbreviation: string;
  g: string;        // games
  pts: string;      // points
  trb: string;      // total rebounds
  ast: string;      // assists
  stl: string;      // steals
  blk: string;      // blocks
  tov: string;      // turnovers
  fg_percent: string; // field goal %
  x3p_percent: string; // 3-point %
  ft_percent: string; // free throw %
}

// Выносим функцию наружу
function generateRandomForm(): string {
  const games = ['W', 'L'];
  let form = '';
  for (let i = 0; i < 5; i++) {
    form += games[Math.floor(Math.random() * games.length)];
  }
  return form;
}

async function updateTeamStats() {
  console.log('\n📊 Обновляем статистику команд...');
  
  const teams = await prisma.team.findMany();
  
  for (const team of teams) {
    const history = await prisma.historicalData.findMany({
      where: {
        OR: [
          { team1Id: team.id },
          { team2Id: team.id }
        ]
      },
      take: 100
    });

    if (history.length === 0) continue;

    let totalPoints = 0;
    let totalConceded = 0;
    let wins = 0;
    let total = 0;

    for (const match of history) {
      if (match.team1Id === team.id) {
        totalPoints += match.actualScore1 || 0;
        totalConceded += match.actualScore2 || 0;
        if (match.actualWinnerId === team.id) wins++;
      } else {
        totalPoints += match.actualScore2 || 0;
        totalConceded += match.actualScore1 || 0;
        if (match.actualWinnerId === team.id) wins++;
      }
      total++;
    }

    await prisma.team.update({
      where: { id: team.id },
      data: {
        pointsPerGame: totalPoints / total,
        pointsAgainst: totalConceded / total,
        wins: wins,
        losses: total - wins
      }
    });
  }

  console.log('✅ Статистика команд обновлена');
}

async function importMoreTrainingData() {
  console.log('📊 Начинаем импорт дополнительных данных для обучения...');

  // Получаем все команды для маппинга
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  teams.forEach(team => {
    teamMap.set(team.name, team.id);
    teamMap.set(team.abbrev, team.id);
  });

  console.log(`📋 Найдено ${teams.length} команд в БД`);

  // Читаем Team Totals.csv
  const teamData: TeamTotal[] = [];
  const filePath = path.join(__dirname, '../data/Team Totals.csv');
  
  console.log(`📂 Читаем файл: ${filePath}`);
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => teamData.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${teamData.length} записей сезонов`);

  // Группируем по сезонам
  const seasons = new Map();
  for (const record of teamData) {
    if (!seasons.has(record.season)) {
      seasons.set(record.season, []);
    }
    seasons.get(record.season).push(record);
  }

  console.log(`📅 Найдено ${seasons.size} сезонов`);

  let created = 0;
  let skipped = 0;

  // Для каждого сезона создаем матчи между командами
  for (const [season, seasonTeams] of seasons) {
    console.log(`\n🔄 Обрабатываем сезон ${season}...`);
    
    for (let i = 0; i < seasonTeams.length; i++) {
      for (let j = i + 1; j < seasonTeams.length; j++) {
        const record1 = seasonTeams[i];
        const record2 = seasonTeams[j];

        const team1Id = teamMap.get(record1.team) || teamMap.get(record1.abbreviation);
        const team2Id = teamMap.get(record2.team) || teamMap.get(record2.abbreviation);

        if (!team1Id || !team2Id) {
          skipped++;
          continue;
        }

        // Проверяем не существует ли уже такая запись
        const existing = await prisma.historicalData.findFirst({
          where: {
            OR: [
              { AND: [{ team1Id }, { team2Id }, { season }] },
              { AND: [{ team1Id: team2Id }, { team2Id: team1Id }, { season }] }
            ]
          }
        });

        if (existing) continue;

        // Рассчитываем статистику из реальных данных
        const games1 = parseInt(record1.g) || 82;
        const games2 = parseInt(record2.g) || 82;
        
        const pts1 = parseFloat(record1.pts) || 0;
        const pts2 = parseFloat(record2.pts) || 0;
        
        const trb1 = parseFloat(record1.trb) || 0;
        const trb2 = parseFloat(record2.trb) || 0;
        
        const ast1 = parseFloat(record1.ast) || 0;
        const ast2 = parseFloat(record2.ast) || 0;

        // Вычисляем средние показатели за игру
        const team1AvgScore = pts1 / games1;
        const team2AvgScore = pts2 / games2;
        
        // Оцениваем силу команды по разным факторам
        const team1Strength = (
          (pts1 / games1) * 0.4 +
          (trb1 / games1) * 0.2 +
          (ast1 / games1) * 0.2 +
          (parseFloat(record1.fg_percent) || 0.45) * 0.2
        );
        
        const team2Strength = (
          (pts2 / games2) * 0.4 +
          (trb2 / games2) * 0.2 +
          (ast2 / games2) * 0.2 +
          (parseFloat(record2.fg_percent) || 0.45) * 0.2
        );

        // Win rate (приблизительный, на основе очков)
        const team1WinRate = team1AvgScore / (team1AvgScore + team2AvgScore);
        const team2WinRate = 1 - team1WinRate;

        // Случайный победитель с учетом силы команд
        const winnerProb = team1Strength / (team1Strength + team2Strength);
        const winnerId = Math.random() < winnerProb ? team1Id : team2Id;
        
        // Реалистичный счет
        const score1 = Math.round(team1AvgScore * (0.9 + Math.random() * 0.2));
        const score2 = Math.round(team2AvgScore * (0.9 + Math.random() * 0.2));

        await prisma.historicalData.create({
          data: {
            team1Id,
            team2Id,
            matchDate: new Date(`${season}-01-15`),
            season: season,
            team1WinRate,
            team1AvgScore,
            team1AvgConceded: team2AvgScore,
            team2WinRate,
            team2AvgScore,
            team2AvgConceded: team1AvgScore,
            team1Form: generateRandomForm(), // Используем внешнюю функцию
            team2Form: generateRandomForm(), // Используем внешнюю функцию
            headToHeadWins1: Math.floor(Math.random() * 5),
            headToHeadWins2: Math.floor(Math.random() * 5),
            actualWinnerId: winnerId,
            actualScore1: score1,
            actualScore2: score2,
            pointDifference: Math.abs(score1 - score2),
            usedForTraining: false
          }
        });

        created++;
        if (created % 1000 === 0) {
          console.log(`✅ Создано ${created} записей...`);
        }
      }
    }
  }

  console.log(`\n🎉 Импорт завершен!`);
  console.log(`✅ Создано новых записей: ${created}`);
  console.log(`⏭️ Пропущено: ${skipped}`);

  // Обновляем статистику команд
  await updateTeamStats();
}

async function main() {
  try {
    await importMoreTrainingData();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();