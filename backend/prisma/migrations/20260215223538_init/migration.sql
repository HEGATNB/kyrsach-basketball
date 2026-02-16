-- CreateTable
CREATE TABLE "Conference" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "conferenceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "nickname" TEXT,
    "city" TEXT,
    "arena" TEXT,
    "foundedYear" INTEGER,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "conferenceId" INTEGER NOT NULL,
    "divisionId" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seasonWins" INTEGER NOT NULL DEFAULT 0,
    "seasonLosses" INTEGER NOT NULL DEFAULT 0,
    "pointsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "country" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "position" TEXT NOT NULL,
    "jerseyNumber" INTEGER,
    "teamId" INTEGER NOT NULL,
    "pointsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reboundsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assistsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stealsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocksPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minutesPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fgPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "threePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ftPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "homeTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayTeamId" INTEGER NOT NULL,
    "awayScore" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStats" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "homeQ1" INTEGER,
    "homeQ2" INTEGER,
    "homeQ3" INTEGER,
    "homeQ4" INTEGER,
    "homeOT" INTEGER,
    "awayQ1" INTEGER,
    "awayQ2" INTEGER,
    "awayQ3" INTEGER,
    "awayQ4" INTEGER,
    "awayOT" INTEGER,
    "homeFieldGoals" INTEGER,
    "homeFieldAttempts" INTEGER,
    "homeThreePoints" INTEGER,
    "homeThreeAttempts" INTEGER,
    "homeFreeThrows" INTEGER,
    "homeFreeAttempts" INTEGER,
    "homeRebounds" INTEGER,
    "homeAssists" INTEGER,
    "homeSteals" INTEGER,
    "homeBlocks" INTEGER,
    "homeTurnovers" INTEGER,
    "homeFouls" INTEGER,
    "awayFieldGoals" INTEGER,
    "awayFieldAttempts" INTEGER,
    "awayThreePoints" INTEGER,
    "awayThreeAttempts" INTEGER,
    "awayFreeThrows" INTEGER,
    "awayFreeAttempts" INTEGER,
    "awayRebounds" INTEGER,
    "awayAssists" INTEGER,
    "awaySteals" INTEGER,
    "awayBlocks" INTEGER,
    "awayTurnovers" INTEGER,
    "awayFouls" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "minutes" INTEGER,
    "points" INTEGER,
    "rebounds" INTEGER,
    "assists" INTEGER,
    "steals" INTEGER,
    "blocks" INTEGER,
    "turnovers" INTEGER,
    "fouls" INTEGER,
    "fieldGoals" INTEGER,
    "fieldAttempts" INTEGER,
    "threePoints" INTEGER,
    "threeAttempts" INTEGER,
    "freeThrows" INTEGER,
    "freeAttempts" INTEGER,
    "plusMinus" INTEGER,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStats" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "winPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reboundsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assistsPerGame" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "matchId" INTEGER,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "probabilityTeam1" DOUBLE PRECISION NOT NULL,
    "probabilityTeam2" DOUBLE PRECISION NOT NULL,
    "expectedScoreTeam1" INTEGER NOT NULL,
    "expectedScoreTeam2" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "userId" INTEGER NOT NULL,
    "wasCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITrainingData" (
    "id" TEXT NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "team1WinRate" DOUBLE PRECISION NOT NULL,
    "team1AvgScore" DOUBLE PRECISION NOT NULL,
    "team2WinRate" DOUBLE PRECISION NOT NULL,
    "team2AvgScore" DOUBLE PRECISION NOT NULL,
    "homeTeamId" INTEGER,
    "actualWinnerId" INTEGER,
    "actualScore1" INTEGER,
    "actualScore2" INTEGER,
    "matchId" INTEGER,
    "usedForTraining" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITrainingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalData" (
    "id" TEXT NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "season" TEXT NOT NULL,
    "team1WinRate" DOUBLE PRECISION NOT NULL,
    "team1AvgScore" DOUBLE PRECISION NOT NULL,
    "team1AvgConceded" DOUBLE PRECISION NOT NULL,
    "team2WinRate" DOUBLE PRECISION NOT NULL,
    "team2AvgScore" DOUBLE PRECISION NOT NULL,
    "team2AvgConceded" DOUBLE PRECISION NOT NULL,
    "team1Form" TEXT,
    "team2Form" TEXT,
    "headToHeadWins1" INTEGER,
    "headToHeadWins2" INTEGER,
    "actualWinnerId" INTEGER,
    "actualScore1" INTEGER,
    "actualScore2" INTEGER,
    "pointDifference" INTEGER,
    "usedForTraining" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Conference_name_key" ON "Conference"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_fullName_key" ON "Player"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Match_homeTeamId_awayTeamId_date_key" ON "Match"("homeTeamId", "awayTeamId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStats_teamId_season_key" ON "TeamStats"("teamId", "season");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStats" ADD CONSTRAINT "MatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStats" ADD CONSTRAINT "TeamStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITrainingData" ADD CONSTRAINT "AITrainingData_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITrainingData" ADD CONSTRAINT "AITrainingData_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITrainingData" ADD CONSTRAINT "AITrainingData_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalData" ADD CONSTRAINT "HistoricalData_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalData" ADD CONSTRAINT "HistoricalData_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
