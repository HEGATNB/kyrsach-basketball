import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function debugImport() {
  console.log('🔍 Диагностика импорта...');

  // Проверяем команды в БД
  const teams = await prisma.team.findMany();
  console.log(`\n📋 Команды в БД (первые 5):`);
  teams.slice(0, 5).forEach(t => {
    console.log(`   ${t.name} (${t.abbrev}) - ID: ${t.id}`);
  });

  // Создаем map для быстрого поиска
  const teamMap = new Map();
  teams.forEach(team => {
    teamMap.set(team.name, team.id);
    teamMap.set(team.abbrev, team.id);
  });

  // Читаем CSV
  const teamData: any[] = [];
  const filePath = path.join(__dirname, '../data/Team Totals.csv');
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => teamData.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`\n📊 Всего записей в CSV: ${teamData.length}`);

  // Проверяем первые 5 записей CSV
  console.log(`\n📝 Первые 5 записей CSV:`);
  teamData.slice(0, 5).forEach((record, i) => {
    console.log(`\nЗапись ${i + 1}:`);
    console.log(`   Сезон: ${record.season}`);
    console.log(`   Команда: ${record.team}`);
    console.log(`   Аббревиатура: ${record.abbreviation}`);
    
    const teamId = teamMap.get(record.team) || teamMap.get(record.abbreviation);
    console.log(`   Найдена в БД: ${teamId ? '✅' : '❌'} (ID: ${teamId || 'не найдена'})`);
  });

  // Проверяем конкретные команды
  console.log(`\n🔍 Проверка конкретных команд:`);
  const testTeams = ['Atlanta Hawks', 'Boston Celtics', 'LA Lakers'];
  testTeams.forEach(name => {
    const id = teamMap.get(name);
    console.log(`   ${name}: ${id ? '✅' : '❌'} (ID: ${id || 'не найдена'})`);
  });

  // Проверяем существующие записи в HistoricalData
  const existingCount = await prisma.historicalData.count();
  console.log(`\n📊 Существующих записей в HistoricalData: ${existingCount}`);
}

debugImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());