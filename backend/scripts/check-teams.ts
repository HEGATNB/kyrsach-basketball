import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

async function checkTeams() {
  console.log('🔍 Проверяем Team Abbrev.csv...');
  
  const teams: any[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../data/Team Abbrev.csv'))
      .pipe(csv())
      .on('data', (data: any) => teams.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Всего команд в файле: ${teams.length}`);
  
  // Покажем первые 5 записей
  console.log('\n📌 Примеры первых 5 команд:');
  for (let i = 0; i < Math.min(5, teams.length); i++) {
    console.log(teams[i]);
  }
  
  // Проверим, какие значения в поле Last Season
  const lastSeasons = new Set();
  teams.forEach(t => lastSeasons.add(t['Last Season']));
  console.log('\n📅 Уникальные значения Last Season:', Array.from(lastSeasons).slice(0, 10));
}

checkTeams().catch(console.error);