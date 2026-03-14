import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function trainFromHistory() {
  console.log('🤖 Начинаем обучение AI на исторических данных...');

  const historicalData = await prisma.historicalData.findMany({
    where: { usedForTraining: false },
    take: 5000
  });

  console.log(`📊 Найдено ${historicalData.length} матчей для обучения`);

  let correct = 0;
  let total = 0;

  for (const data of historicalData) {
    // Простая логика: побеждает команда с лучшим win rate
    const predictedWinner = data.team1WinRate > data.team2WinRate 
      ? data.team1Id 
      : data.team2Id;
    
    if (predictedWinner === data.actualWinnerId) {
      correct++;
    }
    total++;

    // Отмечаем как использованное
    await prisma.historicalData.update({
      where: { id: data.id },
      data: { usedForTraining: true }
    });
  }

  const accuracy = (correct / total * 100).toFixed(2);
  console.log(`\n🎯 Точность модели: ${accuracy}%`);
  console.log(`✅ Правильных предсказаний: ${correct} из ${total}`);
}

trainFromHistory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());