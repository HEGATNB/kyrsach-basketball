import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function trainAIModel() {
  console.log('🤖 Начинаем обучение AI-модели...');

  // Получаем все исторические данные для обучения
  const trainingData = await prisma.historicalData.findMany({
    where: { usedForTraining: false },
    take: 10000 // Ограничим для начала
  });

  console.log(`📊 Найдено ${trainingData.length} записей для обучения`);

  // Анализируем данные
  let correctPredictions = 0;
  let totalPredictions = 0;

  for (const data of trainingData) {
    // Простая эвристика: побеждает команда с лучшим win rate
    const predictedWinner = data.team1WinRate > data.team2WinRate 
      ? data.team1Id 
      : data.team2Id;
    
    if (predictedWinner === data.actualWinnerId) {
      correctPredictions++;
    }
    totalPredictions++;

    // Отмечаем данные как использованные для обучения
    await prisma.historicalData.update({
      where: { id: data.id },
      data: { usedForTraining: true }
    });
  }

  const accuracy = (correctPredictions / totalPredictions * 100).toFixed(2);
  console.log(`\n🎯 Точность простой модели: ${accuracy}%`);
  console.log(`✅ Правильных предсказаний: ${correctPredictions} из ${totalPredictions}`);
}

async function main() {
  try {
    await trainAIModel();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();