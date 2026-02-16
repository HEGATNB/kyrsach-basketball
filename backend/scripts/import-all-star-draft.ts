import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importAllStarSelections() {
  console.log('⭐ Начинаем импорт All-Star выборов...');
  
  const selections: any[] = [];
  const filePath = path.join(__dirname, '../data/All-Star Selections.csv');
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => selections.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📊 Найдено ${selections.length} записей All-Star`);
  
  let imported = 0;
  let skipped = 0;

  for (const sel of selections) {
    try {
      // Проверяем, существует ли игрок в БД
      const player = await prisma.player.findFirst({
        where: { fullName: sel.player }
      });

      await prisma.allStarSelection.upsert({
        where: {
          playerId_season_type: {
            playerId: sel.player_id,
            season: sel.season,
            type: sel.type || 'all_nba'
          }
        },
        update: {},
        create: {
          season: sel.season,
          lg: sel.lg || 'NBA',
          type: sel.type || 'all_nba',
          numberTm: sel.number_tm ? parseInt(sel.number_tm) : null,
          position: sel.position,
          player: sel.player,
          playerId: sel.player_id,
          age: sel.age ? parseInt(sel.age) : null,
          ptsWon: sel.pts_won ? parseInt(sel.pts_won) : null,
          ptsMax: sel.pts_max ? parseInt(sel.pts_max) : null,
          share: sel.share ? parseFloat(sel.share) : null,
          x1stTm: sel.x1st_tm ? parseInt(sel.x1st_tm) : null,
          x2ndTm: sel.x2nd_tm ? parseInt(sel.x2nd_tm) : null,
          x3rdTm: sel.x3rd_tm ? parseInt(sel.x3rd_tm) : null,
          playerRef: player ? { connect: { id: player.id } } : undefined
        }
      });
      imported++;
      
      if (imported % 1000 === 0) {
        console.log(`✅ Импортировано ${imported} записей...`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при импорте ${sel.player}:`, error);
      skipped++;
    }
  }

  console.log(`\n🎉 All-Star импорт завершен!`);
  console.log(`✅ Импортировано: ${imported}`);
  console.log(`⏭️ Пропущено: ${skipped}`);
}

async function importDraftHistory() {
  console.log('\n🏀 Начинаем импорт истории драфтов...');
  
  const drafts: any[] = [];
  const filePath = path.join(__dirname, '../data/Draft Pick History.csv');
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => drafts.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📊 Найдено ${drafts.length} драфт-пиков`);
  
  let imported = 0;
  let skipped = 0;

  for (const pick of drafts) {
    try {
      const player = await prisma.player.findFirst({
        where: { fullName: pick.player }
      });

      await prisma.draftPick.upsert({
        where: {
          playerId_season: {
            playerId: pick.player_id,
            season: pick.season
          }
        },
        update: {},
        create: {
          season: pick.season,
          lg: pick.lg || 'NBA',
          overallPick: parseInt(pick.overall_pick) || 0,
          round: parseInt(pick.round) || 0,
          tm: pick.tm,
          player: pick.player,
          playerId: pick.player_id,
          college: pick.college,
          playerRef: player ? { connect: { id: player.id } } : undefined
        }
      });
      imported++;
      
      if (imported % 1000 === 0) {
        console.log(`✅ Импортировано ${imported} пиков...`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при импорте ${pick.player}:`, error);
      skipped++;
    }
  }

  console.log(`\n🎉 Драфт импорт завершен!`);
  console.log(`✅ Импортировано: ${imported}`);
  console.log(`⏭️ Пропущено: ${skipped}`);
}

async function analyzeStarPower() {
  console.log('\n🔍 Анализ звездной силы...');

  const allStars = await prisma.allStarSelection.groupBy({
    by: ['playerId'],
    _count: true,
    orderBy: {
      _count: {
        playerId: 'desc'
      }
    },
    take: 20
  });

  console.log('🏆 Топ-20 игроков по количеству All-Star выборов:');
  
  for (const star of allStars) {
    const player = await prisma.player.findFirst({
      where: { fullName: star.playerId }
    });
    console.log(`   ${player?.fullName}: ${star._count} раз`);
  }
}

async function main() {
  try {
    await importAllStarSelections();
    await importDraftHistory();
    await analyzeStarPower();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();