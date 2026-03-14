import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestMatches() {
  console.log('🏀 Создаем тестовые матчи...');

  // Получаем все команды
  const teams = await prisma.team.findMany();
  
  if (teams.length < 2) {
    console.log('❌ Недостаточно команд в базе');
    return;
  }

  // Создаем 10 тестовых матчей
  for (let i = 0; i < 10; i++) {
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam;
    do {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    } while (awayTeam.id === homeTeam.id);

    const date = new Date();
    date.setDate(date.getDate() + (i - 5)); // 5 прошедших, 5 будущих

    const status = i < 5 ? 'finished' : 'scheduled';
    const homeScore = status === 'finished' ? Math.floor(100 + Math.random() * 30) : null;
    const awayScore = status === 'finished' ? Math.floor(100 + Math.random() * 30) : null;

    // Находим админа для createdById
    const admin = await prisma.user.findFirst({
      where: { roleId: 1 }
    });

    await prisma.match.create({
      data: {
        date,
        status,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore,
        awayScore,
        createdById: admin?.id || 1
      }
    });

    console.log(`✅ Матч создан: ${homeTeam.name} vs ${awayTeam.name} (${status})`);
  }

  console.log('🎉 Тестовые матчи созданы!');
}

createTestMatches()
  .catch(console.error)
  .finally(() => prisma.$disconnect());