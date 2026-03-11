import type { Prisma } from '@prisma/client';
import { prisma } from '../index';

const MODEL_VERSION = 'v4.2-hybrid-signal-logit';
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const CORE_KEYS = ['seasonStrength', 'recentForm', 'headToHead', 'offensiveMatchup', 'defensiveMatchup'] as const;

type CoreKey = (typeof CORE_KEYS)[number];

const TEAM_INCLUDE = {
  players: {
    where: { isActive: true },
    select: {
      pointsPerGame: true,
      reboundsPerGame: true,
      assistsPerGame: true,
      stealsPerGame: true,
      blocksPerGame: true,
      minutesPerGame: true,
      fgPercentage: true,
      threePercentage: true,
      ftPercentage: true,
    },
  },
  teamStats: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { winPct: true, pointsPerGame: true },
  },
} satisfies Prisma.TeamInclude;

const HISTORICAL_SELECT = {
  team1Id: true,
  team2Id: true,
  matchDate: true,
  team1WinRate: true,
  team1AvgScore: true,
  team1AvgConceded: true,
  team2WinRate: true,
  team2AvgScore: true,
  team2AvgConceded: true,
  team1Form: true,
  team2Form: true,
  headToHeadWins1: true,
  headToHeadWins2: true,
  actualWinnerId: true,
  actualScore1: true,
  actualScore2: true,
  pointDifference: true,
} satisfies Prisma.HistoricalDataSelect;

type TeamContext = Prisma.TeamGetPayload<{ include: typeof TEAM_INCLUDE }>;
type HistoricalRow = Prisma.HistoricalDataGetPayload<{ select: typeof HISTORICAL_SELECT }>;
type CoreVector = Record<CoreKey, number>;

interface ScalingEntry {
  mean: number;
  std: number;
}

interface TrainedModel {
  intercept: number;
  weights: CoreVector;
  scaling: Record<CoreKey, ScalingEntry>;
  trainingRows: number;
  evaluationAccuracy: number | null;
}

interface PredictStatsSnapshot {
  totalPredictions: number;
  totalTrainingData: number;
  accuracy: number | null;
  modelVersion: string;
  featureWeights: Array<{ name: string; value: number }>;
}

export interface PredictionResult {
  probabilityTeam1: number;
  probabilityTeam2: number;
  expectedScoreTeam1: number;
  expectedScoreTeam2: number;
  confidence: number;
  factors: {
    seasonStrength: number;
    recentForm: number;
    headToHead: number;
    offensiveMatchup: number;
    defensiveMatchup: number;
    rosterQuality: number;
    momentum: number;
    homeAdvantage: number;
  };
  modelVersion: string;
  trainingDataPoints: number;
}

export class AIService {
  private modelCache: { rowCount: number; expiresAt: number; model: TrainedModel } | null = null;

  async getUserPredictions(userId: number) {
    return prisma.prediction.findMany({
      where: { userId },
      include: { team1: true, team2: true, match: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPredictionById(id: string) {
    return prisma.prediction.findUnique({
      where: { id },
      include: {
        team1: true,
        team2: true,
        match: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getTotalPredictions() {
    return prisma.prediction.count();
  }

  async getTotalTrainingData() {
    return prisma.historicalData.count();
  }

  getModelVersion() {
    return MODEL_VERSION;
  }

  async evaluateModel() {
    const model = await this.getTrainedModel();
    return model.evaluationAccuracy;
  }

  async getModelStatsSnapshot(): Promise<PredictStatsSnapshot> {
    const [totalPredictions, totalTrainingData, model] = await Promise.all([
      this.getTotalPredictions(),
      this.getTotalTrainingData(),
      this.getTrainedModel(),
    ]);

    return {
      totalPredictions,
      totalTrainingData,
      accuracy: model.evaluationAccuracy === null ? null : Number((model.evaluationAccuracy * 100).toFixed(2)),
      modelVersion: MODEL_VERSION,
      featureWeights: this.getDisplayWeights(model),
    };
  }

  async predictMatch(team1Id: number, team2Id: number, userId: number): Promise<PredictionResult & { id: string }> {
    const [team1, team2, team1History, team2History, headToHead, team1Recent, team2Recent, trainingDataPoints, model] =
      await Promise.all([
        prisma.team.findUnique({ where: { id: team1Id }, include: TEAM_INCLUDE }),
        prisma.team.findUnique({ where: { id: team2Id }, include: TEAM_INCLUDE }),
        this.getTeamHistory(team1Id, 100),
        this.getTeamHistory(team2Id, 100),
        this.getHeadToHead(team1Id, team2Id, 20),
        this.getRecentMatches(team1Id, 10),
        this.getRecentMatches(team2Id, 10),
        this.getTotalTrainingData(),
        this.getTrainedModel(),
      ]);

    if (!team1 || !team2) {
      throw new Error('One of the teams was not found');
    }

    const live = this.buildLiveState(team1, team2, team1History, team2History, headToHead, team1Recent, team2Recent);
    const coreProbability = this.predictCoreProbability(model, live.core);
    const hybridLogit = this.logit(coreProbability) + live.rosterEdge * 0.72 + live.momentumEdge * 0.58 + (live.factors.homeAdvantage - 0.5) * 1.15;
    const probabilityTeam1 = this.clamp(this.sigmoid(hybridLogit), 0.05, 0.95);
    const probabilityTeam2 = 1 - probabilityTeam1;
    const expectedScore = this.predictScore(probabilityTeam1, live);
    const confidence = this.calculateConfidence(probabilityTeam1, live.factors, team1History.length, team2History.length, headToHead.length, team1Recent.length + team2Recent.length, model.evaluationAccuracy);

    const result: PredictionResult = {
      probabilityTeam1: Number((probabilityTeam1 * 100).toFixed(1)),
      probabilityTeam2: Number((probabilityTeam2 * 100).toFixed(1)),
      expectedScoreTeam1: expectedScore.team1,
      expectedScoreTeam2: expectedScore.team2,
      confidence: Number(confidence.toFixed(2)),
      factors: live.factors,
      modelVersion: MODEL_VERSION,
      trainingDataPoints,
    };

    const savedPrediction = await this.savePrediction(team1Id, team2Id, result, userId);
    return { ...result, id: savedPrediction.id };
  }

  async trainOnActualResult(matchId: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match || match.status !== 'finished' || match.homeScore === null || match.awayScore === null) {
      throw new Error('Match is not finished yet');
    }

    const [homeRecent, awayRecent, previousHeadToHead] = await Promise.all([
      this.getRecentMatchesBeforeDate(match.homeTeamId, match.date, 5),
      this.getRecentMatchesBeforeDate(match.awayTeamId, match.date, 5),
      this.getHeadToHeadBeforeDate(match.homeTeamId, match.awayTeamId, match.date, 10),
    ]);

    await prisma.historicalData.create({
      data: {
        team1Id: match.homeTeamId,
        team2Id: match.awayTeamId,
        matchDate: match.date,
        season: new Date(match.date).getFullYear().toString(),
        team1WinRate: this.safeRatio(match.homeTeam.wins, match.homeTeam.wins + match.homeTeam.losses),
        team1AvgScore: match.homeTeam.pointsPerGame,
        team1AvgConceded: match.homeTeam.pointsAgainst,
        team1Form: this.makeFormString(homeRecent, match.homeTeamId),
        team2WinRate: this.safeRatio(match.awayTeam.wins, match.awayTeam.wins + match.awayTeam.losses),
        team2AvgScore: match.awayTeam.pointsPerGame,
        team2AvgConceded: match.awayTeam.pointsAgainst,
        team2Form: this.makeFormString(awayRecent, match.awayTeamId),
        headToHeadWins1: previousHeadToHead.filter((entry) => entry.actualWinnerId === match.homeTeamId).length,
        headToHeadWins2: previousHeadToHead.filter((entry) => entry.actualWinnerId === match.awayTeamId).length,
        actualWinnerId: match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId,
        actualScore1: match.homeScore,
        actualScore2: match.awayScore,
        pointDifference: Math.abs(match.homeScore - match.awayScore),
        usedForTraining: false,
      },
    });

    this.modelCache = null;
  }

  private async getTeamHistory(teamId: number, limit: number) {
    return prisma.historicalData.findMany({
      where: { OR: [{ team1Id: teamId }, { team2Id: teamId }] },
      select: HISTORICAL_SELECT,
      orderBy: { matchDate: 'desc' },
      take: limit,
    });
  }

  private async getRecentMatches(teamId: number, limit: number) {
    return this.getTeamHistory(teamId, limit);
  }

  private async getRecentMatchesBeforeDate(teamId: number, beforeDate: Date, limit: number) {
    return prisma.historicalData.findMany({
      where: { matchDate: { lt: beforeDate }, OR: [{ team1Id: teamId }, { team2Id: teamId }] },
      select: HISTORICAL_SELECT,
      orderBy: { matchDate: 'desc' },
      take: limit,
    });
  }

  private async getHeadToHead(team1Id: number, team2Id: number, limit: number) {
    return prisma.historicalData.findMany({
      where: { OR: [{ AND: [{ team1Id }, { team2Id }] }, { AND: [{ team1Id: team2Id }, { team2Id: team1Id }] }] },
      select: HISTORICAL_SELECT,
      orderBy: { matchDate: 'desc' },
      take: limit,
    });
  }

  private async getHeadToHeadBeforeDate(team1Id: number, team2Id: number, beforeDate: Date, limit: number) {
    return prisma.historicalData.findMany({
      where: {
        matchDate: { lt: beforeDate },
        OR: [{ AND: [{ team1Id }, { team2Id }] }, { AND: [{ team1Id: team2Id }, { team2Id: team1Id }] }],
      },
      select: HISTORICAL_SELECT,
      orderBy: { matchDate: 'desc' },
      take: limit,
    });
  }

  private async getHistoricalRows() {
    return prisma.historicalData.findMany({ select: HISTORICAL_SELECT, orderBy: { matchDate: 'asc' } });
  }

  private async getTrainedModel(): Promise<TrainedModel> {
    const rowCount = await this.getTotalTrainingData();

    if (this.modelCache && this.modelCache.rowCount === rowCount && Date.now() < this.modelCache.expiresAt) {
      return this.modelCache.model;
    }

    const rows = await this.getHistoricalRows();
    const model = this.trainAndEvaluate(rows);
    this.modelCache = { rowCount, expiresAt: Date.now() + MODEL_CACHE_TTL_MS, model };
    return model;
  }

  private trainAndEvaluate(rows: HistoricalRow[]) {
    if (rows.length < 18) {
      return this.createFallbackModel(rows.length);
    }

    const splitIndex = Math.max(12, Math.floor(rows.length * 0.8));
    const evaluationModel = this.fitModel(rows.slice(0, splitIndex));
    const evaluationAccuracy = rows.length > splitIndex ? this.measureAccuracy(evaluationModel, rows.slice(splitIndex)) : null;
    const finalModel = this.fitModel(rows);

    return { ...finalModel, trainingRows: rows.length, evaluationAccuracy };
  }

  private createFallbackModel(trainingRows: number): TrainedModel {
    const weights = this.emptyVector();
    weights.seasonStrength = 0.82;
    weights.recentForm = 0.74;
    weights.headToHead = 0.38;
    weights.offensiveMatchup = 0.58;
    weights.defensiveMatchup = 0.46;

    return {
      intercept: 0,
      weights,
      scaling: this.createScalingMap(),
      trainingRows,
      evaluationAccuracy: null,
    };
  }

  private fitModel(rows: HistoricalRow[]) {
    if (!rows.length) {
      return this.createFallbackModel(0);
    }

    const featureRows = rows.map((row) => this.extractHistoricalVector(row));
    const scaling = this.computeScaling(featureRows);
    const normalizedRows = featureRows.map((row) => this.normalizeVector(row, scaling));
    const labels = rows.map((row) => (row.actualWinnerId === row.team1Id ? 1 : 0));
    const weights = this.emptyVector();
    let intercept = 0;
    let learningRate = 0.08;

    for (let epoch = 0; epoch < 700; epoch += 1) {
      const gradient = this.emptyVector();
      let interceptGradient = 0;

      normalizedRows.forEach((row, index) => {
        const prediction = this.sigmoid(intercept + this.dot(weights, row));
        const error = prediction - labels[index];
        interceptGradient += error;
        CORE_KEYS.forEach((key) => {
          gradient[key] += error * row[key];
        });
      });

      intercept -= (learningRate * interceptGradient) / normalizedRows.length;
      CORE_KEYS.forEach((key) => {
        weights[key] -= learningRate * ((gradient[key] / normalizedRows.length) + 0.0015 * weights[key]);
      });

      if (epoch > 0 && epoch % 180 === 0) {
        learningRate *= 0.72;
      }
    }

    return { intercept, weights, scaling, trainingRows: rows.length, evaluationAccuracy: null };
  }

  private measureAccuracy(model: TrainedModel, rows: HistoricalRow[]) {
    if (!rows.length) {
      return null;
    }

    const correct = rows.reduce((sum, row) => {
      const probabilityTeam1 = this.predictCoreProbability(model, this.extractHistoricalVector(row));
      const winner = probabilityTeam1 >= 0.5 ? row.team1Id : row.team2Id;
      return sum + (winner === row.actualWinnerId ? 1 : 0);
    }, 0);

    return correct / rows.length;
  }

  private extractHistoricalVector(row: HistoricalRow): CoreVector {
    return {
      seasonStrength: (row.team1WinRate - row.team2WinRate) + (((row.team1AvgScore - row.team1AvgConceded) - (row.team2AvgScore - row.team2AvgConceded)) / 24),
      recentForm: this.formScore(row.team1Form) - this.formScore(row.team2Form),
      headToHead: this.headToHeadEdge(row.headToHeadWins1, row.headToHeadWins2),
      offensiveMatchup: ((row.team1AvgScore - row.team2AvgConceded) - (row.team2AvgScore - row.team1AvgConceded)) / 18,
      defensiveMatchup: (row.team2AvgConceded - row.team1AvgConceded) / 14,
    };
  }

  private buildLiveState(team1: TeamContext, team2: TeamContext, team1History: HistoricalRow[], team2History: HistoricalRow[], headToHead: HistoricalRow[], team1Recent: HistoricalRow[], team2Recent: HistoricalRow[]) {
    const team1Offense = this.estimateOffense(team1, team1Recent);
    const team2Offense = this.estimateOffense(team2, team2Recent);
    const team1Defense = this.estimateDefense(team1, team1Recent);
    const team2Defense = this.estimateDefense(team2, team2Recent);
    const team1Net = team1Offense - team1Defense;
    const team2Net = team2Offense - team2Defense;
    const recentFormEdge = this.weightedFormEdge(team1Recent, team1.id) - this.weightedFormEdge(team2Recent, team2.id);
    const rosterEdge = this.rosterEdge(team1.players, team2.players);
    const momentumEdge = this.momentumEdge(team1Recent, team1.id) - this.momentumEdge(team2Recent, team2.id);
    const core: CoreVector = {
      seasonStrength: (this.blendWinRate(team1, team1History) - this.blendWinRate(team2, team2History)) + (team1Net - team2Net) / 22,
      recentForm: recentFormEdge,
      headToHead: this.weightedHeadToHead(headToHead, team1.id),
      offensiveMatchup: ((team1Offense - team2Defense) - (team2Offense - team1Defense)) / 18,
      defensiveMatchup: (team2Defense - team1Defense) / 14,
    };

    return {
      core,
      rosterEdge,
      momentumEdge,
      team1Base: ((team1Offense + team2Defense) / 2) + 2.4,
      team2Base: (team2Offense + team1Defense) / 2,
      pace: (this.averageTotal(team1Recent, team1Offense, team1Defense) + this.averageTotal(team2Recent, team2Offense, team2Defense)) / 2,
      factors: {
        seasonStrength: this.edgeFactor(core.seasonStrength, 0.9),
        recentForm: this.edgeFactor(core.recentForm, 0.85),
        headToHead: this.edgeFactor(core.headToHead, 0.7),
        offensiveMatchup: this.edgeFactor(core.offensiveMatchup, 0.8),
        defensiveMatchup: this.edgeFactor(core.defensiveMatchup, 0.75),
        rosterQuality: this.edgeFactor(rosterEdge, 0.8),
        momentum: this.edgeFactor(momentumEdge, 0.8),
        homeAdvantage: 0.56,
      },
    };
  }

  private predictCoreProbability(model: TrainedModel, vector: CoreVector) {
    return this.sigmoid(model.intercept + this.dot(model.weights, this.normalizeVector(vector, model.scaling)));
  }

  private estimateOffense(team: TeamContext, recent: HistoricalRow[]) {
    const season = team.pointsPerGame || team.pointsFor || team.teamStats[0]?.pointsPerGame || 108;
    const recentAverage = recent.length ? recent.reduce((sum, match) => sum + this.teamScore(match, team.id), 0) / recent.length : season;
    return season * 0.58 + recentAverage * 0.28 + this.rosterShotmaking(team.players) * 0.14;
  }

  private estimateDefense(team: TeamContext, recent: HistoricalRow[]) {
    const season = team.pointsAgainst || 108;
    const recentAverage = recent.length ? recent.reduce((sum, match) => sum + this.opponentScore(match, team.id), 0) / recent.length : season;
    return season * 0.6 + recentAverage * 0.28 - this.rosterDefense(team.players) * 0.12;
  }

  private blendWinRate(team: TeamContext, history: HistoricalRow[]) {
    const seasonGames = team.wins + team.losses;
    const seasonRate = seasonGames > 0 ? team.wins / seasonGames : 0.5;
    const historyRate = history.length ? history.filter((row) => row.actualWinnerId === team.id).length / history.length : seasonRate;
    return seasonRate * 0.45 + historyRate * 0.35 + (team.teamStats[0]?.winPct ?? seasonRate) * 0.2;
  }

  private weightedHeadToHead(headToHead: HistoricalRow[], team1Id: number) {
    if (!headToHead.length) {
      return 0;
    }

    const totalWeight = headToHead.reduce((sum, _row, index) => sum + Math.max(0.24, 1 - index * 0.1), 0);
    const weightedWins = headToHead.reduce((sum, row, index) => sum + (row.actualWinnerId === team1Id ? 1 : -1) * Math.max(0.24, 1 - index * 0.1), 0);
    return totalWeight > 0 ? weightedWins / totalWeight : 0;
  }

  private weightedFormEdge(matches: HistoricalRow[], teamId: number) {
    if (!matches.length) {
      return 0;
    }

    let totalWeight = 0;
    let score = 0;
    matches.forEach((match, index) => {
      const weight = Math.max(0.2, 1 - index * 0.08);
      const margin = this.teamMargin(match, teamId);
      totalWeight += weight;
      score += weight * (((margin > 0 ? 1 : -1) * 0.62) + this.clamp(margin / 18, -1, 1) * 0.38);
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private momentumEdge(matches: HistoricalRow[], teamId: number) {
    if (!matches.length) {
      return 0;
    }

    const weightedMargin = matches.reduce((sum, match, index) => sum + this.teamMargin(match, teamId) * Math.max(0.25, 1 - index * 0.11), 0);
    const totalWeight = matches.reduce((sum, _match, index) => sum + Math.max(0.25, 1 - index * 0.11), 0);
    return totalWeight > 0 ? this.clamp((weightedMargin / totalWeight) / 14, -1, 1) : 0;
  }

  private rosterEdge(team1Players: TeamContext['players'], team2Players: TeamContext['players']) {
    return this.clamp((this.rosterImpact(team1Players) - this.rosterImpact(team2Players)) / 24, -1, 1);
  }

  private rosterImpact(players: TeamContext['players']) {
    return players
      .slice()
      .sort((left, right) => (right.minutesPerGame || 0) - (left.minutesPerGame || 0))
      .slice(0, 8)
      .reduce((sum, player) => {
        const minuteWeight = this.clamp((player.minutesPerGame || 18) / 34, 0.35, 1.05);
        const usage = (player.pointsPerGame || 0) + (player.assistsPerGame || 0) * 0.75 + (player.reboundsPerGame || 0) * 0.35;
        const defense = (player.stealsPerGame || 0) * 1.1 + (player.blocksPerGame || 0) * 1.05;
        const shooting = Math.max(0, (player.fgPercentage || 0) - 45) * 0.09 + Math.max(0, (player.threePercentage || 0) - 34) * 0.07 + Math.max(0, (player.ftPercentage || 0) - 74) * 0.03;
        return sum + (usage + defense + shooting) * minuteWeight;
      }, 0);
  }

  private rosterShotmaking(players: TeamContext['players']) {
    if (!players.length) {
      return 108;
    }

    const totalMinutes = players.reduce((sum, player) => sum + (player.minutesPerGame || 0), 0) || 1;
    const weightedShooting = players.reduce((sum, player) => sum + (((player.pointsPerGame || 0) * 0.58) + Math.max(0, (player.fgPercentage || 0) - 43) * 0.12 + Math.max(0, (player.threePercentage || 0) - 33) * 0.16) * (player.minutesPerGame || 0), 0) / totalMinutes;
    return 96 + weightedShooting * 0.5 + this.rosterImpact(players) * 0.08;
  }

  private rosterDefense(players: TeamContext['players']) {
    if (!players.length) {
      return 0;
    }

    const totalMinutes = players.reduce((sum, player) => sum + (player.minutesPerGame || 0), 0) || 1;
    return players.reduce((sum, player) => sum + (((player.reboundsPerGame || 0) * 0.18) + ((player.stealsPerGame || 0) * 1.15) + ((player.blocksPerGame || 0) * 1.05)) * (player.minutesPerGame || 0), 0) / totalMinutes;
  }

  private predictScore(probabilityTeam1: number, live: ReturnType<AIService['buildLiveState']>) {
    const paceAdjustment = (live.pace - 220) * 0.08;
    const marginAdjustment = (probabilityTeam1 - 0.5) * 13.5;
    return {
      team1: Math.round(this.clamp(live.team1Base + paceAdjustment + marginAdjustment + live.rosterEdge * 1.8 + live.momentumEdge * 2.1, 84, 141)),
      team2: Math.round(this.clamp(live.team2Base + paceAdjustment - marginAdjustment - live.rosterEdge * 1.2 - live.momentumEdge * 1.8, 82, 138)),
    };
  }

  private calculateConfidence(probabilityTeam1: number, factors: PredictionResult['factors'], team1HistoryCount: number, team2HistoryCount: number, headToHeadCount: number, recentCount: number, evaluationAccuracy: number | null) {
    const values = Object.values(factors);
    const agreement = 1 - values.reduce((sum, value) => sum + Math.abs(value - probabilityTeam1), 0) / values.length;
    const historyCoverage = this.clamp((team1HistoryCount + team2HistoryCount) / 120, 0, 1);
    const recentCoverage = this.clamp(recentCount / 20, 0, 1);
    const rivalryCoverage = this.clamp(headToHeadCount / 8, 0, 1);
    const decisiveness = Math.abs(probabilityTeam1 - 0.5) * 2;
    return this.clamp(0.44 + historyCoverage * 0.16 + recentCoverage * 0.12 + rivalryCoverage * 0.06 + agreement * 0.16 + decisiveness * 0.14 + (evaluationAccuracy ?? 0.58) * 0.18, 0.5, 0.97);
  }

  private async savePrediction(team1Id: number, team2Id: number, result: PredictionResult, userId: number) {
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
        userId,
      },
    });
  }

  private emptyVector(): CoreVector {
    return { seasonStrength: 0, recentForm: 0, headToHead: 0, offensiveMatchup: 0, defensiveMatchup: 0 };
  }

  private createScalingMap() {
    return { seasonStrength: { mean: 0, std: 1 }, recentForm: { mean: 0, std: 1 }, headToHead: { mean: 0, std: 1 }, offensiveMatchup: { mean: 0, std: 1 }, defensiveMatchup: { mean: 0, std: 1 } };
  }

  private computeScaling(rows: CoreVector[]) {
    return CORE_KEYS.reduce<Record<CoreKey, ScalingEntry>>((acc, key) => {
      const mean = rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
      const variance = rows.reduce((sum, row) => sum + (row[key] - mean) ** 2, 0) / rows.length;
      acc[key] = { mean, std: Math.sqrt(variance) || 1 };
      return acc;
    }, this.createScalingMap());
  }

  private normalizeVector(vector: CoreVector, scaling: Record<CoreKey, ScalingEntry>): CoreVector {
    return CORE_KEYS.reduce<CoreVector>((acc, key) => {
      acc[key] = (vector[key] - scaling[key].mean) / scaling[key].std;
      return acc;
    }, this.emptyVector());
  }

  private dot(left: CoreVector, right: CoreVector) {
    return CORE_KEYS.reduce((sum, key) => sum + left[key] * right[key], 0);
  }

  private formScore(form?: string | null) {
    if (!form) {
      return 0;
    }

    const entries = form.split('').slice(0, 5).map((symbol, index) => ({ weight: Math.max(0.22, 1 - index * 0.12), result: symbol === 'W' ? 1 : -1 }));
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    return totalWeight > 0 ? entries.reduce((sum, entry) => sum + entry.weight * entry.result, 0) / totalWeight : 0;
  }

  private headToHeadEdge(wins1?: number | null, wins2?: number | null) {
    const left = wins1 || 0;
    const right = wins2 || 0;
    const total = left + right;
    return total > 0 ? (left - right) / total : 0;
  }

  private averageTotal(matches: HistoricalRow[], offense: number, defense: number) {
    return matches.length ? matches.reduce((sum, row) => sum + (row.actualScore1 || 0) + (row.actualScore2 || 0), 0) / matches.length : offense + defense;
  }

  private teamScore(match: HistoricalRow, teamId: number) {
    return match.team1Id === teamId ? match.actualScore1 || 0 : match.actualScore2 || 0;
  }

  private opponentScore(match: HistoricalRow, teamId: number) {
    return match.team1Id === teamId ? match.actualScore2 || 0 : match.actualScore1 || 0;
  }

  private teamMargin(match: HistoricalRow, teamId: number) {
    return this.teamScore(match, teamId) - this.opponentScore(match, teamId);
  }

  private makeFormString(matches: HistoricalRow[], teamId: number) {
    return matches.length ? matches.slice(0, 5).map((row) => (this.teamMargin(row, teamId) >= 0 ? 'W' : 'L')).join('') : null;
  }

  private edgeFactor(edge: number, scale: number) {
    return this.clamp(0.5 + edge / (scale * 2), 0.08, 0.92);
  }

  private getDisplayWeights(model: TrainedModel) {
    const entries = [
      { name: 'Season strength', value: Math.abs(model.weights.seasonStrength) },
      { name: 'Recent form', value: Math.abs(model.weights.recentForm) },
      { name: 'Head-to-head', value: Math.abs(model.weights.headToHead) },
      { name: 'Offensive matchup', value: Math.abs(model.weights.offensiveMatchup) },
      { name: 'Defensive matchup', value: Math.abs(model.weights.defensiveMatchup) },
      { name: 'Roster quality', value: 0.72 },
      { name: 'Momentum', value: 0.58 },
      { name: 'Home edge', value: 0.46 },
    ];
    const total = entries.reduce((sum, entry) => sum + entry.value, 0) || 1;
    return entries.map((entry) => ({ name: entry.name, value: Number(((entry.value / total) * 100).toFixed(1)) }));
  }

  private sigmoid(value: number) {
    const safe = this.clamp(value, -12, 12);
    return 1 / (1 + Math.exp(-safe));
  }

  private logit(probability: number) {
    const safe = this.clamp(probability, 0.001, 0.999);
    return Math.log(safe / (1 - safe));
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private safeRatio(value: number, total: number) {
    return total > 0 ? value / total : 0.5;
  }
}
