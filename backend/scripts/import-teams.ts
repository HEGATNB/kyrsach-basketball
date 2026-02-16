import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface TeamAbbrev {
  Team: string;
  Abbrev: string;
  'First Season': string;
  'Last Season': string;
}

async function importTeams() {
  console.log('🏀 Начинаем импорт команд NBA...');

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

  const divisionsData = [
    { name: 'Atlantic', conf: east },
    { name: 'Central', conf: east },
    { name: 'Southeast', conf: east },
    { name: 'Northwest', conf: west },
    { name: 'Pacific', conf: west },
    { name: 'Southwest', conf: west },
  ];

  for (const d of divisionsData) {
    await prisma.division.upsert({
      where: { name: d.name },
      update: {},
      create: {
        name: d.name,
        conferenceId: d.conf.id
      }
    });
  }

  const teams: TeamAbbrev[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../data/Team Abbrev.csv'))
      .pipe(csv())
      .on('data', (data: any) => teams.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${teams.length} команд`);

  let importedCount = 0;

  for (const team of teams) {
    if (team['Last Season'] !== '2025') continue;

    let divisionName = '';
    const conf = determineConference(team.Abbrev);
    const confObj = conf === 'East' ? east : west;
    
    if (['BOS', 'BRK', 'NYK', 'PHI', 'TOR'].includes(team.Abbrev)) {
      divisionName = 'Atlantic';
    } else if (['CHI', 'CLE', 'DET', 'IND', 'MIL'].includes(team.Abbrev)) {
      divisionName = 'Central';
    } else if (['ATL', 'CHA', 'MIA', 'ORL', 'WAS'].includes(team.Abbrev)) {
      divisionName = 'Southeast';
    } else if (['DEN', 'MIN', 'OKC', 'POR', 'UTA'].includes(team.Abbrev)) {
      divisionName = 'Northwest';
    } else if (['GSW', 'LAC', 'LAL', 'PHX', 'SAC'].includes(team.Abbrev)) {
      divisionName = 'Pacific';
    } else if (['DAL', 'HOU', 'MEM', 'NOP', 'SAS'].includes(team.Abbrev)) {
      divisionName = 'Southwest';
    } else {
      continue;
    }

    const division = await prisma.division.findFirst({
      where: { name: divisionName }
    });

    if (!division) continue;

    try {
      await prisma.team.upsert({
        where: { name: team.Team },
        update: {
          conferenceId: confObj.id,
          divisionId: division.id,
        },
        create: {
          name: team.Team,
          fullName: team.Team,
          nickname: team.Team.split(' ').pop() || '',
          city: team.Team.split(' ')[0] || 'Unknown',
          arena: `${team.Team} Arena`,
          foundedYear: parseInt(team['First Season']) || 1946,
          conferenceId: confObj.id,
          divisionId: division.id,
          championships: 0,
          seasonWins: 0,
          seasonLosses: 0,
          pointsPerGame: 0,
          pointsAgainst: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0
        }
      });
      
      importedCount++;
      console.log(`✅ Добавлена команда: ${team.Team} (${team.Abbrev})`);
    } catch (error) {
      console.error(`❌ Ошибка при добавлении ${team.Team}:`, error);
    }
  }

  console.log(`🎉 Импорт завершен! Добавлено ${importedCount} команд`);
}

function determineConference(abbrev: string): string {
  const eastTeams = ['BOS', 'BRK', 'NYK', 'PHI', 'TOR', 'CHI', 'CLE', 'DET', 'IND', 'MIL', 
                     'ATL', 'CHA', 'MIA', 'ORL', 'WAS'];
  return eastTeams.includes(abbrev) ? 'East' : 'West';
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