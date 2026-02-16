import { prisma } from '../index';

export interface PredictionResult {
  probabilityTeam1: number;
  probabilityTeam2: number;
  expectedScoreTeam1: number;
  expectedScoreTeam2: number;
  confidence: number;
  factors: {
    winRate: number;
    homeAdvantage: number;
    recentForm: number;
    headToHead: number;
    offensiveStrength: number;
    defensiveStrength: number;
    paceAdvantage: number;
  };
  modelVersion: string;
  trainingDataPoints: number;
}

export interface ModelWeights {
  winRate: number;
  homeAdvantage: number;
  recentForm: number;
  headToHead: number;
  offensiveStrength: number;
  defensiveStrength: number;
  paceAdvantage: number;
}

export class AIService {
  
  private weights: ModelWeights = {
    winRate: 0.25,
    homeAdvantage: 0.15,
    recentForm: 0.20,
    headToHead: 0.15,
    offensiveStrength: 0.10,
    defensiveStrength: 0.10,
    paceAdvantage: 0.05
  };

  private totalTrainingData: number = 0;
  private modelAccuracy: number = 0;

  // ========== ПУБЛИЧНЫЕ МЕТОДЫ ==========

  // Получить историю прогнозов пользователя
  async getUserPredictions(userId: number) {
    return prisma.prediction.findMany({
      where: { userId },
      include: {
        team1: true,
        team2: true,
        match: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Получить прогноз по ID
  async getPredictionById(id: string) {
    return prisma.prediction.findUnique({
      where: { id },
      include: {
        team1: true,
        team2: true,
        match: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  // Оценить точность модели
  async evaluateModel() {
    const testData = await prisma.historicalData.findMany({
      where: { usedForTraining: false },
      take: 100,
      orderBy: { matchDate: 'desc' }
    });

    if (testData.length === 0) {
      console.log('❌ Нет данных для оценки');
      return null;
    }

    let correct = 0;
    for (const data of testData) {
      // Простая эвристика для оценки
      const predictedWinner = data.team1WinRate > data.team2WinRate 
        ? data.team1Id 
        : data.team2Id;
      
      if (predictedWinner === data.actualWinnerId) {
        correct++;
      }
    }

    this.modelAccuracy = correct / testData.length;
    console.log(`🎯 Точность модели: ${(this.modelAccuracy * 100).toFixed(2)}% на ${testData.length} тестах`);
    
    return this.modelAccuracy;
  }

  // Получить общее количество прогнозов
  async getTotalPredictions(): Promise<number> {
    return prisma.prediction.count();
  }

  // Получить общее количество обучающих данных
  async getTotalTrainingData(): Promise<number> {
    return prisma.historicalData.count();
  }

  // ========== МЕТОДЫ ПРОГНОЗИРОВАНИЯ ==========

  async predictMatch(team1Id: number, team2Id: number, userId: number): Promise<PredictionResult & { id: string }> {
  console.log(`🤖 AI预测: Команда ${team1Id} vs Команда ${team2Id}`);
  
  const [team1, team2, team1History, team2History, headToHead, team1Recent, team2Recent] = await Promise.all([
    prisma.team.findUnique({ where: { id: team1Id } }),
    prisma.team.findUnique({ where: { id: team2Id } }),
    this.getTeamHistory(team1Id, 100),
    this.getTeamHistory(team2Id, 100),
    this.getHeadToHead(team1Id, team2Id, 20),
    this.getRecentMatches(team1Id, 10),
    this.getRecentMatches(team2Id, 10)
  ]);

  if (!team1 || !team2) {
    throw new Error('Команда не найдена');
  }

  const factors = await this.calculateAllFactors(
    team1, team2,
    team1History, team2History,
    headToHead,
    team1Recent, team2Recent
  );

  let prob1 = 0;
  for (const [key, value] of Object.entries(factors)) {
    prob1 += value * this.weights[key as keyof ModelWeights];
  }

  prob1 = Math.min(0.95, Math.max(0.05, prob1));
  const prob2 = 1 - prob1;

  const expectedScore = await this.predictScore(
    team1, team2,
    prob1,
    team1Recent, team2Recent,
    factors
  );

  const confidence = this.calculateConfidence(
    team1History.length + team2History.length,
    headToHead.length,
    team1Recent.length + team2Recent.length
  );

  const result = {
    probabilityTeam1: Number((prob1 * 100).toFixed(1)),
    probabilityTeam2: Number((prob2 * 100).toFixed(1)),
    expectedScoreTeam1: expectedScore.team1,
    expectedScoreTeam2: expectedScore.team2,
    confidence: Number(confidence.toFixed(2)),
    factors,
    modelVersion: 'v3.0-ml-enhanced',
    trainingDataPoints: this.totalTrainingData
  };

  // Сохраняем прогноз и ПОЛУЧАЕМ его с ID
  const savedPrediction = await this.savePrediction(team1Id, team2Id, result, userId);

  // Возвращаем результат ВМЕСТЕ С ID
  return {
    ...result,
    id: savedPrediction.id  // 👈 ВАЖНО: добавляем ID!
  };
  }

  // Обучить на реальном результате
  async trainOnActualResult(matchId: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match || match.status !== 'finished' || !match.homeScore || !match.awayScore) {
      throw new Error('Матч не завершен или нет счета');
    }

    await prisma.historicalData.create({
      data: {
        team1Id: match.homeTeamId,
        team2Id: match.awayTeamId,
        matchDate: match.date,
        season: new Date().getFullYear().toString(),
        team1WinRate: match.homeTeam.wins / (match.homeTeam.wins + match.homeTeam.losses),
        team1AvgScore: match.homeTeam.pointsPerGame,
        team1AvgConceded: match.homeTeam.pointsAgainst,
        team2WinRate: match.awayTeam.wins / (match.awayTeam.wins + match.awayTeam.losses),
        team2AvgScore: match.awayTeam.pointsPerGame,
        team2AvgConceded: match.awayTeam.pointsAgainst,
        actualWinnerId: match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId,
        actualScore1: match.homeScore,
        actualScore2: match.awayScore,
        pointDifference: Math.abs(match.homeScore - match.awayScore),
        usedForTraining: false
      }
    });

    this.totalTrainingData++;
    console.log(`✅ Модель обучена на матче ${match.homeTeam.name} vs ${match.awayTeam.name}`);
  }

  // ========== ПРИВАТНЫЕ МЕТОДЫ ==========

  private async getTeamHistory(teamId: number, limit: number = 100) {
    return prisma.historicalData.findMany({
      where: {
        OR: [
          { team1Id: teamId },
          { team2Id: teamId }
        ]
      },
      orderBy: { matchDate: 'desc' },
      take: limit
    });
  }

  private async getRecentMatches(teamId: number, limit: number = 10) {
    return prisma.historicalData.findMany({
      where: {
        OR: [
          { team1Id: teamId },
          { team2Id: teamId }
        ]
      },
      orderBy: { matchDate: 'desc' },
      take: limit
    });
  }

  private async getHeadToHead(team1Id: number, team2Id: number, limit: number = 20) {
    return prisma.historicalData.findMany({
      where: {
        OR: [
          { AND: [{ team1Id }, { team2Id }] },
          { AND: [{ team1Id: team2Id }, { team2Id: team1Id }] }
        ]
      },
      orderBy: { matchDate: 'desc' },
      take: limit
    });
  }

  private calculateHistoricalWinRate(teamId: number, history: any[]) {
    if (history.length === 0) return 0.5;

    let wins = 0;
    let total = 0;

    for (const match of history) {
      if (match.team1Id === teamId || match.team2Id === teamId) {
        total++;
        if (match.actualWinnerId === teamId) wins++;
      }
    }

    return total > 0 ? wins / total : 0.5;
  }

  private calculateHeadToHeadFactor(headToHead: any[], team1Id: number) {
    if (headToHead.length === 0) return 0.5;

    let team1Wins = 0;
    for (const match of headToHead) {
      if (match.actualWinnerId === team1Id) team1Wins++;
    }

    return team1Wins / headToHead.length;
  }

  private async calculateAllFactors(
    team1: any, team2: any,
    team1History: any[], team2History: any[],
    headToHead: any[],
    team1Recent: any[], team2Recent: any[]
  ) {
    const team1WinRate = this.calculateHistoricalWinRate(team1.id, team1History);
    const team2WinRate = this.calculateHistoricalWinRate(team2.id, team2History);
    const winRateFactor = team1WinRate / (team1WinRate + team2WinRate);

    const homeAdvantage = 0.55;
    const recentFormFactor = this.calculateRecentFormFactor(team1Recent, team2Recent, team1.id);
    const headToHeadFactor = this.calculateHeadToHeadFactor(headToHead, team1.id);
    const offensiveFactor = this.calculateOffensiveFactor(team1, team2, team1Recent, team2Recent);
    const defensiveFactor = this.calculateDefensiveFactor(team1, team2, team1Recent, team2Recent);
    const paceFactor = this.calculatePaceFactor(team1Recent, team2Recent);

    return {
      winRate: winRateFactor,
      homeAdvantage,
      recentForm: recentFormFactor,
      headToHead: headToHeadFactor,
      offensiveStrength: offensiveFactor,
      defensiveStrength: defensiveFactor,
      paceAdvantage: paceFactor
    };
  }

  private calculateRecentFormFactor(team1Recent: any[], team2Recent: any[], team1Id: number) {
    const getWeightedForm = (matches: any[], teamId: number) => {
      if (matches.length === 0) return 0.5;
      
      let totalWeight = 0;
      let weightedWins = 0;
      
      matches.forEach((match, index) => {
        const weight = 1 - (index * 0.1);
        totalWeight += weight;
        
        const isTeam1 = match.team1Id === teamId;
        const teamScore = isTeam1 ? match.actualScore1 : match.actualScore2;
        const opponentScore = isTeam1 ? match.actualScore2 : match.actualScore1;
        
        if (teamScore > opponentScore) {
          weightedWins += weight;
        }
      });
      
      return weightedWins / totalWeight;
    };

    const team1Form = getWeightedForm(team1Recent, team1Id);
    const team2Form = getWeightedForm(team2Recent, team1Id === team1Recent[0]?.team1Id ? team1Recent[0]?.team2Id : team1Recent[0]?.team1Id);

    return team1Form / (team1Form + team2Form);
  }

  private calculateOffensiveFactor(team1: any, team2: any, team1Recent: any[], team2Recent: any[]) {
    const getAvgOffense = (team: any, recent: any[], isTeam1: boolean) => {
      if (recent.length === 0) return team.pointsPerGame || 105;
      
      const recentAvg = recent.reduce((sum, match) => {
        return sum + (isTeam1 ? match.actualScore1 : match.actualScore2);
      }, 0) / recent.length;
      
      return (team.pointsPerGame * 0.7 + recentAvg * 0.3);
    };

    const team1Offense = getAvgOffense(team1, team1Recent, true);
    const team2Offense = getAvgOffense(team2, team2Recent, false);

    return team1Offense / (team1Offense + team2Offense);
  }

  private calculateDefensiveFactor(team1: any, team2: any, team1Recent: any[], team2Recent: any[]) {
    const getAvgDefense = (team: any, recent: any[], isTeam1: boolean) => {
      if (recent.length === 0) return team.pointsAgainst || 105;
      
      const recentAvg = recent.reduce((sum, match) => {
        return sum + (isTeam1 ? match.actualScore2 : match.actualScore1);
      }, 0) / recent.length;
      
      return (team.pointsAgainst * 0.7 + recentAvg * 0.3);
    };

    const team1Defense = getAvgDefense(team1, team1Recent, true);
    const team2Defense = getAvgDefense(team2, team2Recent, false);

    return (1 / team1Defense) / ((1 / team1Defense) + (1 / team2Defense));
  }

  private calculatePaceFactor(team1Recent: any[], team2Recent: any[]) {
    const getAvgPace = (recent: any[]) => {
      if (recent.length === 0) return 100;
      
      return recent.reduce((sum, match) => {
        return sum + (match.actualScore1 + match.actualScore2);
      }, 0) / recent.length;
    };

    const pace1 = getAvgPace(team1Recent);
    const pace2 = getAvgPace(team2Recent);

    return pace1 / (pace1 + pace2);
  }

  private async predictScore(
    team1: any, team2: any,
    prob1: number,
    team1Recent: any[], team2Recent: any[],
    factors: any
  ) {
    const leagueAvg = 110;
    
    let score1 = leagueAvg * prob1;
    let score2 = leagueAvg * (1 - prob1);
    
    if (team1Recent.length > 0) {
      const recentAvg1 = team1Recent.reduce((sum, m) => sum + m.actualScore1, 0) / team1Recent.length;
      const recentAvg2 = team2Recent.reduce((sum, m) => sum + m.actualScore2, 0) / team2Recent.length;
      
      score1 = score1 * 0.6 + recentAvg1 * 0.4;
      score2 = score2 * 0.6 + recentAvg2 * 0.4;
    }
    
    score1 *= (1 + (factors.offensiveStrength - 0.5) * 0.2);
    score2 *= (1 + (factors.defensiveStrength - 0.5) * 0.2);
    
    const randomFactor = 0.95 + Math.random() * 0.1;
    score1 *= randomFactor;
    score2 *= (2 - randomFactor);
    
    return {
      team1: Math.round(Math.min(140, Math.max(80, score1))),
      team2: Math.round(Math.min(140, Math.max(80, score2)))
    };
  }

  private calculateConfidence(totalGames: number, headToHeadGames: number, recentGames: number) {
    let confidence = 0.5;
    confidence += Math.min(0.2, totalGames / 2000);
    confidence += Math.min(0.15, headToHeadGames / 30);
    confidence += Math.min(0.15, recentGames / 20);
    return confidence;
  }

  private async savePrediction(
    team1Id: number, team2Id: number,
    result: PredictionResult,
    userId: number
  ) {
    return prisma.prediction.create({
      data: {
        team1Id,
        team2Id,
        probabilityTeam1: result.probabilityTeam1,
        probabilityTeam2: result.probabilityTeam2,
        expectedScoreTeam1: result.expectedScoreTeam1,
        expectedScoreTeam2: result.expectedScoreTeam2,
        confidence: result.confidence,
        modelVersion: result.modelVersion,
        userId
      }
    });
  }
}