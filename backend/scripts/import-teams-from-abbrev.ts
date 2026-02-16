import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface TeamAbbrev {
  season: string;
  lg: string;
  team: string;
  abbreviation: string;
  playoffs: string;
}

async function importTeams() {
  console.log('🏀 Начинаем импорт команд NBA...');

  // Сначала создаем конференции
  const east = await prisma.conference.upsert({
    where: { name: 'Eastern' },
    update: {},
    create: { name: 'Eastern', shortName: 'East' }
  });

  const west = await prisma.conference.upsert({
    where: { name: 'Western' },
    update: {},
    create: { name: 'Western', shortName: 'West' }
  });

  // Создаем дивизионы
  const divisions = [
    { name: 'Atlantic', conf: east },
    { name: 'Central', conf: east },
    { name: 'Southeast', conf: east },
    { name: 'Northwest', conf: west },
    { name: 'Pacific', conf: west },
    { name: 'Southwest', conf: west },
  ];

  for (const d of divisions) {
    await prisma.division.upsert({
      where: { name: d.name },
      update: {},
      create: {
        name: d.name,
        conferenceId: d.conf.id
      }
    });
  }

  // Читаем Team Abbrev.csv
  const teams: TeamAbbrev[] = [];
  const filePath = path.join(__dirname, '../data/Team Abbrev.csv');
  
  console.log(`📂 Читаем файл: ${filePath}`);
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => teams.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${teams.length} записей в файле`);

  // Создаем Set для уникальных команд (один сезон = одна команда)
  const uniqueTeams = new Map();
  
  for (const team of teams) {
    if (!uniqueTeams.has(team.team)) {
      uniqueTeams.set(team.team, team);
    }
  }

  console.log(`📋 Уникальных команд: ${uniqueTeams.size}`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const [teamName, teamData] of uniqueTeams) {
    try {
      const abbrev = teamData.abbreviation;
      
      // Определяем конференцию по аббревиатуре
      const eastTeams = ['ATL', 'BOS', 'BRK', 'CHI', 'CHO', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 
                         'NYK', 'ORL', 'PHI', 'TOR', 'WAS'];
      const conf = eastTeams.includes(abbrev) ? east : west;
      
      // Определяем дивизион
      let divisionName = '';
      
      if (['BOS', 'BRK', 'NYK', 'PHI', 'TOR'].includes(abbrev)) {
        divisionName = 'Atlantic';
      } else if (['CHI', 'CLE', 'DET', 'IND', 'MIL'].includes(abbrev)) {
        divisionName = 'Central';
      } else if (['ATL', 'CHO', 'MIA', 'ORL', 'WAS'].includes(abbrev)) {
        divisionName = 'Southeast';
      } else if (['DEN', 'MIN', 'OKC', 'POR', 'UTA'].includes(abbrev)) {
        divisionName = 'Northwest';
      } else if (['GSW', 'LAC', 'LAL', 'PHX', 'SAC'].includes(abbrev)) {
        divisionName = 'Pacific';
      } else if (['DAL', 'HOU', 'MEM', 'NOP', 'SAS'].includes(abbrev)) {
        divisionName = 'Southwest';
      } else {
        console.log(`⚠️ Неизвестная команда: ${teamName} (${abbrev})`);
        skippedCount++;
        continue;
      }

      const division = await prisma.division.findFirst({
        where: { name: divisionName }
      });

      if (!division) {
        console.log(`⚠️ Дивизион не найден: ${divisionName}`);
        skippedCount++;
        continue;
      }

      // Создаем команду
      await prisma.team.upsert({
        where: { name: teamName },
        update: {},
        create: {
          name: teamName,
          abbrev: abbrev,
          fullName: teamName,
          nickname: teamName.split(' ').pop() || '',
          city: teamName.split(' ')[0] || 'Unknown',
          arena: `${teamName} Arena`,
          foundedYear: 1946, // Примерный год, можно уточнить позже
          conferenceId: conf.id,
          divisionId: division.id,
          championships: 0,
          seasonWins: 0,
          seasonLosses: 0,
          pointsPerGame: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0
        }
      });
      
      importedCount++;
      console.log(`✅ Добавлена команда: ${teamName} (${abbrev})`);
    } catch (error) {
      console.error(`❌ Ошибка при добавлении ${teamName}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n🎉 Импорт завершен!`);
  console.log(`✅ Добавлено: ${importedCount} команд`);
  console.log(`⚠️ Пропущено: ${skippedCount} команд`);
}

async function main() {
  try {
    await importTeams();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();